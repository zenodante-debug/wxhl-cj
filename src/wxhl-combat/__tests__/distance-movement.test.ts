import { describe, expect, it } from 'vitest';
import { 移动距离计算 } from '../engine/distance';

describe('distance · 移动距离计算', () => {
  it('一阶 AGI=10 → 移动距离 = 5 + (10-5)×1 = 10米', () => {
    expect(移动距离计算(10, '一阶', 0)).toBe(10);
  });

  it('二阶 AGI=25 → 移动距离 = 5 + (25-5)×2 = 45米', () => {
    expect(移动距离计算(25, '二阶', 0)).toBe(45);
  });

  it('五阶 AGI=150 → 移动距离 = 5 + (150-5)×11 = 1600米', () => {
    expect(移动距离计算(150, '五阶', 0)).toBe(1600);
  });

  it('一阶 AGI=10 + 移动距离额外加成 5 → 15米', () => {
    expect(移动距离计算(10, '一阶', 5)).toBe(15);
  });
});
