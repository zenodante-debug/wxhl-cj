/**
 * 自由市场 · 部分购买的数量与金额纯逻辑
 *
 * 规则（2026-09-23 定稿）：
 * - 详情弹层打开时数量默认 1；所有挂单（含装备）都允许部分购买
 * - 购买手续费 = **本次成交额** 10% 向上取整（沿用旧规则，未改）
 *   → 拆成多次买永远不会更便宜：成交额有余数时每次都要向上取整，总手续费更高
 */

/** 购买手续费率 */
export const BUYER_FEE_RATE = 0.1;

/** 详情弹层打开时的默认购买数量 */
export const DEFAULT_QTY = 1;

/**
 * 把购买数量夹到 `[1, 挂单剩余]`。
 *
 * - 数字字符串照常接受（`<input>` 拿到的就是字符串）
 * - 真正的非数字 → 回落 `DEFAULT_QTY`，**绝不返回 NaN**（NaN 会让总价/手续费全变 NaN）
 * - 小数向下取整（数量必须是整数件）
 * - `max <= 0` 时返回 `DEFAULT_QTY`：调用方本就不该给空挂单展示购买入口
 */
export function clampQty(want: number, max: number): number {
  const n = Number(want);
  if (!Number.isFinite(n)) return DEFAULT_QTY;
  const m = Math.floor(Number(max));
  if (!Number.isFinite(m) || m <= 0) return DEFAULT_QTY;
  return Math.min(Math.max(Math.floor(n), 1), m);
}

/** 购买手续费 = 成交额 10% 向上取整 */
export function buyerFeeFor(total: number): number {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.ceil(t * BUYER_FEE_RATE);
}

export interface BuyTotals {
  /** 单价 × 数量 */
  total: number;
  /** 手续费（本次成交额的 10% 向上取整） */
  fee: number;
  /** 实付 = 总价 + 手续费 */
  pay: number;
}

/** 按单价与购买数量算总价 / 手续费 / 实付 */
export function buyTotals(price: number, qty: number): BuyTotals {
  const total = Number(price) * Number(qty);
  const fee = buyerFeeFor(total);
  return { total, fee, pay: total + fee };
}
