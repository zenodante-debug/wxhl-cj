import { describe, expect, it } from 'vitest';
import { createAccount, type ExchangeAccount } from '../engine/types';
import { closePosition, liquidationPrice, openPosition, tickTrading } from '../engine/trading';

function withCash(v: number) {
  const a = createAccount();
  a.cash = v;
  return a;
}
function lot(a: ExchangeAccount, code: string, side: 'long' | 'short' = 'long') {
  return a.positions.find(p => p.code === code && p.side === side);
}

describe('liquidationPrice', () => {
  it('做多强平价 = round2(entry×(1−0.95/L))', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 10); // 4 股 @100
    expect(liquidationPrice(lot(a, 'TGJ')!)).toBeCloseTo(90.5, 2);
  });
  it('做空强平价 = round2(entry×(1+0.95/L))', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'short', 40, 10);
    expect(liquidationPrice(lot(a, 'TGJ', 'short')!)).toBeCloseTo(109.5, 2);
  });
  it('1 倍杠杆永不强平（返回 0/Infinity）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 100, 1);
    expect(liquidationPrice(lot(a, 'TGJ')!)).toBe(0);
    openPosition(a, 'FM', 'short', 100, 1);
    expect(liquidationPrice(lot(a, 'FM', 'short')!)).toBe(Infinity);
  });
});

describe('tickTrading', () => {
  it('跌破强平价立即平仓（费用照收），返回强平列表', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 10); // 4 股 @100，保证金 40，强平 90.5
    a.prices['TGJ'] = 90;
    const r = tickTrading(a);
    expect(r.liquidated).toEqual(['TGJ']);
    expect(a.positions).toEqual([]);
    expect(a.cumulativeLoss).toBeGreaterThan(0);
  });
  it('同一只股两笔，只强平破线的那笔（同一价位通常两笔一起）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 10); // 强平 90.5
    openPosition(a, 'TGJ', 'long', 400, 2); // 2 倍，强平 52.5，不会破
    a.prices['TGJ'] = 90;
    const r = tickTrading(a);
    expect(r.liquidated).toEqual(['TGJ']);
    expect(a.positions).toHaveLength(1);
    expect(a.positions[0].leverage).toBe(2);
  });
  it('未破线不动', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 10);
    a.prices['TGJ'] = 96;
    expect(tickTrading(a).liquidated).toEqual([]);
    expect(a.positions).toHaveLength(1);
  });
  it('杠杆 ≤20 不收利息；>20 每跳收 (L−20)×0.01%×名义', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 20); // 8 股 @100，名义 800，不收费息档
    openPosition(a, 'FM', 'long', 40, 50); // 50 股 @40，名义 2000，保证金 40
    const cash0 = a.cash;
    const r = tickTrading(a);
    // 只有 FM 收息：2000×30×0.0001 = 6
    expect(r.interest).toBeCloseTo(6, 6);
    expect(a.cash).toBeCloseTo(cash0 - 6, 6);
  });
  it('重开 app 第一跳按现价判定强平（关闭期间不豁免）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 10);
    a.prices['TGJ'] = 89;
    expect(tickTrading(a).liquidated).toEqual(['TGJ']);
  });
});

describe('冻结门禁', () => {
  it('冻结账户禁止平仓（spec §7 只可读），但强平引擎不受限', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 40, 10);
    a.frozen = true;
    expect(() => closePosition(a, lot(a, 'TGJ')!.id)).toThrow(/冻结/);
    expect(a.positions).toHaveLength(1);
    a.prices['TGJ'] = 80;
    expect(tickTrading(a).liquidated).toEqual(['TGJ']);
  });
});
