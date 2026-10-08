import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse, compileScript } from 'vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import type { 演出事件 } from '../engine/showEvents';

// ================================================================
// 决斗场美术 · Task 5：演出层（ShowLayer）
//
// SSR 渲染守卫（与 renderViews 同一套做法）：注入演出事件数组，
// 断言飘字/轨迹/变身/裂纹/光环真的渲染出来、位置与延迟正确、DOM 有上限。
// ================================================================

const 视图目录 = path.resolve(import.meta.dirname, '../views');

async function 渲染(props: Record<string, any>): Promise<string> {
  const 源 = fs.readFileSync(path.join(视图目录, 'ShowLayer.vue'), 'utf8');
  const { descriptor, errors } = parse(源, { filename: 'ShowLayer.vue' });
  if (errors.length) throw new Error(`SFC 解析失败：${errors.map(e => e.message).join('; ')}`);
  const 临时 = path.join(视图目录, '__render_ShowLayer.ts');
  fs.writeFileSync(临时, compileScript(descriptor, { id: 'ShowLayer.vue', inlineTemplate: true }).content);
  try {
    const mod: any = await import(/* @vite-ignore */ 临时);
    return await renderToString(createSSRApp(mod.default, props));
  } finally {
    fs.rmSync(临时, { force: true });
  }
}

const 坐标 = { 契约者: 20, 骨卫兵: 80 };

describe('演出层 · 飘字与轨迹', () => {
  it('命中 → 守方位置冒伤害飘字（带延迟、带数值）', async () => {
    const html = await 渲染({
      事件: [{ 类: '命中', 攻方: '契约者', 守方: '骨卫兵', 伤害: 42 } as 演出事件],
      坐标,
    });

    expect(html).toContain('floater');
    expect(html).toContain('-42');
    expect(html).toMatch(/left:\s*80%/); // 落在守方的地砖上
  });

  it('未命中 → 灰字「未命中」，且轨迹画成 miss', async () => {
    const html = await 渲染({
      事件: [{ 类: '未命中', 攻方: '契约者', 守方: '骨卫兵' } as 演出事件],
      坐标,
    });

    expect(html).toContain('未命中');
    expect(html).toContain('miss');
  });

  it('攻击轨迹：攻方 → 守方的一条线（两端坐标都在才画）', async () => {
    const html = await 渲染({
      事件: [{ 类: '命中', 攻方: '契约者', 守方: '骨卫兵', 伤害: 10 } as 演出事件],
      坐标,
    });

    expect(html).toContain('traj');
    expect(html).toContain('x1="20"');
    expect(html).toContain('x2="80"');
  });

  it('事件按发生顺序错峰播放（animation-delay 递增）', async () => {
    const html = await 渲染({
      事件: [
        { 类: '命中', 攻方: '契约者', 守方: '骨卫兵', 伤害: 10 } as 演出事件,
        { 类: '命中', 攻方: '契约者', 守方: '骨卫兵', 伤害: 20 } as 演出事件,
        { 类: '命中', 攻方: '契约者', 守方: '骨卫兵', 伤害: 30 } as 演出事件,
      ],
      坐标,
    });

    const 延迟们 = [...html.matchAll(/animation-delay:\s*([\d.]+)s/g)].map(m => Number(m[1]));
    // 3 个事件 → 飘字和轨迹各自错峰（同一事件的飘字与轨迹共享同一延迟是设计）
    expect(延迟们.length).toBeGreaterThanOrEqual(3);
    expect(new Set(延迟们).size).toBe(3);
    expect(Math.max(...延迟们)).toBeGreaterThan(0);
  });
});

