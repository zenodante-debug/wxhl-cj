// ================================================================
// 回廊交易所 · 借贷/失信/高利贷状态机（spec §7）。内置借贷窗口，一次一笔。
// ================================================================
import { round2, type ExchangeAccount } from './types';
import { netAssets } from './trading';

export const LOAN_TERM_TICKS = 100;
export const HIGH_INTEREST_AMOUNT = 500;
export const HIGH_INTEREST_REPAY_MULT = 2.5;

export function loanOffer(acct: ExchangeAccount): { maxAmount: number; rate: number } {
  const net = netAssets(acct);
  const rate = net < 1000 ? 0.3 : net < 5000 ? 0.2 : 0.12;
  return { maxAmount: Math.max(0, round2(Math.min(net * 0.5, 5000))), rate };
}

export function takeLoan(acct: ExchangeAccount, amount: number): void {
  if (acct.frozen) throw new Error('账户冻结中，禁止借款');
  if (acct.loan) throw new Error('上一笔未还清，不能再借');
  const offer = loanOffer(acct);
  if (!Number.isInteger(amount) || amount <= 0 || amount > offer.maxAmount) {
    throw new Error(`借款额度 1–${offer.maxAmount}`);
  }
  acct.loan = { principal: amount, rate: offer.rate, dueTick: acct.tick + LOAN_TERM_TICKS, highInterest: false, accrued: 0, ticksHeld: 0 };
  acct.loanState = 'normal';
  acct.cash = round2(acct.cash + amount);
}

/** 还款：正常借款还 本金×(1+rate)；高利贷还 本金×2.5+累计利息。 */
export function repayLoan(acct: ExchangeAccount): void {
  const loan = acct.loan;
  if (!loan) throw new Error('没有待还借款');
  const owe = loan.highInterest
    ? round2(loan.principal * HIGH_INTEREST_REPAY_MULT + loan.accrued)
    : round2(loan.principal * (1 + loan.rate));
  if (acct.cash < owe) throw new Error(`现金不足：需还 ${owe}，只有 ${round2(acct.cash)}`);
  acct.cash = round2(acct.cash - owe);
  acct.loan = null;
  if (acct.loanState === 'normal') acct.loanState = 'none';
  // 失信状态不因还清高利贷自动解除——失信由 debt 是否清零决定
}

/** 偿还催收债务；清零后解除失信与冻结。 */
export function repayDebt(acct: ExchangeAccount, amount: number): void {
  if (acct.debt <= 0) throw new Error('没有待还债务');
  const pay = Math.min(round2(amount), acct.debt);
  if (!Number.isFinite(pay) || pay <= 0) throw new Error('还款金额必须为正');
  if (acct.cash < pay) throw new Error(`现金不足：只有 ${round2(acct.cash)}`);
  acct.cash = round2(acct.cash - pay);
  acct.debt = round2(acct.debt - pay);
  if (acct.debt <= 0) {
    acct.debt = 0;
    acct.loanState = 'none';
    acct.frozen = false;
  }
}

/** 仅失信状态可借的救命钱（spec §7）。 */
export function takeHighInterestLoan(acct: ExchangeAccount): void {
  if (acct.loanState !== 'delinquent') throw new Error('只有失信人员才能借高利贷');
  if (acct.loan) throw new Error('上一笔未还清，不能再借');
  acct.loan = { principal: HIGH_INTEREST_AMOUNT, rate: HIGH_INTEREST_REPAY_MULT, dueTick: Infinity, highInterest: true, accrued: 0, ticksHeld: 0 };
  acct.cash = round2(acct.cash + HIGH_INTEREST_AMOUNT);
}

/**
 * 每跳推进：高利贷利息递增（第 n 跳 +10×n，可扣成负数）；
 * 正常借款到期未还 → 欠款(本金×(1+rate))转 debt、失信冻结。
 */
export function tickLoan(acct: ExchangeAccount): void {
  const loan = acct.loan;
  if (!loan) return;
  if (loan.highInterest) {
    loan.ticksHeld++;
    const interest = 10 * loan.ticksHeld;
    loan.accrued = round2(loan.accrued + interest);
    acct.cash = round2(acct.cash - interest); // 允许负数
    return;
  }
  if (acct.tick >= loan.dueTick) {
    acct.debt = round2(acct.debt + round2(loan.principal * (1 + loan.rate)));
    acct.loan = null;
    acct.loanState = 'delinquent';
    acct.frozen = true;
  }
}
