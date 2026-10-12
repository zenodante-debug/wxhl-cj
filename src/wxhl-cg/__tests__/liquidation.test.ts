import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { closePosition, liquidationPrice, openPosition, tickTrading } from '../engine/trading';

function withCash(v: number) {
  const a = createAccount();
  a.cash = v;
  return a;
}

describe('liquidationPrice', () => {
  it('做多强平价 = round2(entry×(1−0.95/L))', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 1, 10); // entry 100
    expect(liquidationPrice(a.positions['TGJ'])).toBeCloseTo(90.5, 2);
  });
  it('做空强平价 = round2(entry×(1+0.95/L))', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'short', 1, 10);
    expect(liquidationPrice(a.positions['TGJ'])).toBeCloseTo(109.5, 2);
  });
  it('1 倍杠杆永不强平（返回 0/Infinity）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 1, 1);
    expect(liquidationPrice(a.positions['TGJ'])).toBe(0);
    openPosition(a, 'FM', 'short', 1, 1);
    expect(liquidationPrice(a.positions['FM'])).toBe(Infinity);
  });
});

describe('tickTrading', () => {
  it('跌破强平价立即平仓（费用照收），返回强平列表', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10); // 名义 1000 保证金 100，强平价 90.5
    a.prices['TGJ'] = 90; // < 90.5 强平价
    const r = tickTrading(a);
    expect(r.liquidated).toEqual(['TGJ']);
    expect(a.positions['TGJ']).toBeUndefined();
    expect(a.cumulativeLoss).toBeGreaterThan(0);
  });
  it('未破线不动', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10);
    a.prices['TGJ'] = 96;
    expect(tickTrading(a).liquidated).toEqual([]);
    expect(a.positions['TGJ']).toBeDefined();
  });
  it('杠杆 ≤20 不收利息；>20 每跳收 (L−20)×0.01%×名义', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 20); // 名义 1000 保证金 50，不收费息档
    openPosition(a, 'FM', 'long', 10, 50); // FM 基准价 40 → 名义 400 保证金 8
    const cash0 = a.cash;
    const r = tickTrading(a);
    // 只有 FM 收息：400×30×0.0001 = 1.2
    expect(r.interest).toBeCloseTo(1.2, 6);
    expect(a.cash).toBeCloseTo(cash0 - 1.2, 6);
  });
  it('重开 app 第一跳按现价判定强平（关闭期间不豁免）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10);
    // 模拟"关闭期间价格被改到破线"（重开后第一跳）
    a.prices['TGJ'] = 90;
    expect(tickTrading(a).liquidated).toEqual(['TGJ']);
  });
});

describe('终审 I1：冻结门禁', () => {
  it('冻结账户禁止平仓（spec §7 只可读），但强平引擎不受限', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10);
    a.frozen = true;
    expect(() => closePosition(a, 'TGJ')).toThrow(/冻结/);
    expect(a.positions['TGJ']).toBeDefined();
    // 强平属强制结算，冻结照样执行
    a.prices['TGJ'] = 80;
    expect(tickTrading(a).liquidated).toEqual(['TGJ']);
  });
});
