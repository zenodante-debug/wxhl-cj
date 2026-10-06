import { describe, expect, it } from 'vitest';
import { 开场距离选项, 开场距离随机 } from '../engine/setup';

describe('setup · 开场距离', () => {
  it('四个选项', () => {
    const 选项 = 开场距离选项();
    expect(选项.map(o => o.名)).toEqual(['伏击/狙击', '开阔遭遇', '对峙/室内', '贴身缠斗']);
  });

  it('随机距离落在范围内', () => {
    for (let i = 0; i < 50; i++) {
      const d = 开场距离随机([20, 100]);
      expect(d).toBeGreaterThanOrEqual(20);
      expect(d).toBeLessThanOrEqual(100);
      expect(Number.isInteger(d)).toBe(true);
    }
  });
});
