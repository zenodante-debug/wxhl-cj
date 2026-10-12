import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { tickMarket } from '../engine/market';
import { NEWS_POOL } from '../engine/news';
import { STOCKS, stockOf } from '../engine/stocks';
import { seededRng } from './market.test';

describe('NEWS_POOL', () => {
  it('每只股至少 3 条新闻，情绪字段合法', () => {
    for (const s of STOCKS) {
      const list = NEWS_POOL.filter(n => n.stock === s.code);
      expect(list.length).toBeGreaterThanOrEqual(3);
      for (const n of list) expect(['good', 'bad']).toContain(n.sentiment);
    }
  });
});

describe('maybeRollNews（经 tickMarket）', () => {
  // tickMarket 每跳消耗 rng 的顺序：10 只股 × gaussian 2 个值 = 20 个，第 21 个起才是新闻判定。
  // 用前 20 个 0.5（价格正常游走）+ 第 21 个 0.1（<0.25 必抽中）锁定新闻在第 1 跳末尾产生。
  function newsForcingRng() {
    const seq = [...Array(20).fill(0.5), 0.1, 0.0, 0.9, 0.9];
    let i = 0;
    return () => (i < seq.length ? seq[i++] : 0.5);
  }
  it('新闻生效 3 跳后消失', () => {
    const acct = createAccount();
    acct.newsCooldown = 0;
    const rng = newsForcingRng();
    tickMarket(acct, rng);
    expect(acct.news).not.toBeNull();
    expect(acct.news!.ttl).toBe(3);
    tickMarket(acct, rng);
    expect(acct.news!.ttl).toBe(2);
    tickMarket(acct, rng);
    expect(acct.news!.ttl).toBe(1);
    tickMarket(acct, rng);
    expect(acct.news).toBeNull();
  });
  it('冲击幅度在 [σ, 3σ] 区间', () => {
    const acct = createAccount();
    acct.newsCooldown = 0;
    const rng = seededRng(123);
    // 反复跳到出新闻为止
    for (let i = 0; i < 50 && !acct.news; i++) tickMarket(acct, rng);
    expect(acct.news).not.toBeNull();
    const sigma = stockOf(acct.news!.stock).sigma;
    expect(Math.abs(acct.news!.impact)).toBeGreaterThanOrEqual(sigma * 0.99);
    expect(Math.abs(acct.news!.impact)).toBeLessThanOrEqual(sigma * 3.01);
  });
  it('冷却期内不抽新新闻', () => {
    const acct = createAccount();
    acct.newsCooldown = 5;
    const rng = () => 0.5;
    tickMarket(acct, rng);
    expect(acct.news).toBeNull();
    expect(acct.newsCooldown).toBe(4);
  });
});
