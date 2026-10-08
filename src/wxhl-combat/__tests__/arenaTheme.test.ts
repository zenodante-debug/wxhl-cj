import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ================================================================
// 决斗场美术 · Task 1：theme.scss + 外壳换皮（源码守卫）
//
// 美术在本仓库没有运行时测试（.vue 无 vue-tsc、vitest 不装 vue 插件），
// 所以"决斗场皮肤真的接上了"用**源码守卫**钉住 —— 一旦有人把皮肤改回灰工程界面，
// 这里会红。真正的构图在 renderViews 里另有断言。
// ================================================================

const 根 = path.resolve(import.meta.dirname, '..');
const 读 = (f: string) => fs.readFileSync(path.join(根, f), 'utf8');

describe('决斗场主题（theme.scss）', () => {
  const 主题 = () => 读('theme.scss');

  it('存在，且调色板是长廊版（暗棕血色，不是灰工程色）', () => {
    const s = 主题();
    // SCSS token（--cb-* 的 CSS 变量由 App.vue 挂在 .wxhl-combat-root 上，另有一条断言）
    for (const 变量 of ['$cb-void', '$cb-bg', '$cb-panel', '$cb-border', '$cb-amber', '$cb-blood-wet', '$cb-blood', '$cb-ember', '$cb-gold', '$cb-copper']) {
      expect(s, `缺 ${变量}`).toContain(变量);
    }
    // 战斗专色：MP 蓝（wxhl-003 没有，决斗场要显示 MP/护盾）
    expect(s).toContain('$cb-mana');
    // 长廊版的底色：暗棕虚空，不是灰工程界面的 #1a1a1a
    expect(s).toContain('#080504');
  });

  it('颗粒纹理自包含（SVG feTurbulence data URI，无图片资源）', () => {
    expect(主题()).toContain('feTurbulence');
    expect(主题()).toContain('data:image/svg+xml');
  });

  it('铆钉 mixin（铭牌四角，与 wxhl-003 同源）', () => {
    expect(主题()).toMatch(/@mixin\s+cb-rivets/);
  });

  it('火光摇曳关键帧（决斗场的火把，搬自长廊灯泡）', () => {
    expect(主题()).toMatch(/@keyframes\s+cbTorchFlick/);
  });
});

describe('外壳换皮（App.vue）', () => {
  const 外壳 = () => 读('App.vue');

  it('根节点引入决斗场主题（token 挂 .wxhl-combat-root）', () => {
    expect(外壳()).toContain('theme.scss');
    expect(外壳()).toContain('--cb-void');
  });

  it('标题换成「决斗场」，用长廊的衬线字体（字体声明在 theme.scss，App.vue 引用变量）', () => {
    expect(外壳()).toContain('决斗场');
    expect(外壳()).toContain('--cb-font-display'); // 衬线标题字体挂上了
    expect(读('theme.scss')).toContain('Noto Serif SC'); // 与长廊同源的字
  });

  it('顶栏是石檐（不是灰色平板），页签是铜牌', () => {
    expect(外壳()).toMatch(/shell-topbar[\s\S]*cb-border/);
  });

  it('启动球还是原来那颗（class/字形/尺寸不动 —— 只换皮）', () => {
    expect(外壳()).toContain('combat-launcher');
    expect(外壳()).toContain('⚔');
    expect(外壳()).toMatch(/width:\s*52px/);
  });

  it('JS 行为逻辑不动（摆放/归位/夹取 还在，位置由 JS 覆盖）', () => {
    expect(外壳()).toContain('function 摆放');
    expect(外壳()).toContain('function 归位');
    expect(外壳()).toContain('setProperty');
  });
});

describe('Task 2 · 准备页（SetupView）换皮', () => {
  const 页 = () => 读('views/SetupView.vue');

  it('名单是铭牌列表（setup-roster + plate-row），不是灰色表格', () => {
    expect(页()).toContain('setup-roster');
    expect(页()).toContain('plate-row');
    expect(页()).toContain('plate-name'); // 名字用衬线大字
  });

  it('开战按钮是决斗场闸门（cb-gate），文案不动', () => {
    expect(页()).toContain('start-btn');
    expect(页()).toMatch(/cb-gate/);
  });

  it('皮肤用 token（var(--cb-*)），不是灰工程色', () => {
    expect(页()).toContain('var(--cb-');
    expect(页()).not.toContain('#ddd');
    expect(页()).not.toContain('#2a4a2a'); // 旧的绿按钮
  });
});

describe('Task 8 · 设置页石碑化（SettingsView）', () => {
  const 页 = () => 读('views/SettingsView.vue');

  it('面板是石碑（cb-stone），输入框是铜牌（cb-plaque）', () => {
    expect(页()).toContain('cb-stone');
    expect(页()).toContain('cb-plaque');
  });

  it('皮肤用 token（var(--cb-*)），不是灰工程色', () => {
    expect(页()).toContain('var(--cb-');
    expect(页()).not.toContain('background: #1a1a1a');
    expect(页()).not.toContain('color: #ddd');
  });
});

// ================================================================
// 玩家反馈 3：「字体方面，应该强制锁字体颜色，免得不同酒馆主题影响了字体颜色，导致看不清」
// 玩家反馈 4：「手机端的排版有点问题，很多字段或者报错没有自动换行功能，直接挤出去」
// 两条都在 App.vue 的**非 scoped**样式块里解决（scoped 样式打不到子组件内部）。
// ================================================================
describe('主题免疫 · 字体颜色锁死（玩家反馈 3）', () => {
  const 外壳 = () => 读('App.vue');

  it('有一个**非 scoped**的样式块（scoped 打不到子组件内部，锁色必须非 scoped）', () => {
    expect(外壳()).toMatch(/<style lang="scss">(?!\s*scoped)/);
  });

  it('根上的底色与字体用 !important 锁死（酒馆主题的 color 改不动我们）', () => {
    expect(外壳()).toMatch(/\.wxhl-combat-root\s*\{[^}]*color:[^;}]*!important/);
    expect(外壳()).toMatch(/\.wxhl-combat-root\s*\{[^}]*font-family:[^;}]*!important/);
  });

  it('原生表单控件（主题最爱改的地方）锁色 + 锁背景', () => {
    const 非scoped块 = /<style lang="scss">[\s\S]*?<\/style>/.exec(外壳())?.[0] ?? '';
    expect(非scoped块).toMatch(/\.wxhl-combat-root\s+(input|select)[^}]*!important/);
  });
});

describe('手机排版 · 自动换行（玩家反馈 4）', () => {
  const 外壳 = () => 读('App.vue');

  it('文本内容能换行（overflow-wrap）—— 长字段/报错不会直接挤出屏幕', () => {
    expect(外壳()).toContain('overflow-wrap');
  });

  it('重灾区（日志/单位元信息/预览行/意图行）都有换行规则', () => {
    for (const 类 of ['log-entry', 'ua-meta', 'pv-line', 'intent-row']) {
      expect(外壳(), `缺 ${类}`).toMatch(new RegExp(`${类}[\\s\\S]{0,420}overflow-wrap`));
    }
  });
});
