import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { gaussian, tickMarket } from '../engine/market';
import { HISTORY_CAP, STOCKS } from '../engine/stocks';

// 可播种的确定性 rng（线性同余）
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('gaussian', () => {
  it('产出近似标准正态（均值≈0，方差≈1）', () => {
    const rng = seededRng(42);
    const xs = Array.from({ length: 20000 }, () => gaussian(rng));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const var_ = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(var_ - 1)).toBeLessThan(0.1);
  });
});

describe('tickMarket', () => {
  it('每跳 tick+1、价格更新、历史追加上限 HISTORY_CAP', () => {
    const acct = createAccount();
    acct.newsCooldown = 999; // 隔离新闻（Task 3 才实现）
    const rng = seededRng(7);
    for (let i = 0; i < HISTORY_CAP + 20; i++) tickMarket(acct, rng);
    expect(acct.tick).toBe(HISTORY_CAP + 20);
    for (const s of STOCKS) {
      expect(acct.priceHistory[s.code]).toHaveLength(HISTORY_CAP);
      expect(acct.prices[s.code]).toBeGreaterThan(0);
    }
  });
  it('价格永不为 0 或负（下限 0.01）', () => {
    const acct = createAccount();
    acct.newsCooldown = 999;
    acct.prices['EML'] = 0.02; // 极高波动股压到接近下限
    // rng 恒 0.5 → gaussian = 1.177×cos(π) ≈ −1.177 → 每跳必跌
    // （不能恒 0：u→0 会让 Box-Muller 产出 +∞）
    const rng = () => 0.5;
    for (let i = 0; i < 50; i++) tickMarket(acct, rng);
    expect(acct.prices['EML']).toBeGreaterThanOrEqual(0.01);
  });
  it('价格两位小数', () => {
    const acct = createAccount();
    acct.newsCooldown = 999;
    tickMarket(acct, seededRng(1));
    for (const s of STOCKS) {
      expect(((acct.prices[s.code] * 100) % 1)).toBeCloseTo(0, 6);
    }
  });
});
