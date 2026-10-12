// ================================================================
// 回廊交易所 · 遗产税（spec §9）：超额累进 + 过户费；现金不足转 debt（不豁免）。
// ================================================================
import { round2, type ExchangeAccount } from './types';
import { netAssets } from './trading';

const BRACKETS: [number, number][] = [
  [100, 0.1],
  [500, 0.3],
  [2000, 0.5],
  [Infinity, 0.7],
];

export function inheritanceTax(estate: number): number {
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of BRACKETS) {
    if (estate <= prev) break;
    tax += (Math.min(estate, cap) - prev) * rate;
    prev = cap;
  }
  return round2(tax);
}

export function transferFee(estate: number): number {
  return round2(Math.max(estate * 0.01, 5));
}

/** 遗产估值 = 净资产（现金+持仓净值），下限 0，不计 debt */
export function estateValue(acct: ExchangeAccount): number {
  return Math.max(0, netAssets(acct));
}

/**
 * 结算遗产税：死亡标记的账户开 app 时调用。
 * 现金足够直接扣；不足则现金清零、差额转 debt 并冻结（还清解冻）。
 * 遗产税不算交易亏损，不计入破产线。
 */
export function settleInheritance(acct: ExchangeAccount): { tax: number; fee: number } {
  const estate = estateValue(acct);
  const tax = inheritanceTax(estate);
  const fee = transferFee(estate);
  const total = round2(tax + fee);
  if (acct.cash >= total) {
    acct.cash = round2(acct.cash - total);
  } else {
    const shortfall = round2(total - acct.cash);
    acct.cash = 0;
    acct.debt = round2(acct.debt + shortfall);
    acct.frozen = true;
    if (acct.loanState === 'none') acct.loanState = 'delinquent';
  }
  acct.deathMarked = false;
  return { tax, fee };
}
