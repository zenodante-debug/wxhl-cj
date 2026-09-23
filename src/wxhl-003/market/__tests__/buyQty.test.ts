import { describe, expect, it } from 'vitest';
import { buyTotals, buyerFeeFor, clampQty } from '../buyQty';

// ================================================================
// 自由市场 · 部分购买的数量与金额纯逻辑
//
// 规则（2026-09-23 定稿）：
// - 详情弹层打开时数量默认 1；所有挂单都允许部分购买
// - 购买手续费 = **本次成交额** 10% 向上取整（沿用旧规则，不改）
//   → 同一个挂单分多次买，总手续费高于一次买完（每次都要取整），这是规则的自然结果
// ================================================================

describe('clampQty · 数量夹取到 [1, 挂单剩余]', () => {
  it('正常范围内原样返回', () => {
    expect(clampQty(30, 100)).toBe(30);
  });

  it('下界：0 与负数都夹到 1（不允许买 0 件）', () => {
    expect(clampQty(0, 100)).toBe(1);
    expect(clampQty(-5, 100)).toBe(1);
  });

  it('上界：超过剩余就夹到剩余', () => {
    expect(clampQty(999, 100)).toBe(100);
    expect(clampQty(101, 100)).toBe(100);
  });

  it('恰好等于剩余 → 原样', () => {
    expect(clampQty(100, 100)).toBe(100);
  });

  it('剩余为 1 时只能买 1（装备类常见）', () => {
    expect(clampQty(1, 1)).toBe(1);
    expect(clampQty(50, 1)).toBe(1);
  });

  it('小数向下取整（数量必须是整数件）', () => {
    expect(clampQty(30.9, 100)).toBe(30);
  });

  it('数字字符串照常接受（输入框给的就是字符串）', () => {
    expect(clampQty('30' as unknown as number, 100)).toBe(30);
  });

  it('真正非数字 → 回落到 1，不产生 NaN 价格', () => {
    expect(clampQty(NaN, 100)).toBe(1);
    expect(clampQty('abc' as unknown as number, 100)).toBe(1);
    expect(clampQty(undefined as unknown as number, 100)).toBe(1);
  });
});

describe('buyerFeeFor · 购买手续费 = 成交额 10% 向上取整', () => {
  it('整十金额', () => {
    expect(buyerFeeFor(100)).toBe(10);
  });

  it('有零头就向上取整（不是四舍五入，也不是舍去）', () => {
    expect(buyerFeeFor(101)).toBe(11);
    expect(buyerFeeFor(15)).toBe(2);
    expect(buyerFeeFor(1)).toBe(1);
  });

  it('0 成交额 → 0 手续费', () => {
    expect(buyerFeeFor(0)).toBe(0);
  });
});

describe('buyTotals · 按数量算总价 / 手续费 / 实付', () => {
  it('单价 5 × 30 = 150，手续费 15，实付 165', () => {
    expect(buyTotals(5, 30)).toEqual({ total: 150, fee: 15, pay: 165 });
  });

  it('取整发生在手续费上：单价 5 × 3 = 15 → 手续费 2，实付 17', () => {
    expect(buyTotals(5, 3)).toEqual({ total: 15, fee: 2, pay: 17 });
  });

  it('拆买永远不会更便宜：有余数时更贵（每次成交都各自向上取整）', () => {
    // 单价 5 × 25 = 125 → 一次买完手续费 ceil(12.5) = 13
    expect(buyTotals(5, 25).fee).toBe(13);
    // 拆成 5 次各买 5 件：每次 25 → ceil(2.5) = 3，共 15
    const 分五次 = Array.from({ length: 5 }, () => buyTotals(5, 5).fee).reduce((a, b) => a + b, 0);
    expect(分五次).toBe(15);
    expect(分五次).toBeGreaterThan(buyTotals(5, 25).fee);
  });

  it('成交额是 10 的整数倍时，拆买与一次买完手续费相同', () => {
    expect(buyTotals(10, 20).fee).toBe(20); // 200 → 20
    const 分四次 = Array.from({ length: 4 }, () => buyTotals(10, 5).fee).reduce((a, b) => a + b, 0); // 每次 50 → 5
    expect(分四次).toBe(20);
  });

  it('单价 1 × 3 = 3 → 手续费 1（向上取整放大），三件就要多付 1 UP', () => {
    expect(buyTotals(1, 3)).toEqual({ total: 3, fee: 1, pay: 4 });
  });
});
