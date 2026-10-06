import { describe, expect, it } from 'vitest';
import { 混合伤害 } from '../engine/damage';

describe('damage · 混合伤害', () => {
  it('基础伤害 30，实际防御 8 → 混合伤害 = 22', () => {
    expect(混合伤害(30, 8)).toBe(22);
  });

  it('基础伤害 10，实际防御 15 → 混合伤害 = 1（最低1）', () => {
    expect(混合伤害(10, 15)).toBe(1);
  });

  it('基础伤害 5，实际防御 5 → 混合伤害 = 1（最低1）', () => {
    expect(混合伤害(5, 5)).toBe(1);
  });

  it('基础伤害 100，实际防御 0 → 混合伤害 = 100', () => {
    expect(混合伤害(100, 0)).toBe(100);
  });
});
