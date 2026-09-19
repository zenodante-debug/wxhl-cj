import { describe, expect, it } from 'vitest';

describe('测试设施', () => {
  it('自动导入的 z 可用', () => {
    expect(typeof z.object).toBe('function');
  });

  it('lodash 全局 _ 可用', () => {
    expect(_.clamp(15, 0, 10)).toBe(10);
  });

  it('crypto.getRandomValues 可用', () => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    expect(buf[0]).toBeGreaterThanOrEqual(0);
  });
});
