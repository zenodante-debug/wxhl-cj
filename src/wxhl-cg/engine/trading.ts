// ================================================================
// 回廊交易所 · 交易引擎：金额下单、多笔持仓（同股可多笔、可多空对冲）、
// 费用、强平、杠杆利息。纯函数，不碰酒馆运行时。
//
// 下单口径（用户 2026-10-12 拍板）：输入的是**保证金**（你实际掏的钱），
// 名义金额 = 保证金 × 杠杆，股数 = floor(名义 / 现价)。
// ================================================================
import { round2, type ExchangeAccount, type Position, type Side } from './types';
import { stockOf } from './stocks';

export const COMMISSION_RATE = 0.01; // 佣金：成交额 1%，买卖双向
export const COMMISSION_MARGIN_CAP = 0.1; // 佣金上限：保证金 10%
export const COMMISSION_MIN = 1; // 佣金下限：1 币（照杀跌尖塔数值）
export const STAMP_RATE = 0.001; // 印花税：卖出方 0.1%
export const STAMP_MARGIN_CAP = 0.01; // 印花税上限：保证金 1%
export const MIN_MARGIN = 5; // 最低保证金
export const MAINTENANCE_RATE = 0.05; // 强平维持线：净值 ≤ 保证金×5%
export const LEVERAGE_INTEREST_THRESHOLD = 20;
export const LEVERAGE_INTEREST_RATE = 0.0001; // 每超 1 倍，每跳收名义本金 0.01%

/** 佣金 = clamp(成交额×1%, 下限 1, 上限保证金×10%) */
export function commission(notional: number, margin: number): number {
  const raw = notional * COMMISSION_RATE;
  return round2(Math.min(Math.max(raw, COMMISSION_MIN), margin * COMMISSION_MARGIN_CAP));
}

/** 印花税 = min(成交额×0.1%, 保证金×1%)，只向卖出方收 */
export function stampTax(notional: number, margin: number): number {
  return round2(Math.min(notional * STAMP_RATE, margin * STAMP_MARGIN_CAP));
}

export function positionPnl(pos: Position, price: number): number {
  const diff = pos.side === 'long' ? price - pos.entryPrice : pos.entryPrice - price;
  return round2(diff * pos.qty);
}

/** 持仓净值 = 保证金 + 浮动盈亏 */
export function positionEquity(pos: Position, price: number): number {
  return round2(pos.margin + positionPnl(pos, price));
}

/** 账户净资产 = 现金 + Σ持仓净值 − 未清欠款（欠款是真的负债，不能不计） */
export function netAssets(acct: ExchangeAccount): number {
  let sum = acct.cash - acct.debt;
  for (const pos of acct.positions) {
    sum += positionEquity(pos, acct.prices[pos.code] ?? pos.entryPrice);
  }
  return round2(sum);
}

/**
 * 强平价：净值(保证金+浮盈亏) ≤ 保证金×5% 时的价格。
 * 做多：entry×(1−0.95/L)；做空：entry×(1+0.95/L)。
 * （维持线按保证金计：若按名义本金计，>20 倍杠杆开仓即破线，与 1–100 倍设计矛盾。）
 * 1 倍杠杆：做多 0 / 做空 Infinity（永不强平）。
 */
export function liquidationPrice(pos: Position): number {
  if (pos.leverage === 1) return pos.side === 'long' ? 0 : Infinity;
  const ratio = (1 - MAINTENANCE_RATE) / pos.leverage;
  return pos.side === 'long' ? round2(pos.entryPrice * (1 - ratio)) : round2(pos.entryPrice * (1 + ratio));
}

/** 现价距强平价的百分比（1 倍杠杆无强平线 → null） */
export function liquidationDistance(pos: Position, price: number): number | null {
  const liq = liquidationPrice(pos);
  if (!Number.isFinite(liq) || liq <= 0) return null;
  return (Math.abs(price - liq) / price) * 100;
}

export interface OrderMath {
  qty: number;
  notional: number; // 名义金额 = 股数 × 现价
  margin: number; // 保证金（实际占用）= 名义 / 杠杆
  fee: number;
  stamp: number;
  total: number; // 本单共扣多少现金
}

/**
 * 下单算式（预览与实际开仓共用，保证"看到的费用"就是"实际扣的钱"）。
 * 金额是保证金；股数向下取整，所以实际保证金 ≤ 输入金额。
 */
export function orderMath(
  acct: ExchangeAccount,
  code: string,
  side: Side,
  marginWanted: number,
  leverage: number,
): OrderMath {
  stockOf(code);
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > 100) throw new Error('杠杆必须是 1–100 的整数');
  if (!Number.isFinite(marginWanted) || marginWanted <= 0) throw new Error('金额必须为正数');
  const price = acct.prices[code];
  const qty = Math.floor((marginWanted * leverage) / price);
  if (qty < 1) throw new Error(`金额太小：${marginWanted} × ${leverage} 倍买不到 1 股（现价 ${price}）`);
  const notional = round2(qty * price);
  const margin = round2(notional / leverage);
  if (margin < MIN_MARGIN) throw new Error(`保证金 ${margin} 低于最低保证金 ${MIN_MARGIN}`);
  const fee = commission(notional, margin);
  const stamp = side === 'short' ? stampTax(notional, margin) : 0;
  return { qty, notional, margin, fee, stamp, total: round2(margin + fee + stamp) };
}

/** 只算不动账本，供界面实时显示 */
export function tradePreview(
  acct: ExchangeAccount,
  code: string,
  side: Side,
  marginWanted: number,
  leverage: number,
): OrderMath {
  return orderMath(acct, code, side, marginWanted, leverage);
}

