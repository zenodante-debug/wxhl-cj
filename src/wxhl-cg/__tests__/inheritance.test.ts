import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { estateValue, inheritanceTax, settleInheritance, transferFee } from '../engine/inheritance';

describe('inheritanceTax 超额累进', () => {
  it.each([
    [50, 5], // 50×10%
    [100, 10],
    [200, 10 + 30], // 100×10% + 100×30%
    [500, 10 + 120],
    [1000, 10 + 120 + 250], // +500×50%
    [2000, 10 + 120 + 750],
    [3000, 10 + 120 + 750 + 700], // +1000×70%
  ])('遗产 %i → 税 %i', (estate, tax) => {
    expect(inheritanceTax(estate)).toBe(tax);
  });
});

describe('transferFee', () => {
  it('1%，最低 5', () => {
    expect(transferFee(100)).toBe(5); // 1 → 兜底 5
    expect(transferFee(1000)).toBe(10);
  });
});

describe('settleInheritance', () => {
  it('现金足够：扣缴税费，解除死亡标记', () => {
    const a = createAccount();
    a.cash = 1000;
    a.deathMarked = true;
    const r = settleInheritance(a);
    expect(r.tax).toBe(380); // inheritanceTax(1000) = 10+120+250
    expect(r.fee).toBe(10);
    expect(a.cash).toBe(610);
    expect(a.deathMarked).toBe(false);
    expect(a.frozen).toBe(false);
  });
  it('现金不足 → 差额转 debt 并冻结，不豁免', () => {
    // estate 含持仓净值：现金 500 + 持仓 10000 → 税 6830 费 105 → 共 6935 > 500
    const c = createAccount();
    c.cash = 500;
    c.deathMarked = true;
    c.positions = { TGJ: { side: 'long', qty: 100, entryPrice: 100, leverage: 1, margin: 10000 } };
    const rc = settleInheritance(c);
    expect(c.cash).toBe(0);
    expect(c.debt).toBe(rc.tax + rc.fee - 500);
    expect(c.frozen).toBe(true);
    expect(c.deathMarked).toBe(false); // 标记已结算，欠税走 debt
  });
  it('estateValue 含持仓净值', () => {
    const a = createAccount();
    a.cash = 100;
    a.positions = { TGJ: { side: 'long', qty: 1, entryPrice: 100, leverage: 1, margin: 100 } };
    expect(estateValue(a)).toBe(200);
  });
});
