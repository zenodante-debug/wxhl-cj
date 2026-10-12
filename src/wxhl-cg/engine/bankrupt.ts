// ================================================================
// 回廊交易所 · 破产线与自动清算判定（纯函数）。
// 照杀跌尖塔：总亏损超过破产线即触发清算变卖（spec §8）。
// ================================================================
import type { ExchangeAccount } from './types';

/** 破产线：累计已实现亏损越过它即清算 */
export const BANKRUPTCY_LINE = 250;

/**
 * 只按**已实现**亏损判定（浮亏不动，否则开仓瞬间就会触发）。
 * 已有未清欠款时不再重复触发，避免每跳都重复清算。
 */
export function shouldGoBankrupt(acct: ExchangeAccount): boolean {
  return acct.cumulativeLoss > BANKRUPTCY_LINE && acct.debt <= 0;
}
