import { describe, expect, it } from 'vitest';
import { rollDie } from '../engine/dice';

describe('dice · rollDie', () => {
  it('掷 1d20 应该返回 1~20 的整数', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(20);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('掷 1d6 应该返回 1~6 的整数', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('掷 1d1 应该总是返回 1', () => {
    for (let i = 0; i < 10; i++) {
      expect(rollDie(1)).toBe(1);
    }
  });

  it('骰面数不是正整数应该抛错', () => {
    expect(() => rollDie(0)).toThrow('骰面数必须是正整数');
    expect(() => rollDie(-1)).toThrow('骰面数必须是正整数');
    expect(() => rollDie(1.5)).toThrow('骰面数必须是正整数');
  });
});
