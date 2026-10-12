// ================================================================
// 回廊交易所 · 账户类型。纯数据，无任何酒馆运行时依赖。
// ================================================================
import { STOCKS } from './stocks';

export type Side = 'long' | 'short';

export interface Position {
  side: Side;
  qty: number; // 股数
  entryPrice: number; // 开仓均价
  leverage: number; // 1–100
  margin: number; // 占用保证金
}

export type LoanState = 'none' | 'normal' | 'delinquent';

export interface ActiveLoan {
  principal: number;
  rate: number; // 正常借款的单期利率；高利贷固定为偿还倍数 2.5
  dueTick: number;
  highInterest: boolean;
  accrued: number; // 高利贷已累计利息
  ticksHeld: number; // 高利贷持有跳数（利息递增用）
}

export interface ActiveNews {
  stock: string; // 股票代码
  text: string;
  sentiment: 'good' | 'bad'; // 标题情绪（不一定等于实际影响）
  impact: number; // 每跳 drift（可正可负）
  ttl: number; // 剩余生效跳数
}

export interface ExchangeAccount {
  v: 1;
  cash: number; // 交易所币，可为负（高利贷利息）
  positions: Record<string, Position>;
  prices: Record<string, number>;
  priceHistory: Record<string, number[]>;
  tick: number;
  loan: ActiveLoan | null;
  loanState: LoanState;
  debt: number; // 清算后剩余债务，跨档背着
  bankruptcyCount: number;
  deathMarked: boolean; // 死亡标记（遗产税用）
  cumulativeLoss: number; // 累计已实现亏损（破产线）
  frozen: boolean; // 失信/欠税冻结
  news: ActiveNews | null;
  newsCooldown: number; // 距下次可抽新闻的跳数
}

export function createAccount(): ExchangeAccount {
  const prices: Record<string, number> = {};
  const priceHistory: Record<string, number[]> = {};
  for (const s of STOCKS) {
    prices[s.code] = s.basePrice;
    priceHistory[s.code] = [s.basePrice];
  }
  return {
    v: 1,
    cash: 0,
    positions: {},
    prices,
    priceHistory,
    tick: 0,
    loan: null,
    loanState: 'none',
    debt: 0,
    bankruptcyCount: 0,
    deathMarked: false,
    cumulativeLoss: 0,
    frozen: false,
    news: null,
    newsCooldown: 3,
  };
}

/** 金额统一保留两位小数 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
