// ================================================================
// 回廊交易所 · 交易引擎：开平仓、费用、净值、强平、杠杆利息。
// 纯函数，不碰酒馆运行时。
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
 * 下单预览：与 openPosition 同算式但不动账本，供界面显示"这单要花多少"。
 * 参数非法时同样抛错（界面据此禁用按钮）。
 */
export function tradePreview(
  acct: ExchangeAccount,
  code: string,
  side: Side,
  qty: number,
  leverage: number,
): OpenResult & { total: number } {
  stockOf(code);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('数量必须是正整数');
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > 100) throw new Error('杠杆必须是 1–100 的整数');
  const price = acct.prices[code];
  const notional = round2(qty * price);
  const margin = round2(notional / leverage);
  if (margin < MIN_MARGIN) throw new Error(`保证金 ${margin} 低于最低保证金 ${MIN_MARGIN}`);
  const fee = commission(notional, margin);
  const stamp = side === 'short' ? stampTax(notional, margin) : 0;
  return { notional, margin, fee, stamp, total: round2(margin + fee + stamp) };
}

/**
 * 开仓。抛出 Error 的情形（响亮失败）：账户冻结、参数非法、现金不足、已有同股仓位、保证金过低。
 * 印花税：仅开空收（卖出方）。
 */
export function openPosition(acct: ExchangeAccount, code: string, side: Side, qty: number, leverage: number): OpenResult {
  if (acct.frozen) throw new Error('账户冻结中（破产欠款未清），禁止开仓');
  const r = tradePreview(acct, code, side, qty, leverage); // 内含最低保证金校验
  if (acct.positions[code]) throw new Error('已有该股仓位，请先平仓');

  const total = r.total;
  if (acct.cash < total) throw new Error(`现金不足：需要 ${total}，只有 ${round2(acct.cash)}`);

  acct.cash = round2(acct.cash - total);
  acct.positions[code] = { side, qty, entryPrice: acct.prices[code], leverage, margin: r.margin };
  return { notional: r.notional, margin: r.margin, fee: r.fee, stamp: r.stamp };
}

export interface CloseResult {
  pnl: number;
  fee: number;
  stamp: number;
  returned: number; // 实际回到现金的金额
}

/**
 * 平仓。平多收印花税；平空不收。已实现亏损累计进 cumulativeLoss。
 * 冻结账户禁止平仓（spec §7 只可读）；force=true 供强平/破产清算等强制结算绕过门禁。
 */
export function closePosition(acct: ExchangeAccount, code: string, force = false): CloseResult {
  if (acct.frozen && !force) throw new Error('账户冻结中，禁止平仓');
  const pos = acct.positions[code];
  if (!pos) throw new Error('没有该股仓位: ' + code);
  const price = acct.prices[code];
  const notional = round2(pos.qty * price);
  const pnl = positionPnl(pos, price);
  const fee = commission(notional, pos.margin);
  const stamp = pos.side === 'long' ? stampTax(notional, pos.margin) : 0;
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
      closePosition(acct, code, true); // 强平属强制结算（绕过冻结门禁）；佣金印花税照收
      liquidated.push(code);
    }
  }
  return { liquidated, interest };
}
