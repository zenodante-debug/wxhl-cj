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

export interface ActiveNews {
  stock: string; // 股票代码
  text: string;
  sentiment: 'good' | 'bad'; // 标题情绪（不一定等于实际影响）
  impact: number; // 每跳 drift（可正可负）
  ttl: number; // 剩余生效跳数
}

export type LogKind = 'news' | 'trade' | 'system';

export interface LogEntry {
  tick: number;
  time: string; // 现实时钟 HH:MM:SS
  kind: LogKind;
  text: string;
}

/** 存档里保留的日志条数上限（界面只显示最近 50 条） */
export const LOG_CAP = 200;

export interface ExchangeAccount {
  v: 2;
  cash: number; // 交易所币，可为负
  positions: Record<string, Position>;
  prices: Record<string, number>;
  priceHistory: Record<string, number[]>;
  /** 本次开盘基准价：脚本加载时快照，走势图基准线与涨跌幅都按它算 */
  openPrices: Record<string, number>;
  tick: number;
  /** 净投入（币）：累计存入所得的币 − 累计取出扣掉的币。总盈亏 = 净资产 − 净投入 */
  netInvested: number;
  /** 破产后未抵完的欠款，账户随之冻结，清偿后解冻 */
  debt: number;
  bankruptcyCount: number;
  cumulativeLoss: number; // 累计已实现亏损（破产线判定）
  frozen: boolean; // 破产欠款未清
  news: ActiveNews | null;
  newsCooldown: number; // 距下次可抽新闻的跳数
  logs: LogEntry[]; // 交易所日报
}

export function createAccount(): ExchangeAccount {
  const prices: Record<string, number> = {};
  const priceHistory: Record<string, number[]> = {};
  for (const s of STOCKS) {
    prices[s.code] = s.basePrice;
    priceHistory[s.code] = [s.basePrice];
  }
  return {
    v: 2,
    cash: 0,
    positions: {},
    prices,
    priceHistory,
    openPrices: { ...prices },
    tick: 0,
    netInvested: 0,
    debt: 0,
    bankruptcyCount: 0,
    cumulativeLoss: 0,
    frozen: false,
    news: null,
    newsCooldown: 3,
    logs: [],
  };
}

/** 金额统一保留两位小数 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
