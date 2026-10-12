// ================================================================
// 回廊交易所 · 交易引擎：开平仓、费用、净值、强平、杠杆利息。
// 纯函数，不碰酒馆运行时。
// ================================================================
import { round2, type ExchangeAccount, type Position, type Side } from './types';
import { stockOf } from './stocks';

export const COMMISSION_RATE = 0.01; // 佣金：成交额 1%，买卖双向
export const COMMISSION_MARGIN_CAP = 0.1; // 佣金上限：保证金 10%
export const STAMP_RATE = 0.001; // 印花税：卖出方 0.1%（平多/开空/强平/清算）
export const MAINTENANCE_RATE = 0.05; // 强平维持线：净值 ≤ 名义×5%
export const LEVERAGE_INTEREST_THRESHOLD = 20;
export const LEVERAGE_INTEREST_RATE = 0.0001; // 每超 1 倍，每跳收名义本金 0.01%

/** 佣金 = min(成交额×1%, 保证金×10%) */
export function commission(notional: number, margin: number): number {
  return round2(Math.min(notional * COMMISSION_RATE, margin * COMMISSION_MARGIN_CAP));
}

export function positionPnl(pos: Position, price: number): number {
  const diff = pos.side === 'long' ? price - pos.entryPrice : pos.entryPrice - price;
  return round2(diff * pos.qty);
}

/** 持仓净值 = 保证金 + 浮动盈亏 */
export function positionEquity(pos: Position, price: number): number {
  return round2(pos.margin + positionPnl(pos, price));
}

/** 账户净资产 = 现金 + Σ持仓净值 */
export function netAssets(acct: ExchangeAccount): number {
  let sum = acct.cash;
  for (const [code, pos] of Object.entries(acct.positions)) {
    sum += positionEquity(pos, acct.prices[code] ?? pos.entryPrice);
  }
  return round2(sum);
}

export interface OpenResult {
  notional: number;
  margin: number;
  fee: number;
  stamp: number;
}

/**
 * 开仓。抛出 Error 的情形（响亮失败）：账户冻结、参数非法、现金不足、已有同股仓位。
 * 印花税：仅开空收（卖出方）。
 */
export function openPosition(acct: ExchangeAccount, code: string, side: Side, qty: number, leverage: number): OpenResult {
  if (acct.frozen) throw new Error('账户冻结中，禁止开仓');
  stockOf(code);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('数量必须是正整数');
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > 100) throw new Error('杠杆必须是 1–100 的整数');
  if (acct.positions[code]) throw new Error('已有该股仓位，请先平仓');

  const price = acct.prices[code];
  const notional = round2(qty * price);
  const margin = round2(notional / leverage);
  const fee = commission(notional, margin);
  const stamp = side === 'short' ? round2(notional * STAMP_RATE) : 0;
  const total = round2(margin + fee + stamp);
  if (acct.cash < total) throw new Error(`现金不足：需要 ${total}，只有 ${round2(acct.cash)}`);

  acct.cash = round2(acct.cash - total);
  acct.positions[code] = { side, qty, entryPrice: price, leverage, margin };
  return { notional, margin, fee, stamp };
}

export interface CloseResult {
  pnl: number;
  fee: number;
  stamp: number;
  returned: number; // 实际回到现金的金额
}

/** 平仓。平多收印花税；平空不收。已实现亏损累计进 cumulativeLoss。 */
export function closePosition(acct: ExchangeAccount, code: string): CloseResult {
  const pos = acct.positions[code];
  if (!pos) throw new Error('没有该股仓位: ' + code);
  const price = acct.prices[code];
  const notional = round2(pos.qty * price);
  const pnl = positionPnl(pos, price);
  const fee = commission(notional, pos.margin);
  const stamp = pos.side === 'long' ? round2(notional * STAMP_RATE) : 0;
  const returned = round2(pos.margin + pnl - fee - stamp);
  acct.cash = round2(acct.cash + returned);
  if (pnl < 0) acct.cumulativeLoss = round2(acct.cumulativeLoss + -pnl);
  delete acct.positions[code];
  return { pnl, fee, stamp, returned };
}

/**
 * 强平价：净值(保证金+浮盈亏) ≤ 保证金×5% 时的价格。
 * 做多：entry×(1−0.95/L)；做空：entry×(1+0.95/L)。
 * （裁决：spec 原文「保证金 ≤ 名义×5%」会让 >20 倍杠杆开仓即破线——1/L < 5% 恒成立，
 *  与 1–100 倍杠杆设计自相矛盾；维持线改为按保证金计，高杠杆依然更近强平。）
 * 1 倍杠杆：做多 0 / 做空 Infinity（永不强平）。
 */
export function liquidationPrice(pos: Position): number {
  if (pos.leverage === 1) return pos.side === 'long' ? 0 : Infinity;
  const L = pos.leverage;
  const ratio = (1 - MAINTENANCE_RATE) / L;
  return pos.side === 'long' ? round2(pos.entryPrice * (1 - ratio)) : round2(pos.entryPrice * (1 + ratio));
}

export interface TickTradingResult {
  liquidated: string[];
  interest: number;
}

/**
 * 每跳结算：先收杠杆利息（>20 倍），再逐个检查强平（费用照收）。
 * 强平即按现价平仓（closePosition 同等逻辑），亏损计入 cumulativeLoss。
 */
export function tickTrading(acct: ExchangeAccount): TickTradingResult {
  let interest = 0;
  for (const [code, pos] of Object.entries(acct.positions)) {
    if (pos.leverage > LEVERAGE_INTEREST_THRESHOLD) {
      const notional = pos.qty * (acct.prices[code] ?? pos.entryPrice);
      const fee = round2(notional * (pos.leverage - LEVERAGE_INTEREST_THRESHOLD) * LEVERAGE_INTEREST_RATE);
      interest = round2(interest + fee);
      acct.cash = round2(acct.cash - fee); // 可扣成负数
    }
  }
  const liquidated: string[] = [];
  for (const [code, pos] of Object.entries(acct.positions)) {
    const price = acct.prices[code];
    const liq = liquidationPrice(pos);
    const hit = pos.side === 'long' ? price <= liq : price >= liq;
    if (hit) {
      closePosition(acct, code); // 佣金印花税照收（按平仓方向计）
      liquidated.push(code);
    }
  }
  return { liquidated, interest };
}
