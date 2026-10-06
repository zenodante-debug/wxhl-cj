import { describe, expect, it } from 'vitest';
import { 先攻判定 } from '../engine/rules';

describe('rules · 先攻判定', () => {
  it('先攻 = 1d20 + AGI修正', () => {
    // 一阶 AGI=10 → AGI修正 = (10-5)×1 = 5
    // 1d20 范围 1~20，所以先攻范围 6~25
    for (let i = 0; i < 100; i++) {
      const result = 先攻判定(10, '一阶');
      expect(result).toBeGreaterThanOrEqual(6);
      expect(result).toBeLessThanOrEqual(25);
    }
  });

  it('二阶 AGI=25 → AGI修正 = 40，先攻范围 41~60', () => {
    for (let i = 0; i < 100; i++) {
      const result = 先攻判定(25, '二阶');
      expect(result).toBeGreaterThanOrEqual(41);
      expect(result).toBeLessThanOrEqual(60);
    }
  });
});
