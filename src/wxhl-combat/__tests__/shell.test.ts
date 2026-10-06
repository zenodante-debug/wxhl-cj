import { describe, expect, it } from 'vitest';
import { 外壳初始状态, 切换外壳, 切换页签 } from '../engine/shell';

describe('shell · 外壳状态机', () => {
  it('初始：面板隐藏、悬浮按钮可见、默认战斗页签', () => {
    const s = 外壳初始状态();
    expect(s.面板可见).toBe(false);
    expect(s.页签).toBe('战斗');
  });

  it('点悬浮按钮 → 面板可见', () => {
    const s = 切换外壳(外壳初始状态(), '打开');
    expect(s.面板可见).toBe(true);
  });

  it('点关闭 → 面板隐藏、悬浮按钮仍在', () => {
    const s = 切换外壳(切换外壳(外壳初始状态(), '打开'), '关闭');
    expect(s.面板可见).toBe(false);
  });

  it('切换页签', () => {
    const s = 切换页签(外壳初始状态(), '设置');
    expect(s.页签).toBe('设置');
  });
});
