import { describe, expect, it } from 'vitest';
import { 移动额度消耗, 移动额度重置 } from '../engine/distance';

describe('distance · 移动额度', () => {
  it('回合开始重置移动额度', () => {
    expect(移动额度重置(45)).toBe(45);
  });

  it('移动 3 米 → 额度 45 → 42', () => {
    expect(移动额度消耗(45, 3)).toBe(42);
  });

  it('移动 10 米 → 额度 42 → 32', () => {
    expect(移动额度消耗(42, 10)).toBe(32);
  });

  it('移动超过额度应该抛错', () => {
    expect(() => 移动额度消耗(5, 10)).toThrow('移动额度不足');
  });

  it('额度耗尽为 0', () => {
    expect(移动额度消耗(45, 45)).toBe(0);
  });
});
