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

/**
 * 这些用例要现场编译 SFC 再动态 import —— 并行跑全量、机器吃紧时 5 秒不够，
 * 会假红（排查过一次：报的是「Test timed out in 5000ms」，不是渲染坏了）。
 */
const 编译超时 = 30000;

/** 编译一个 SFC 并 SSR 渲染，返回 HTML */
async function 渲染(文件名: string, props: Record<string, any>): Promise<string> {
  const 源 = fs.readFileSync(path.join(视图目录, 文件名), 'utf8');
  const { descriptor, errors } = parse(源, { filename: 文件名 });
  if (errors.length) throw new Error(`SFC 解析失败：${errors.map(e => e.message).join('; ')}`);

  // 临时文件必须写在 views/ 里 —— 组件里的相对 import（../engine/...）才解析得到；
  // 裸标识符 ref/computed/watch 由 vitest 配置里的 unplugin-auto-import 注入（与构建一致）
  let 编译后 = compileScript(descriptor, { id: 文件名, inlineTemplate: true }).content;
  // `.vue` 的 import 解析不了（vitest 没装 vue 插件）—— 子组件一律换成占位空组件。
  // 子组件自己的渲染由各自的测试文件单独断言（如 arenaShow 直渲 ShowLayer）。
  编译后 = 编译后.replace(
    /import\s+(\w+)\s+from\s+'(\.[^']*\.vue)'/g,
    (_m, 名) => `const ${名} = { name: '${名}', render: () => null };`,
  );
  const 临时 = path.join(视图目录, `__render_${Math.random().toString(36).slice(2)}_${文件名.replace('.vue', '')}.ts`);
  fs.writeFileSync(临时, 编译后);
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
  it('BattleView：每个我方单位一块行动区 + 效果详情 + 目标可支援', { timeout: 编译超时 }, async () => {
    const html = await 渲染('BattleView.vue', {
      状态: 造战斗状态(),
      日志: ['—— 第 1 回合 ——'],
      敌方意图: [{ 单位: '副本角色.骨卫兵', 行动: [{ 类型: '主要行动', 技能: '骨爪撕裂', 目标: '玩家' }] }],
      禁用: false,
      进度: '',
    });

    expect(html).toContain('黑崎一护'); // 玩家真名
    expect(html).toContain('江薇芷'); // 队友自己一块
    expect(html).toContain('详情'); // 每个角色能展开看全套
    expect(html).toContain('支援'); // 目标下拉里的我方选项
    expect(html).toContain('防御 12');
    expect(html).toContain('执行本轮');
  });

  it('行动下拉**按行动类型过滤**：主要只列主要行动技能 + 基础攻击；次要列次要的（这里是空的）', { timeout: 编译超时 }, async () => {
    // 造战斗状态里：月牙天冲/诛仙裂空 都是「主要行动」，两个单位都没有副武器
    const html = await 渲染('BattleView.vue', { 状态: 造战斗状态(), 日志: [], 敌方意图: [] });

    const 主要段 = /主要<\/span><select>(.*?)<\/select>/s.exec(html)?.[1] ?? '';
    const 次要段 = /次要<\/span><select>(.*?)<\/select>/s.exec(html)?.[1] ?? '';

    // 主要：技能按行动类型匹配 + 保底的基础攻击（有主武器就是主武器攻击）
    expect(主要段).toContain('月牙天冲');
    expect(主要段).toContain('主武器攻击');
    // 次要：不出现主要行动技能（这就是"别把所有选项都适配所有类型"）；
    // 没有副武器也照样能打 —— 只是标签诚实地说「徒手攻击」
    expect(次要段).not.toContain('月牙天冲');
    expect(次要段).not.toContain('主武器攻击');
    expect(次要段).toContain('徒手攻击');
  });

  it('反应下拉里**没有预设的招架/识破**（没学过就只有"不预置"）', { timeout: 编译超时 }, async () => {
    const html = await 渲染('BattleView.vue', { 状态: 造战斗状态(), 日志: [], 敌方意图: [] });

    // 注释也会被渲进 HTML（模板里的历史说明），所以只取真正的 option 标签
    const 反应段 = (/(反应（预置）<\/span><select>)(.*?)<\/select>/s.exec(html)?.[2] ?? '').replace(
      /<!--[\s\S]*?-->/g,
      '',
    );
    const 选项 = [...反应段.matchAll(/<option[^>]*>(.*?)<\/option>/g)].map(m => m[1]);

    expect(选项).toEqual(['不预置']); // 没学过反应技能 → 只剩这一条
  });

  it('详情面板的「效果详情」只在展开时渲染（默认折叠，SSR 里看不到）', async () => {
    const 源码 = fs.readFileSync(path.join(视图目录, 'BattleView.vue'), 'utf8');

    expect(源码).toContain('效果详情');
    expect(源码).toContain('d.预览.行'); // 渲染的是预览的人话行
  });

  it('决斗场皮肤：横幅是先攻火把链，地面是地砖轴，军牌是铭牌', { timeout: 编译超时 }, async () => {
    const html = await 渲染('BattleView.vue', { 状态: 造战斗状态(), 日志: [], 敌方意图: [] });

    expect(html).toContain('initiative-chain'); // 先攻火把链（当前行动者点亮）
    expect(html).toContain('torch');
    expect(html).toContain('arena-floor'); // 决斗场地面（地砖延伸线）
    expect(html).toContain('war-plate'); // 军牌 = 石质铭牌
    expect(html).toContain('gauge'); // HP/MP/耐力 液面条
  });

  it('军牌的 HP 是血色液面（gauge-hp + fill），不是一行灰字', { timeout: 编译超时 }, async () => {
    const html = await 渲染('BattleView.vue', { 状态: 造战斗状态(), 日志: [], 敌方意图: [] });

    expect(html).toMatch(/gauge-hp[^>]*>\s*<div class="fill"/);
    expect(html).toContain('gauge-mp');
  });

  it('战斗页样式走决斗场 token（var(--cb-*)），不是灰工程色', () => {
    const 源码 = fs.readFileSync(path.join(视图目录, 'BattleView.vue'), 'utf8');

    expect(源码).toContain('var(--cb-');
    expect(源码).not.toContain('color: #ddd');
  });

  it('BattleView：追加行动回合模式 → 按钮变成「提交追加行动」并说明这是额外一轮', { timeout: 编译超时 }, async () => {
    const html = await 渲染('BattleView.vue', {
      状态: 造战斗状态(),
      日志: [],
      敌方意图: [],
      追加模式: true,
    });

    expect(html).toContain('提交追加行动');
    expect(html).toContain('额外行动回合');
    // 按钮上不再是「执行本轮」（注释里提到它是允许的，这里只看 button 标签内容）
    expect(html).not.toMatch(/<button[^>]*>执行本轮<\/button>/);
    expect(html).toMatch(/<button[^>]*>提交追加行动<\/button>/);
  });


  it('BattleView：空战场也不炸（开战前的初始态）', { timeout: 编译超时 }, async () => {
    const html = await 渲染('BattleView.vue', {
      状态: { 进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [] },
      日志: [],
      敌方意图: [],
    });

    expect(html).toContain('第 0 回合');
  });

  it('SetupView：名单未加载时显示读取提示', { timeout: 编译超时 }, async () => {
    const html = await 渲染('SetupView.vue', {});
    expect(html).toContain('读取实体名单中');
  });

  it('PendingModal：待决点为空时不渲染内容', { timeout: 编译超时 }, async () => {
    const html = await 渲染('PendingModal.vue', { 待决: null });
    expect(html).not.toContain('打断');
  });

  // CombatView 不在这个文件里渲：它 import 了 SetupView.vue，而 vitest 没装 vue 插件、
  // 解析不了 `.vue` 的 import（本文件只能编译"不 import 别的 .vue"的组件）。
  // 它的准备态由 SetupView 那条覆盖，真正的逻辑在 CombatView 里的部分都已经抽成纯函数测过了。

  it('SettingsView：API 配置表单 + 翻译缓存区块', { timeout: 编译超时 }, async () => {
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

describe('BattleView · 倒下的角色要看得出是哪个阶段', () => {
  it('HP 归零的单位显示「濒死（n/2 成功，m/3 失败）」（世界书：归零是濒死，不是死亡）', async () => {
    const 状态 = 造战斗状态();
    状态.单位['契约者'].HP_当前 = 0;
    状态.单位['契约者'].濒死 = { 成功: 1, 失败: 2 } as any;

    const html = await 渲染('BattleView.vue', { 状态, 日志: [], 敌方意图: [] });

    expect(html).toContain('濒死（1/2 成功，2/3 失败）');
  });

  it('濒死检定三次失败 → 显示「已死亡」', async () => {
    const 状态 = 造战斗状态();
    状态.单位['契约者'].HP_当前 = 0;
    状态.单位['契约者'].濒死 = { 成功: 0, 失败: 3 } as any;

    const html = await 渲染('BattleView.vue', { 状态, 日志: [], 敌方意图: [] });

    expect(html).toContain('已死亡');
  });

  it('稳定下来（脱离濒死但仍昏迷）→ 显示「已稳定（昏迷）」', async () => {
    const 状态 = 造战斗状态();
    状态.单位['契约者'].HP_当前 = 0;
    状态.单位['契约者'].濒死 = null as any;

    const html = await 渲染('BattleView.vue', { 状态, 日志: [], 敌方意图: [] });

    expect(html).toContain('已稳定（昏迷）');
  });
});

describe('距离条 · 以玩家为原点双向延伸 + 同一距离上下堆叠（实战反馈）', () => {
  /** 取第 n 个 marker-group 的内部 HTML */
  function 取标记组(html: string, n = 0): string {
    let i = -1;
    for (let k = 0; k <= n; k++) i = html.indexOf('class="marker-group"', i + 1);
    if (i < 0) return '';
    const 起 = html.indexOf('>', i) + 1;
    const 止 = html.indexOf('</div></div>', 起);
    return html.slice(起, 止 < 0 ? undefined : 止);
  }

  it('显示「玩家原点」，并支持负距离（身后）', async () => {
    const 状态 = 造战斗状态();
    状态.单位['江薇芷'].距离 = -20; // 跑到玩家身后

    const html = await 渲染('BattleView.vue', { 状态, 日志: [], 敌方意图: [] });

    expect(html).toContain('玩家原点');
    expect(html).toContain('-20m'); // 负距离真的显示出来了
    expect(html).toContain('身后（负）');
    expect(html).toContain('身前（正）');
  });

  it('同一距离上的多人**上下堆叠**（以前会完全重叠、互相遮挡）', async () => {
    const 状态 = 造战斗状态();
    状态.单位['契约者'].距离 = 0;
    状态.单位['江薇芷'].距离 = 0; // 和玩家同一位置

    const html = await 渲染('BattleView.vue', { 状态, 日志: [], 敌方意图: [] });

    // 两个不同距离（0 与 10）→ 两个标记组
    const 组数 = (html.match(/class="marker-group"/g) ?? []).length;
    expect(组数).toBe(2);

    // 第一个组（距离最小 = 0）里同时装了两个人，而不是挤成一个
    const 第一组 = 取标记组(html, 0);
    expect(第一组).toContain('黑崎一护');
    expect(第一组).toContain('江薇芷');
  });

  it('同一点人多时距离条会变高（不至于被裁掉）', async () => {
    const 状态 = 造战斗状态();
    状态.单位['契约者'].距离 = 0;
    状态.单位['江薇芷'].距离 = 0;
    状态.单位['骨卫兵'].距离 = 0; // 三人同点

    const html = await 渲染('BattleView.vue', { 状态, 日志: [], 敌方意图: [] });

    expect(html).toMatch(/height:\s*8[0-9]px/); // 纵轴版：20 + 车道26 + (3-1)*20 = 86
  });
});
