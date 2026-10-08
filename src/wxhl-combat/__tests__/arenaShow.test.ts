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
});