describe('演出层 · 特殊事件', () => {
  it('变身 → 全屏演出牌（形态名亮出）', async () => {
    const html = await 渲染({ 事件: [{ 类: '变身', 单位: '契约者', 形态: '二阶段·觉醒' } as 演出事件], 坐标 });

    expect(html).toContain('transform-show');
    expect(html).toContain('二阶段·觉醒');
  });

  it('打断成功 → 金色裂纹闪光', async () => {
    const html = await 渲染({ 事件: [{ 类: '打断成功', 单位: '骨卫兵' } as 演出事件], 坐标 });

    expect(html).toContain('crack');
    expect(html).toMatch(/left:\s*80%/);
  });

  it('濒死 → 「濒死！」提示 + 规则系 → 光环', async () => {
    const html = await 渲染({
      事件: [
        { 类: '濒死', 守方: '骨卫兵' } as 演出事件,
        { 类: '规则系', 单位: '契约者', 效果: '即死' } as 演出事件,
      ],
      坐标,
    });

    expect(html).toContain('濒死！');
    expect(html).toContain('halo');
  });

  it('环境火把永远在场（决斗场两侧）', async () => {
    const html = await 渲染({ 事件: [], 坐标 });

    expect((html.match(/env-torch/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('演出层 · DOM 上限（手机端防掉帧）', () => {
  it('30 个事件最多渲染 24 个演出元素（超出即弃，不排队）', async () => {
    const 事件: 演出事件[] = Array.from({ length: 30 }, (_, i) => ({
      类: '命中',
      攻方: '契约者',
      守方: '骨卫兵',
      伤害: i + 1,
    }));

    const html = await 渲染({ 事件, 坐标 });

    const 飘字数 = (html.match(/class="floater/g) ?? []).length;
    expect(飘字数).toBeLessThanOrEqual(24);
    expect(飘字数).toBeGreaterThan(0);
  });

  it('空事件 → 只有环境元素，不报错', async () => {
    const html = await 渲染({ 事件: [], 坐标: {} });

    expect(html).toContain('show-layer');
  });
});

describe('演出层 · 接线（源码守卫）', () => {
  const 读 = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', f), 'utf8');

  it('演出层挂在决斗场地面上（arena-floor 内），pointer-events:none 不挡操作', () => {
    const 战斗页 = 读('views/BattleView.vue');

    expect(战斗页).toContain('ShowLayer');
    expect(读('views/ShowLayer.vue')).toContain('pointer-events: none');
  });

  it('CombatView 把结算步骤提成演出事件喂给 BattleView', () => {
    const 驾驶舱 = 读('views/CombatView.vue');

    expect(驾驶舱).toContain('演出事件提取');
    expect(驾驶舱).toContain(':演出事件=');
  });

  it('BattleView → ShowLayer 的 props 接线（占位组件会吞掉写错的 prop 名，必须钉死）', () => {
    const 战斗页 = 读('views/BattleView.vue');

    expect(战斗页).toContain(':事件="演出事件');
    expect(战斗页).toContain(':坐标="演出坐标"');
  });
});

// ================================================================
// 最终评审 Critical #1：演出在首次 paint 前被清空
// 推进轮次 set → 开始回合 → 推进回合 第一行 clear，之间只有微任务 ——
// 演出 DOM 还没画出来就没了，「打一拳出飘字」在主路径上不可见。
// 修法：回合开始**不清**，给每批事件一个批次号强制换 DOM（旧批次动画 opacity:0 收尾，零成本）。
// ================================================================
describe('演出生命周期（评审 Critical #1）', () => {
  const 驾驶舱 = () => fs.readFileSync(path.resolve(import.meta.dirname, '../views/CombatView.vue'), 'utf8');

  it('推进回合**不再**清空演出事件（清空会赶在首次 paint 之前）', () => {
    const s = 驾驶舱();
    const 推进回合体 = /async function 推进回合\(\) \{[\s\S]*?\n\}/.exec(s)?.[0] ?? '';

    expect(推进回合体).not.toContain('演出事件列表.value = []');
  });

  it('每批事件带递增批次号（新批次整批重建节点，CSS 动画自然重播）', () => {
    const s = 驾驶舱();

    expect(s).toContain('演出批次');
    expect(s).toMatch(/演出批次\.value\+\+/);
    expect(s).toContain(':演出批次=');
  });

  it('战斗边界（开始战斗/逃离/回准备/收尾）才清演出（防新战开局看到上一场残批）', () => {
    const s = 驾驶舱();

    for (const 函数名 of ['开始战斗', '逃离战斗', '回准备', '收尾']) {
      const 体 = new RegExp(`(async )?function ${函数名}\\([\\s\\S]*?\\n\\}`).exec(s)?.[0] ?? '';
      expect(体, `${函数名} 必须清演出`).toContain('演出事件列表.value = []');
    }
  });

  it('ShowLayer 的 v-for key 带批次（旧批次节点被整批替换而不是复用）', () => {
    const s = fs.readFileSync(path.resolve(import.meta.dirname, '../views/ShowLayer.vue'), 'utf8');

    expect(s).toContain('批次');
    expect(s).toMatch(/:key="[^"]*批次/);
  });
});

// ================================================================
// 最终评审 Important #2：同名单位的演出坐标互相覆盖
// 一波两只「骨卫兵」时，按显示名建的坐标表只剩最远那只 ——
// 两只的飘字/轨迹都锚错。修法：演出相关步骤带**单位键**，坐标表按键建（显示名回退）。
// ================================================================
describe('演出坐标按键（评审 Important #2）', () => {
  it('「命中」事件带守方键（不只是显示名）', async () => {
    const { 开战规则结算, 结算行动 } = await import('../engine/loop');
    const { 演出事件提取 } = await import('../engine/showEvents');
    const 造解释 = (覆盖: any = {}): any => ({
      行动消耗: '主要行动',
      射程: '近战',
      目标: '单体',
      消耗: '无',
      冷却: 0,
      分类: '基础',
      类型: '主动',
      可预判: true,
      关联属性: 'STR',
      技能阶位: 1,
      伤害倍率: 1,
      规则: [],
      托管: [],
      ...覆盖,
    });
    const 造单位 = (覆盖: any): any => ({
      名称: '同名怪',
      类型: '杂兵',
      属性: { 实际: { STR: 20, AGI: 10, CON: 20, PER: 10 } },
      阶位: '一阶',
      HP_当前: 1000,
      HP_最大: 1000,
      MP_当前: 50,
      MP_最大: 50,
      耐力_当前: 100,
      耐力_最大: 100,
      防御: 0,
      闪避值: 0,
      距离: 0,
      行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
      额度: 30,
      冷却: {},
      护盾: 0,
      架势: null,
      状态: [],
      濒死: null,
      资源: {},
      词条: new Set(),
      技能: {},
      ...覆盖,
    });
    // 两只同名怪（不同的键）
    const 攻 = 造单位({ id: '契约者', 阵营: '我方', 名称: '玩家', 技能: { 斩击: 造解释() } });
    const 甲 = 造单位({ id: '副本角色.骨卫兵', 阵营: '敌方', 距离: 15 });
    const 乙 = 造单位({ id: '副本角色.骨卫兵2', 阵营: '敌方', 距离: 1 }); // 近战打得着的这只
    const 状态: any = {
      进行中: true,
      回合: 1,
      先攻: ['契约者', '副本角色.骨卫兵'],
      单位: { 契约者: 攻, 骨卫兵: 甲, 骨卫兵2: 乙 },
      待决: null,
      领域: [],
    };
    const r = 结算行动(开战规则结算(状态), 状态.单位.契约者, { 类型: '主要行动', 技能: '斩击', 目标: '骨卫兵2' }, { 命中: 18, 伤害骰: [6] });
    const 事件 = 演出事件提取(r.步骤);
    const 命中 = 事件.find((e: any) => e.类 === '命中');

    expect(命中).toBeDefined();
    expect((命中 as any).守方键).toBe('骨卫兵2'); // 是键，不是「同名怪」
  });

  it('BattleView 的坐标表按**键**建（显示名回退），同名单位各自有坐标', () => {
    const s = fs.readFileSync(path.resolve(import.meta.dirname, '../views/BattleView.vue'), 'utf8');

    // 坐标表按状态.单位 的键建（不只是显示名）
    expect(s).toMatch(/演出坐标[\s\S]*?Object\.entries/);
  });

  it('ShowLayer 查坐标：先键后名，最后兜底 50%', () => {
    const s = fs.readFileSync(path.resolve(import.meta.dirname, '../views/ShowLayer.vue'), 'utf8');

    expect(s).toContain('守方键');
    expect(s).toMatch(/坐标\?\.\[键\]/);
  });
});
