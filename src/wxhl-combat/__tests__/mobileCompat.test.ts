import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ================================================================
// 防具：手机端补丁（mobile-compat.js）
//
// 这个文件**没有任何自动检查** —— 它不在模块依赖图里（webpack 只按文件名把它追加到产物尾部），
// tsc 不看 `.js`，vitest 不 import 它。于是：
// - 文件名写错 → webpack 找不到 → **手机适配静默失效**（玩家报的"关闭按钮在屏幕外"就是这样来的）
// - 选择器写错 → 补丁跑得好好的，但一个元素都没改到 → 同样静默失效
// 这里把这些"静默"变成红灯。
// ================================================================

const 项目目录 = path.resolve(import.meta.dirname, '..');
const 补丁路径 = path.join(项目目录, 'mobile-compat.js');
const 补丁 = fs.readFileSync(补丁路径, 'utf8');
const 外壳源码 = fs.readFileSync(path.join(项目目录, 'App.vue'), 'utf8');
const 入口源码 = fs.readFileSync(path.join(项目目录, 'index.ts'), 'utf8');

describe('手机端补丁 mobile-compat.js', () => {
  it('文件存在且名字正确（webpack 按 `mobile-compat.js` 这个名字自动注入）', () => {
    expect(fs.existsSync(补丁路径)).toBe(true);
    expect(path.basename(补丁路径)).toBe('mobile-compat.js');
  });

  it('语法合法（语法错误在手机上表现为"整个补丁静默不生效"）', () => {
    expect(() => new Function(补丁)).not.toThrow();
  });

  it('**它查询的每个类名都真的存在于外壳里**（选择器写错 = 补丁静默失效）', () => {
    for (const 类名 of ['combat-launcher', 'combat-overlay', 'combat-shell', 'shell-topbar', 'shell-close']) {
      expect(补丁).toContain(`.${类名}`);
      expect(外壳源码).toContain(`class="${类名}"`);
    }
  });

  it('根容器 id 与 index.ts 里创建的一致', () => {
    const id = /\.attr\('id', '([^']+)'\)/.exec(入口源码)?.[1];
    expect(id).toBeTruthy();
    expect(补丁).toContain(id!);
  });

  it('用 visualViewport（手机地址栏会把 innerHeight 撑高，用它定尺寸就会把顶栏顶出屏幕）', () => {
    expect(补丁).toContain('visualViewport');
    expect(补丁).toContain('placeAtViewport'); // 自校正 fixed 包含块偏移
    expect(补丁).toContain('clampPosition'); // 位置夹进可视区
  });

  it('悬浮球位置键与 App.vue 共用同一个（两份各写一份会互相打架）', () => {
    const 键 = /wxhl-combat-orb-position-v\d/.exec(外壳源码)?.[0];
    expect(键).toBeTruthy();
    expect(补丁).toContain(键!);
  });

  it('面板高度被夹到可视区内 —— 否则顶栏的 ✕ 会被顶出屏幕（玩家报的 bug）', () => {
    expect(补丁).toContain('max-height');
    expect(补丁).toMatch(/viewport\.height/);
    expect(补丁).toMatch(/shell-close/);
  });

  it('index.ts 也优先用 visualViewport 定尺寸（补丁之外的**第一道**防线）', () => {
    expect(入口源码).toContain('visualViewport');
  });
});
