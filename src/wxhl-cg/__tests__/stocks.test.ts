import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { HISTORY_CAP, STOCKS } from '../engine/stocks';

describe('stocks / createAccount', () => {
  it('10 只股票，波动率严格递增，代码唯一', () => {
    expect(STOCKS).toHaveLength(10);
    const sigmas = STOCKS.map(s => s.sigma);
    for (let i = 1; i < sigmas.length; i++) expect(sigmas[i]).toBeGreaterThan(sigmas[i - 1]);
    expect(new Set(STOCKS.map(s => s.code)).size).toBe(10);
  });
  it('createAccount 用基准价初始化价格和空历史', () => {
    const acct = createAccount();
    expect(acct.v).toBe(2);
    expect(acct.cash).toBe(0);
    expect(acct.tick).toBe(0);
    expect(acct.frozen).toBe(false);
    for (const s of STOCKS) {
      expect(acct.prices[s.code]).toBe(s.basePrice);
      expect(acct.priceHistory[s.code]).toEqual([s.basePrice]);
    }
  });
  it('账户带 净投入/日志/开盘基准价 字段，且借贷与遗产税字段已移除', () => {
    const acct = createAccount();
    expect(acct.netInvested).toBe(0);
    expect(acct.logs).toEqual([]);
    expect(acct.openPrices['TGJ']).toBe(100);
    expect('loan' in acct).toBe(false);
    expect('loanState' in acct).toBe(false);
    expect('deathMarked' in acct).toBe(false);
  });
});
