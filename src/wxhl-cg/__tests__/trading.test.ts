import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import {
  closePosition,
  commission,
  netAssets,
  openPosition,
  positionEquity,
  positionPnl,
  stampTax,
  tradePreview,
} from '../engine/trading';

function withCash(v: number) {
  const a = createAccount();
  a.cash = v;
  return a;
}

describe('commission', () => {
  it('成交额 1%，上限保证金 10%，下限 1', () => {
    expect(commission(1000, 100)).toBe(10); // 1% = 10，上限 10 → 10
    expect(commission(100000, 1000)).toBe(100); // 1% = 1000，上限 100 → 100
    expect(commission(500, 500)).toBe(5);
    expect(commission(10, 100)).toBe(1); // 1% = 0.1 → 下限 1
  });
});

describe('stampTax', () => {
  it('成交额 0.1%，上限保证金 1%', () => {
    expect(stampTax(1000, 10000)).toBe(1); // 0.1% = 1
    expect(stampTax(100000, 1000)).toBe(10); // 0.1% = 100 → 上限 10
  });
});

describe('tradePreview', () => {
  it('与实际开仓扣款一致（做多）', () => {
    const a = withCash(10000);
    const p = tradePreview(a, 'TGJ', 'long', 2, 5);
    const cash0 = a.cash;
    openPosition(a, 'TGJ', 'long', 2, 5);
    expect(cash0 - a.cash).toBe(p.total);
    expect(p.margin).toBe(40);
    expect(p.stamp).toBe(0);
  });
  it('做空含印花税，且不动账本', () => {
    const a = withCash(10000);
    const p = tradePreview(a, 'TGJ', 'short', 2, 5);
    expect(p.stamp).toBeCloseTo(0.2, 6);
    expect(a.cash).toBe(10000);
    expect(a.positions['TGJ']).toBeUndefined();
  });
});

describe('openPosition（做多）', () => {
  it('扣保证金+佣金，记录仓位', () => {
    const a = withCash(1000); // TGJ 基准价 100
    openPosition(a, 'TGJ', 'long', 2, 5); // 名义 200，保证金 40，佣金 2
    expect(a.positions['TGJ']).toMatchObject({ side: 'long', qty: 2, entryPrice: 100, leverage: 5, margin: 40 });
    expect(a.cash).toBe(1000 - 40 - 2);
  });
  it('开空额外收印花税 0.1%', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'short', 2, 5); // 佣金 2 + 印花税 0.2
    expect(a.cash).toBeCloseTo(1000 - 40 - 2 - 0.2, 6);
  });
  it('现金不足拒绝且不动账本', () => {
    const a = withCash(10);
    expect(() => openPosition(a, 'TGJ', 'long', 2, 1)).toThrow(/不足/);
    expect(a.positions['TGJ']).toBeUndefined();
    expect(a.cash).toBe(10);
  });
  it('冻结账户禁止开仓', () => {
    const a = withCash(1000);
    a.frozen = true;
    expect(() => openPosition(a, 'TGJ', 'long', 1, 1)).toThrow(/冻结/);
  });
  it('杠杆/数量非法拒绝', () => {
    const a = withCash(10000);
    expect(() => openPosition(a, 'TGJ', 'long', 0, 1)).toThrow();
    expect(() => openPosition(a, 'TGJ', 'long', 1, 0)).toThrow();
    expect(() => openPosition(a, 'TGJ', 'long', 1, 101)).toThrow();
  });
  it('最低保证金 5：小单拒绝', () => {
    const a = withCash(10000);
    // 名义 100 / 杠杆 100 = 保证金 1 < 5
    expect(() => openPosition(a, 'TGJ', 'long', 1, 100)).toThrow(/最低保证金/);
    expect(a.positions['TGJ']).toBeUndefined();
  });
});

describe('closePosition（平多）', () => {
  it('盈利：退回保证金+盈利，收佣金+印花税', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 2, 5); // 保证金 40 佣金 2 → cash 958
    a.prices['TGJ'] = 120; // 盈利 40
    const r = closePosition(a, 'TGJ');
    expect(r.pnl).toBe(40);
    // 平仓佣金 = min(240×1%, 40×10%)=2.4；印花税 240×0.1%=0.24
    expect(a.cash).toBeCloseTo(958 + 40 + 40 - 2.4 - 0.24, 6);
    expect(a.positions['TGJ']).toBeUndefined();
  });
  it('亏损计入 cumulativeLoss', () => {
    const a = withCash(1100);
    openPosition(a, 'TGJ', 'long', 10, 1); // 名义 1000 保证金 1000 佣金 10 → cash 90
    a.prices['TGJ'] = 50; // 亏 500
    closePosition(a, 'TGJ');
    expect(a.cumulativeLoss).toBe(500);
  });
});

describe('positionPnl / positionEquity / netAssets', () => {
  it('做多盈亏与净值', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 2, 5);
    a.prices['TGJ'] = 110;
    const p = a.positions['TGJ'];
    expect(positionPnl(p, 110)).toBe(20);
    expect(positionEquity(p, 110)).toBe(60); // 保证金 40 + 20
    expect(netAssets(a)).toBeCloseTo(958 + 60, 6);
  });
  it('做空盈亏方向相反', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'short', 2, 5);
    a.prices['TGJ'] = 110;
    expect(positionPnl(a.positions['TGJ'], 110)).toBe(-20);
  });
});
