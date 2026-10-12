import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { HIGH_INTEREST_AMOUNT, loanOffer, repayDebt, repayLoan, takeHighInterestLoan, takeLoan, tickLoan } from '../engine/loan';

describe('loanOffer', () => {
  it('额度 = min(净资产×50%, 5000)；利率按净资产分档', () => {
    const a = createAccount();
    a.cash = 400; // <1000 → 30%
    expect(loanOffer(a)).toEqual({ maxAmount: 200, rate: 0.3 });
    a.cash = 2000; // <5000 → 20%
    expect(loanOffer(a)).toEqual({ maxAmount: 1000, rate: 0.2 });
    a.cash = 20000; // ≥5000 → 12%，封顶 5000
    expect(loanOffer(a)).toEqual({ maxAmount: 5000, rate: 0.12 });
  });
});

describe('takeLoan / repayLoan', () => {
  it('一次一笔：有借款时再借拒绝', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000);
    expect(a.cash).toBe(21000);
    expect(a.loan).toMatchObject({ principal: 1000, rate: 0.12, highInterest: false });
    expect(() => takeLoan(a, 500)).toThrow(/未还清/);
  });
  it('冻结时禁止正常借款', () => {
    const a = createAccount();
    a.cash = 20000;
    a.frozen = true;
    expect(() => takeLoan(a, 1000)).toThrow(/冻结/);
  });
  it('还款：本金×(1+利率)，现金不足拒绝', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000);
    a.cash = 1000; // 不够 1120
    expect(() => repayLoan(a)).toThrow(/不足/);
    a.cash = 2000;
    repayLoan(a);
    expect(a.cash).toBe(880);
    expect(a.loan).toBeNull();
    expect(a.loanState).toBe('none');
  });
});

describe('到期失信', () => {
  it('到期未还 → 欠款转 debt、失信冻结、loan 清空', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000); // dueTick = 0+100
    a.tick = 100;
    tickLoan(a);
    expect(a.loan).toBeNull();
    expect(a.loanState).toBe('delinquent');
    expect(a.frozen).toBe(true);
    expect(a.debt).toBe(1120);
  });
  it('repayDebt 还清后解冻', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000);
    a.tick = 100;
    tickLoan(a);
    repayDebt(a, 1120);
    expect(a.debt).toBe(0);
    expect(a.frozen).toBe(false);
    expect(a.loanState).toBe('none');
  });
  it('repayDebt 部分还款：debt 递减、仍冻结', () => {
    const a = createAccount();
    a.debt = 500;
    a.frozen = true;
    a.loanState = 'delinquent';
    a.cash = 200;
    repayDebt(a, 200);
    expect(a.debt).toBe(300);
    expect(a.frozen).toBe(true);
  });
});

describe('高利贷', () => {
  it('仅失信可借；还 2.5 倍+累计利息', () => {
    const a = createAccount();
    a.loanState = 'delinquent';
    a.frozen = true;
    a.cash = 100;
    takeHighInterestLoan(a);
    expect(a.cash).toBe(100 + HIGH_INTEREST_AMOUNT);
    expect(a.loan).toMatchObject({ principal: HIGH_INTEREST_AMOUNT, highInterest: true });
    // 持有 3 跳：利息 10+20+30=60，现金可扣成负数
    a.tick++;
    tickLoan(a);
    a.tick++;
    tickLoan(a);
    a.tick++;
    tickLoan(a);
    expect(a.loan!.accrued).toBe(60);
    const owe = HIGH_INTEREST_AMOUNT * 2.5 + 60;
    a.cash = owe;
    repayLoan(a);
    expect(a.loan).toBeNull();
  });
  it('非失信状态不能借高利贷', () => {
    const a = createAccount();
    expect(() => takeHighInterestLoan(a)).toThrow();
  });
  it('现金扣成负数后，再借/还债一律拒绝（不放行）', () => {
    const a = createAccount();
    a.loanState = 'delinquent';
    a.frozen = true;
    a.debt = 300;
    takeHighInterestLoan(a);
    a.cash = -50; // 利息扣负后的状态
    expect(() => takeLoan(a, 100)).toThrow(); // 冻结拒绝
    expect(() => repayDebt(a, 100)).toThrow(/不足/); // 现金为负不能还债
    a.cash = 100;
    repayDebt(a, 100); // 入金后可以还
    expect(a.debt).toBe(200);
  });
});
