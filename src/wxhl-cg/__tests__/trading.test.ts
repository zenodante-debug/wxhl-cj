import { describe, expect, it } from 'vitest';
import { createAccount, type ExchangeAccount } from '../engine/types';
import {
  closePosition,
  commission,
  netAssets,
  openPosition,
  positionEquity,
  positionPnl,
  sideSummary,
  stampTax,
  tradePreview,
} from '../engine/trading';

function withCash(v: number) {
  const a = createAccount();
  a.cash = v;
  return a;
}
/** 取某只股某个方向的第一笔（测试用） */
function lot(a: ExchangeAccount, code: string, side: 'long' | 'short' = 'long') {
  return a.positions.find(p => p.code === code && p.side === side);
}

describe('commission', () => {
  it('成交额 1%，上限保证金 10%，下限 1', () => {
    expect(commission(1000, 100)).toBe(10);
    expect(commission(100000, 1000)).toBe(100);
    expect(commission(500, 500)).toBe(5);
    expect(commission(10, 100)).toBe(1);
  });
});

describe('stampTax', () => {
  it('成交额 0.1%，上限保证金 1%', () => {
    expect(stampTax(1000, 10000)).toBe(1);
    expect(stampTax(100000, 1000)).toBe(10);
  });
});

describe('tradePreview（金额 = 保证金）', () => {
  it('金额 40 × 5 倍 @100 → 名义 200、2 股、共扣 42', () => {
    const a = withCash(10000);
    const p = tradePreview(a, 'TGJ', 'long', 40, 5);
    expect(p.qty).toBe(2);
    expect(p.notional).toBe(200);
    expect(p.margin).toBe(40);
    expect(p.fee).toBe(2);
    expect(p.stamp).toBe(0);
    expect(p.total).toBe(42);
  });
  it('股数向下取整：金额 55 × 5 倍 @100 → 2 股（实际保证金 40，不超输入）', () => {
    const a = withCash(10000);
    const p = tradePreview(a, 'TGJ', 'long', 55, 5);
    expect(p.qty).toBe(2);
    expect(p.margin).toBe(40);
  });
  it('做空含印花税，且不动账本', () => {
    const a = withCash(10000);
    const p = tradePreview(a, 'TGJ', 'short', 40, 5);
    expect(p.stamp).toBeCloseTo(0.2, 6);
    expect(a.cash).toBe(10000);
    expect(a.positions).toEqual([]);
  });
  it('金额太小（买不到 1 股）直接拒绝', () => {
    const a = withCash(10000);
    expect(() => tradePreview(a, 'TGJ', 'long', 1, 1)).toThrow(/金额太小/);
  });
  it('保证金低于 5 拒绝', () => {
    const a = withCash(10000);
    expect(() => tradePreview(a, 'TGJ', 'long', 4, 100)).toThrow(/最低保证金/);
  });
  it('预览的 total 与实际开仓扣款一致', () => {
    const a = withCash(10000);
    const p = tradePreview(a, 'TGJ', 'long', 40, 5);
    const cash0 = a.cash;
    openPosition(a, 'TGJ', 'long', 40, 5);
    expect(cash0 - a.cash).toBe(p.total);
  });
});

describe('openPosition', () => {
  it('扣保证金+佣金，记录一笔', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 40, 5);
    expect(lot(a, 'TGJ')).toMatchObject({ side: 'long', qty: 2, entryPrice: 100, leverage: 5, margin: 40 });
    expect(a.cash).toBe(958);
  });
  it('同一只股可多笔，也可多空对冲', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 40, 5);
    openPosition(a, 'TGJ', 'long', 40, 5);
    openPosition(a, 'TGJ', 'short', 40, 5);
    expect(a.positions).toHaveLength(3);
    expect(a.positions.filter(p => p.side === 'long')).toHaveLength(2);
    expect(a.positions.filter(p => p.side === 'short')).toHaveLength(1);
  });
  it('冻结账户禁止开仓', () => {
    const a = withCash(1000);
    a.frozen = true;
    expect(() => openPosition(a, 'TGJ', 'long', 40, 1)).toThrow(/冻结/);
  });
  it('现金不足拒绝且不动账本', () => {
    const a = withCash(10);
    expect(() => openPosition(a, 'TGJ', 'long', 200, 1)).toThrow(/不足/); // 2 股需 202
    expect(a.positions).toEqual([]);
    expect(a.cash).toBe(10);
  });
  it('杠杆非法拒绝', () => {
    const a = withCash(10000);
    expect(() => openPosition(a, 'TGJ', 'long', 40, 0)).toThrow();
    expect(() => openPosition(a, 'TGJ', 'long', 40, 101)).toThrow();
  });
});

