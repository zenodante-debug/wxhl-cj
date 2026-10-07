import { describe, expect, it } from 'vitest';
import { 判定评价等级, 评价依据文本 } from '../settlementRules';

// 2026-09-25：评价从「AI 判」改为「脚本按成就星数之和判」（用户定稿，濒死条件取消）
describe('判定评价等级 · 按成就星数之和（脚本判定）', () => {
  it('主线未完成 → F（抹杀，不进入结算）', () => {
    expect(判定评价等级(15, 3, false)).toBe('F');
    expect(判定评价等级(0, 0, false)).toBe('F');
  });

  it('星和 ≥15 → S（1~5 星全收）', () => {
    expect(判定评价等级(15, 0, true)).toBe('S');
    expect(判定评价等级(21, 0, true)).toBe('S');
  });

  it('星和 ≥10 → A', () => {
    expect(判定评价等级(10, 0, true)).toBe('A');
    expect(判定评价等级(14, 0, true)).toBe('A');
  });

  it('星和 ≥5 → B', () => {
    expect(判定评价等级(5, 0, true)).toBe('B');
    expect(判定评价等级(9, 0, true)).toBe('B');
  });

  it('星和 <5：完成支线 ≥1 → C；否则（仅主线）→ D', () => {
    expect(判定评价等级(0, 1, true)).toBe('C');
    expect(判定评价等级(4, 3, true)).toBe('C');
    expect(判定评价等级(0, 0, true)).toBe('D');
  });

  it('濒死条件取消：星和够就升级，不再看濒死', () => {
    // 同一组输入不再有濒死维度 —— 只由星和/支线决定
    expect(判定评价等级(15, 0, true)).toBe('S');
  });
});

describe('评价依据文本 · 与判定同口径', () => {
  it('各档都给得出可读依据', () => {
    expect(评价依据文本(0, 0, false)).toContain('主线任务未完成');
    expect(评价依据文本(15, 0, true)).toContain('15');
    expect(评价依据文本(10, 0, true)).toContain('A');
    expect(评价依据文本(5, 0, true)).toContain('B');
    expect(评价依据文本(0, 2, true)).toContain('支线');
    expect(评价依据文本(0, 0, true)).toContain('仅主线');
  });
});
