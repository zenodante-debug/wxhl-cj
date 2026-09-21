import { describe, expect, it } from 'vitest';
import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from '../settle';

const 刀 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶', 数量: 2 };

describe('bagRemove · 上架扣减', () => {
  it('扣部分数量', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(bagRemove(bag, '制式长刀', 1).制式长刀.数量).toBe(1);
  });
  it('扣光后条目被移除', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(bagRemove(bag, '制式长刀', 2).制式长刀).toBeUndefined();
  });
  it('数量不足抛错且不修改原 bag', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(() => bagRemove(bag, '制式长刀', 3)).toThrow();
    expect(bag.制式长刀.数量).toBe(2);
  });
  it('物品不存在抛错', () => {
    expect(() => bagRemove({}, '不存在的', 1)).toThrow();
  });
});

describe('bagAdd · 购入/取回', () => {
  it('同名合并数量', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(bagAdd(bag, 刀, 3).制式长刀.数量).toBe(5);
  });
  it('新物品整条入包', () => {
    const bag = bagAdd({}, { ...刀, 描述: '好刀' }, 1);
    expect(bag.制式长刀.数量).toBe(1);
    expect(bag.制式长刀.描述).toBe('好刀');
  });
});

describe('UP 结算', () => {
  it('扣款与余额不足', () => {
    expect(spendUP(500, 300)).toBe(200);
    expect(() => spendUP(200, 300)).toThrow();
  });
  it('入款', () => {
    expect(gainUP(500, 300)).toBe(800);
    expect(gainUP(500, 0)).toBe(500);
  });
});