export interface OpenResult extends OrderMath {
  id: string;
  code: string;
  side: Side;
}

let seq = 0;
function nextId(code: string, side: Side): string {
  seq += 1;
  return `${code}-${side}-${Date.now().toString(36)}-${seq}`;
}

/**
 * 开仓：每次都新开一笔（同一只股可以同时持有多笔，也可以多空对冲）。
 * 抛出（响亮失败）：冻结、参数非法、金额太小、保证金过低、现金不足。
 */
export function openPosition(
  acct: ExchangeAccount,
  code: string,
  side: Side,
  marginWanted: number,
  leverage: number,
): OpenResult {
  if (acct.frozen) throw new Error('账户冻结中（破产欠款未清），禁止开仓');
  const m = orderMath(acct, code, side, marginWanted, leverage);
  if (acct.cash < m.total) throw new Error(`现金不足：需要 ${m.total}，只有 ${round2(acct.cash)}`);
  acct.cash = round2(acct.cash - m.total);
  const pos: Position = {
    id: nextId(code, side),
    code,
    side,
    qty: m.qty,
    entryPrice: acct.prices[code],
    leverage,
    margin: m.margin,
  };
  acct.positions.push(pos);
  return { ...m, id: pos.id, code, side };
}

export interface CloseResult {
  code: string;
  side: Side;
  qty: number;
  pnl: number;
  fee: number;
  stamp: number;
  returned: number; // 实际回到现金的金额
}

export function positionOf(acct: ExchangeAccount, id: string): Position | undefined {
  return acct.positions.find(p => p.id === id);
}

/** 平掉指定的一笔（按 id）。平多收印花税；平空不收。已实现亏损累计进 cumulativeLoss。 */
export function closePosition(acct: ExchangeAccount, id: string, force = false): CloseResult {
  if (acct.frozen && !force) throw new Error('账户冻结中，禁止平仓');
  const idx = acct.positions.findIndex(p => p.id === id);
  if (idx < 0) throw new Error('没有这笔持仓: ' + id);
  const pos = acct.positions[idx];
  const price = acct.prices[pos.code];
  const notional = round2(pos.qty * price);
  const pnl = positionPnl(pos, price);
  const fee = commission(notional, pos.margin);
  const stamp = pos.side === 'long' ? stampTax(notional, pos.margin) : 0;
  const returned = round2(pos.margin + pnl - fee - stamp);
  acct.cash = round2(acct.cash + returned);
  if (pnl < 0) acct.cumulativeLoss = round2(acct.cumulativeLoss + -pnl);
  acct.positions.splice(idx, 1);
  return { code: pos.code, side: pos.side, qty: pos.qty, pnl, fee, stamp, returned };
}

/** 某只股的全部持仓 */
export function lotsOf(acct: ExchangeAccount, code: string): Position[] {
  return acct.positions.filter(p => p.code === code);
}

export interface SideSummary {
  qty: number;
  margin: number;
  avgEntry: number;
  /** 该方向里离现价最近的那条强平线 */
  nearestLiq: number | null;
}

/** 某只股某个方向的汇总（走势图线与"距强平"用） */
export function sideSummary(acct: ExchangeAccount, code: string, side: Side): SideSummary | null {
  const lots = acct.positions.filter(p => p.code === code && p.side === side);
  if (!lots.length) return null;
  const qty = lots.reduce((a, p) => a + p.qty, 0);
  const margin = round2(lots.reduce((a, p) => a + p.margin, 0));
  const avgEntry = round2(lots.reduce((a, p) => a + p.entryPrice * p.qty, 0) / qty);
  const price = acct.prices[code];
  let nearestLiq: number | null = null;
  for (const p of lots) {
    const liq = liquidationPrice(p);
    if (!Number.isFinite(liq) || liq <= 0) continue;
    if (nearestLiq === null || Math.abs(liq - price) < Math.abs(nearestLiq - price)) nearestLiq = liq;
  }
  return { qty, margin, avgEntry, nearestLiq };
}

export interface TickTradingResult {
  liquidated: string[]; // 被强平的股票代码（可能同一只股多笔）
  interest: number;
}

/**
 * 每跳结算：先收杠杆利息（>20 倍），再逐笔检查强平（费用照收）。
 * 强平即按现价平仓（closePosition 同等逻辑），亏损计入 cumulativeLoss。
 */
export function tickTrading(acct: ExchangeAccount): TickTradingResult {
  let interest = 0;
  for (const pos of acct.positions) {
    if (pos.leverage > LEVERAGE_INTEREST_THRESHOLD) {
      const notional = pos.qty * (acct.prices[pos.code] ?? pos.entryPrice);
      const fee = round2(notional * (pos.leverage - LEVERAGE_INTEREST_THRESHOLD) * LEVERAGE_INTEREST_RATE);
      interest = round2(interest + fee);
      acct.cash = round2(acct.cash - fee); // 可扣成负数
    }
  }
  const liquidated: string[] = [];
  // 逐笔判定；先收集 id 再平，避免遍历中改动数组
  for (const pos of [...acct.positions]) {
    const price = acct.prices[pos.code];
    const liq = liquidationPrice(pos);
    const hit = pos.side === 'long' ? price <= liq : price >= liq;
    if (hit) {
      closePosition(acct, pos.id, true); // 强平属强制结算（绕过冻结门禁）
      liquidated.push(pos.code);
    }
  }
  return { liquidated, interest };
}
