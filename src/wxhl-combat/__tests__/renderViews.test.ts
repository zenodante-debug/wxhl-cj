import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, compileScript } from 'vue/compiler-sfc';
import { createPinia } from 'pinia';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import type { 战斗状态 } from '../types';

// ================================================================
// 防具：**views/*.vue 真的能渲染**
//
// 为什么必须有：`.vue` 模板里的属性访问**没有任何自动检查** —— 没有 vue-tsc；
// `vue/compiler-sfc` 只编译语法、不查属性；vitest 没装 vue 插件，连 `.vue` 都 import 不进来。
// 于是"模板读了一个不存在的属性"会在运行时抛错、把整个组件渲染成**一片空白**。
// 实战踩过：行动区条目写成了 `{键, 名称, 单位, 技能}`，而模板读 `u.行动槽.主要`
// → `Cannot read properties of undefined` → 点开战斗一片空白。
//
// 这里用 compiler-sfc 手动编译 + SSR 真渲一遍：属性读错会抛错，测试立刻变红。
// （把 viewModel 的条目形状改回旧的嵌套写法，本文件就会以完全相同的错误失败 —— 已验证。）
// ================================================================

const 视图目录 = path.resolve(import.meta.dirname, '../views');

/** 编译一个 SFC 并 SSR 渲染，返回 HTML */
async function 渲染(文件名: string, props: Record<string, any>): Promise<string> {
  const 源 = fs.readFileSync(path.join(视图目录, 文件名), 'utf8');
  const { descriptor, errors } = parse(源, { filename: 文件名 });
  if (errors.length) throw new Error(`SFC 解析失败：${errors.map(e => e.message).join('; ')}`);

  // 临时文件必须写在 views/ 里 —— 组件里的相对 import（../engine/...）才解析得到；
  // 裸标识符 ref/computed/watch 由 vitest 配置里的 unplugin-auto-import 注入（与构建一致）
  const 临时 = path.join(视图目录, `__render_${文件名.replace('.vue', '')}.ts`);
  fs.writeFileSync(临时, compileScript(descriptor, { id: 文件名, inlineTemplate: true }).content);
  try {
    const mod: any = await import(/* @vite-ignore */ 临时);
    const app = createSSRApp(mod.default, props);
    app.use(createPinia()); // SettingsView 等要 pinia
    return await renderToString(app);
  } finally {
    fs.rmSync(临时, { force: true });
  }
}

/** 一个我方单位 + 一个敌人 */
function 造单位(覆盖: Record<string, any>): any {
  return {
    类型: '玩家',
    属性: { 实际: { STR: 25, AGI: 20, CON: 20, PER: 15 } },
    阶位: '二阶',
    HP_当前: 171,
    HP_最大: 270,
    MP_当前: 30,
    MP_最大: 40,
    耐力_当前: 90,
    耐力_最大: 200,
    防御: 12,
    闪避值: 18,
    移动距离: 45,
    距离: 0,
    行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
    额度: 45,
    冷却: {},
    护盾: 0,
    架势: null,
    状态: [],
    濒死: null,
    资源: {},
    词条: new Set(),
    技能: {},
    ...覆盖,
  };
}

const 一条技能 = {
  行动消耗: '主要行动',
  射程: '视线内',
  目标: '单体',
  消耗: 'MP 5',
  冷却: 3,
  分类: '基础',
  类型: '主动',
  可预判: true,
  伤害倍率: 2,
  规则: [],
  托管: [],
};

function 造战斗状态(): 战斗状态 {
  return {
    进行中: true,
    回合: 2,
    先攻: ['契约者', '小队.成员.江薇芷', '副本角色.骨卫兵'],
    单位: {
      契约者: 造单位({ id: '契约者', 名称: '黑崎一护', 阵营: '我方', 技能: { 月牙天冲: 一条技能 } }),
      江薇芷: 造单位({
        id: '小队.成员.江薇芷',
        名称: '江薇芷',
        阵营: '我方',
        类型: '小队成员',
        HP_当前: 80,
        HP_最大: 80,
        距离: 3,
        技能: { 诛仙裂空: 一条技能 },
      }),
      骨卫兵: 造单位({
        id: '副本角色.骨卫兵',
        名称: '骨卫兵',
        阵营: '敌方',
        类型: '精英',
        HP_当前: 96,
        HP_最大: 96,
        距离: 10,
      }),
    } as any,
    待决: null,
    领域: [],
  };
}

describe('views/*.vue 能渲染（模板读错属性的唯一防线）', () => {
  it('BattleView：每个我方单位一块行动区 + 效果详情 + 目标可支援', async () => {
    const html = await 渲染('BattleView.vue', {
      状态: 造战斗状态(),
      日志: ['—— 第 1 回合 ——'],
      敌方意图: [{ 单位: '副本角色.骨卫兵', 行动: [{ 类型: '主要行动', 技能: '骨爪撕裂', 目标: '玩家' }] }],
      禁用: false,
      进度: '',
    });

    expect(html).toContain('黑崎一护'); // 玩家真名
    expect(html).toContain('江薇芷'); // 队友自己一块
    expect(html).toContain('效果详情');
    expect(html).toContain('支援'); // 目标下拉里的我方选项
    expect(html).toContain('防御 12');
    expect(html).toContain('执行本轮');
  });

  it('BattleView：空战场也不炸（开战前的初始态）', async () => {
    const html = await 渲染('BattleView.vue', {
      状态: { 进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [] },
      日志: [],
      敌方意图: [],
    });

    expect(html).toContain('第 0 回合');
  });

  it('SetupView：名单未加载时显示读取提示', async () => {
    const html = await 渲染('SetupView.vue', {});
    expect(html).toContain('读取实体名单中');
  });

  it('PendingModal：待决点为空时不渲染内容', async () => {
    const html = await 渲染('PendingModal.vue', { 待决: null });
    expect(html).not.toContain('打断');
  });

  // CombatView 不在这个文件里渲：它 import 了 SetupView.vue，而 vitest 没装 vue 插件、
  // 解析不了 `.vue` 的 import（本文件只能编译"不 import 别的 .vue"的组件）。
  // 它的准备态由 SetupView 那条覆盖，真正的逻辑在 CombatView 里的部分都已经抽成纯函数测过了。

  it('SettingsView：API 配置表单 + 翻译缓存区块', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({
      快路: { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 60000 },
      强路: { url: 'https://a.b', apiKey: 'k', model: 'm2', timeout: 60000 },
    });
    // 设置 store 的 watchEffect 会在创建时把设置写回脚本变量 → 需要一个 no-op
    (globalThis as any).replaceVariables = () => {};

    const html = await 渲染('SettingsView.vue', {});

    expect(html).toContain('快路');
    expect(html).toContain('测试连接');
    expect(html).toContain('翻译缓存');
  });
});
