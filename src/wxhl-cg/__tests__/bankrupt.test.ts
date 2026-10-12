import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { BANKRUPTCY_LINE, shouldGoBankrupt } from '../engine/bankrupt';

describe('shouldGoBankrupt（破产线）', () => {
  it('已实现亏损必须"超过"250 才触发', () => {
    const a = createAccount();
    a.cumulativeLoss = BANKRUPTCY_LINE;
    expect(shouldGoBankrupt(a)).toBe(false);
    a.cumulativeLoss = BANKRUPTCY_LINE + 0.01;
    expect(shouldGoBankrupt(a)).toBe(true);
  });
  it('浮亏不算：只有持仓浮亏、已实现为 0 时不触发', () => {
    const a = createAccount();
    a.positions = { TGJ: { side: 'long', qty: 10, entryPrice: 100, leverage: 10, margin: 100 } };
    a.prices['TGJ'] = 50; // 浮亏 500
    expect(a.cumulativeLoss).toBe(0);
    expect(shouldGoBankrupt(a)).toBe(false);
  });
  it('已有未清欠款时不再重复触发（避免每跳重复清算）', () => {
    const a = createAccount();
    a.cumulativeLoss = 300;
    a.debt = 50;
    expect(shouldGoBankrupt(a)).toBe(false);
  });
});
