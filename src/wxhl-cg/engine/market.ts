// ================================================================
// 回廊交易所 · 行情跳动：几何随机游走 + 新闻 drift。纯函数，rng 可注入以便测试。
// ================================================================
import { round2, type ExchangeAccount } from './types';
import { HISTORY_CAP, STOCKS } from './stocks';
import { maybeRollNews } from './news';

export type Rng = () => number;

/** Box-Muller：均匀 rng → 标准正态 */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * 推进一跳：tick++ → 逐股定价（随机游走 + 活跃新闻 drift）→ 新闻 ttl 衰减/可能抽新。
 * 价格下限 0.01（不退市清零）。
 */
export function tickMarket(acct: ExchangeAccount, rng: Rng = Math.random): void {
  acct.tick++;
  const news = acct.news;
  for (const s of STOCKS) {
    const drift = news && news.stock === s.code ? news.impact : 0;
    const next = acct.prices[s.code] * Math.exp(s.sigma * gaussian(rng) + drift);
    acct.prices[s.code] = Math.max(0.01, round2(next));
    const h = acct.priceHistory[s.code];
    h.push(acct.prices[s.code]);
    if (h.length > HISTORY_CAP) h.splice(0, h.length - HISTORY_CAP);
  }
  if (acct.news) {
    acct.news.ttl--;
    if (acct.news.ttl <= 0) acct.news = null;
  }
  maybeRollNews(acct, rng);
}
