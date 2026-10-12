import { describe, expect, it } from 'vitest';
import { assetPrice, computeLiquidation, type LiquidationInput } from '../engine/bankruptcy';

function baseInput(over: Partial<LiquidationInput>): LiquidationInput {
  return {
    positionsProceeds: 0,
    cash: 0,
    bag: {},
    equipment: {},
    skills: {},
    job: null,
    bloodline: null,
    talent: null,
    playerTier: '一阶',
    debt: 100,
    ...over,
  };
}

describe('assetPrice', () => {
  it('品质×阶位²：一阶白色武器 = BASE 中值 45', () => {
    expect(assetPrice('白色', '一阶', '武器')).toBe(45); // (30+60)/2
  });
  it('二阶 = ×4', () => {
    expect(assetPrice('白色', '二阶', '武器')).toBe(180);
  });
  it('品质缺失/不可解析 → 白色兜底', () => {
    expect(assetPrice(undefined, '一阶', '武器')).toBe(45);
    expect(assetPrice('破烂', '一阶', '武器')).toBe(45);
  });
});

describe('computeLiquidation 瀑布顺序', () => {
  it('现金就够 → 不动任何资产', () => {
    const r = computeLiquidation(baseInput({ cash: 500 }));
    expect(r.remainingDebt).toBe(0);
    expect(r.removedBag).toEqual([]);
    expect(r.steps.map(s => s.category)).toEqual(['现金']);
  });
  it('背包最便宜先卖，够抵债即停', () => {
    const r = computeLiquidation(
      baseInput({
        cash: 0,
        debt: 50,
        bag: {
          贵装备: { qty: 1, 品质: '金色', 类型: '武器', 阶位: '一阶' }, // 600
          便宜药: { qty: 1, 品质: '白色', 类型: '消耗品', 阶位: '一阶' }, // 45
        },
      }),
    );
    // 45 不够 50 → 再卖贵的 600；总共 645，剩余债务 0，溢出 595 退回现金
    expect(r.removedBag).toEqual(['便宜药', '贵装备']);
    expect(r.remainingDebt).toBe(0);
    expect(r.returnCash).toBe(645 - 50);
  });
  it('背包卖完才动装备，装备卖完才动技能，依此类推', () => {
    const r = computeLiquidation(
      baseInput({
        debt: 100000, // 全都得卖
        bag: { 药: { qty: 2, 品质: '白色', 阶位: '一阶' } }, // 45×2=90
        equipment: { 主武器: { qty: 1, 名称: '蓝剑', 品质: '蓝色', 类型: '武器', 阶位: '一阶' } }, // 150
        skills: { 火球术: { 品质: '白色' } }, // 45×玩家阶位²
        job: { 稀有度: '金色职业' }, // 600
        bloodline: { 品质: '蓝色' }, // 150
        talent: { 品质: '白色' }, // 45
      }),
    );
    const cats = r.steps.map(s => s.category);
    expect(cats.indexOf('背包')).toBeLessThan(cats.indexOf('装备'));
    expect(cats.indexOf('装备')).toBeLessThan(cats.indexOf('通用技能'));
    expect(cats.indexOf('通用技能')).toBeLessThan(cats.indexOf('职业'));
    expect(cats.indexOf('职业')).toBeLessThan(cats.indexOf('血统'));
    expect(cats.indexOf('血统')).toBeLessThan(cats.indexOf('天赋'));
    expect(r.clearJob).toBe(true);
    expect(r.clearBloodline).toBe(true);
    expect(r.clearTalent).toBe(true);
    // 90+150+45+600+150+45 = 1080 << 100000 → 剩余债务继续背
    expect(r.remainingDebt).toBe(100000 - 1080);
  });
  it('职业稀有度解析：金色职业 → 金色', () => {
    const r = computeLiquidation(baseInput({ debt: 600, job: { 稀有度: '金色职业' } }));
    expect(r.steps.find(s => s.category === '职业')?.proceeds).toBe(600);
    expect(r.remainingDebt).toBe(0);
  });
  it('数量 ≤0 的背包条目跳过；装备槽为「无」跳过', () => {
    const r = computeLiquidation(
      baseInput({
        debt: 10,
        bag: { 空气: { qty: 0, 品质: '白色', 阶位: '一阶' }, 药: { qty: 1, 品质: '白色', 阶位: '一阶' } },
        equipment: { 头部: { qty: 1, 品质: '白色', 类型: '防具', 阶位: '一阶', 名称: '无' } },
      }),
    );
    expect(r.removedBag).toEqual(['药']);
    expect(r.clearedSlots).toEqual([]);
  });
});