describe('closePosition（按 id）', () => {
  it('平多盈利：退回保证金+盈利，收佣金+印花税', () => {
    const a = withCash(1000);
    const r0 = openPosition(a, 'TGJ', 'long', 40, 5); // cash 958
    a.prices['TGJ'] = 120; // 2 股 × 20 = 盈利 40
    const r = closePosition(a, r0.id);
    expect(r.pnl).toBe(40);
    // 平仓佣金 min(240×1%,40×10%)=2.4；印花税 240×0.1%=0.24
    expect(a.cash).toBeCloseTo(958 + 40 + 40 - 2.4 - 0.24, 6);
    expect(a.positions).toEqual([]);
  });
  it('只平指定那一笔，同股其他笔不受影响', () => {
    const a = withCash(1000);
    const r0 = openPosition(a, 'TGJ', 'long', 40, 5);
    const r1 = openPosition(a, 'TGJ', 'long', 40, 5);
    closePosition(a, r0.id);
    expect(a.positions).toHaveLength(1);
    expect(a.positions[0].id).toBe(r1.id);
  });
  it('亏损计入 cumulativeLoss', () => {
    const a = withCash(2000);
    const r0 = openPosition(a, 'TGJ', 'long', 100, 1); // 1 股 @100
    a.prices['TGJ'] = 50;
    closePosition(a, r0.id);
    expect(a.cumulativeLoss).toBe(50);
  });
  it('冻结账户禁止平仓（force 供强平/清算绕过）', () => {
    const a = withCash(1000);
    const r0 = openPosition(a, 'TGJ', 'long', 40, 5);
    a.frozen = true;
    expect(() => closePosition(a, r0.id)).toThrow(/冻结/);
    expect(a.positions).toHaveLength(1);
    closePosition(a, r0.id, true);
    expect(a.positions).toEqual([]);
  });
});

describe('sideSummary（多空汇总，供图表与距强平）', () => {
  it('同向多笔给出总股数/总保证金/加权均价', () => {
    const a = withCash(2000);
    openPosition(a, 'TGJ', 'long', 40, 5); // 2 股 @100
    openPosition(a, 'TGJ', 'long', 80, 5); // 4 股 @100
    const s = sideSummary(a, 'TGJ', 'long')!;
    expect(s.qty).toBe(6);
    expect(s.margin).toBe(120);
    expect(s.avgEntry).toBe(100);
  });
  it('多空各算各的', () => {
    const a = withCash(2000);
    openPosition(a, 'TGJ', 'long', 40, 5);
    openPosition(a, 'TGJ', 'short', 40, 5);
    expect(sideSummary(a, 'TGJ', 'long')!.qty).toBe(2);
    expect(sideSummary(a, 'TGJ', 'short')!.qty).toBe(2);
    expect(sideSummary(a, 'TGJ', 'short')!.nearestLiq).toBeGreaterThan(100);
  });
});

describe('positionPnl / positionEquity / netAssets', () => {
  it('做多盈亏与净值', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 40, 5);
    a.prices['TGJ'] = 110;
    const p = lot(a, 'TGJ')!;
    expect(positionPnl(p, 110)).toBe(20);
    expect(positionEquity(p, 110)).toBe(60);
    expect(netAssets(a)).toBeCloseTo(958 + 60, 6);
  });
  it('做空盈亏方向相反', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'short', 40, 5);
    a.prices['TGJ'] = 110;
    expect(positionPnl(lot(a, 'TGJ', 'short')!, 110)).toBe(-20);
  });
  it('净资产扣掉欠款：破产后背债时净值为负', () => {
    const a = withCash(0);
    a.debt = 200;
    expect(netAssets(a)).toBe(-200);
  });
});
