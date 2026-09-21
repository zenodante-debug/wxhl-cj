import { describe, expect, it } from 'vitest';
import { checkPrice, isEquip, refRange } from '../priceTable';

const 蓝武器 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶' };
const 金防具 = { 名称: '秘银胸甲', 品质: '金色', 类型: '防具', 阶位: '一阶' };
const 紫饰品 = { 名称: '龙血吊坠', 品质: '紫色', 类型: '饰品', 阶位: '三阶' };
const 药剂 = { 名称: '基础治疗药剂', 描述: '回血', 数量: 5 };

describe('isEquip', () => {
  it('有品质且类型为武器/防具/饰品的是装备', () => {
    expect(isEquip(蓝武器)).toBe(true);
    expect(isEquip(药剂)).toBe(false);
    expect(isEquip({ 名称: '怪东西', 品质: '蓝色', 类型: '材料' })).toBe(false);
  });
});

describe('refRange · 一阶基准×阶位²', () => {
  it('蓝·武器·二阶 = [100,200]×4', () => {
    expect(refRange('蓝色', '武器', '二阶')).toEqual({ min: 400, max: 800 });
  });
  it('紫·饰品·三阶 = [1200,2500]×9', () => {
    expect(refRange('紫色', '饰品', '三阶')).toEqual({ min: 10800, max: 22500 });
  });
  it('未知品质返回 null', () => {
    expect(refRange('彩色', '武器', '一阶')).toBeNull();
  });
});

describe('checkPrice · equip', () => {
  it('蓝装平价：上限=参考上限，禁溢价', () => {
    expect(checkPrice('equip', 蓝武器, '一阶', 800).ok).toBe(true);
    expect(checkPrice('equip', 蓝武器, '一阶', 801).ok).toBe(false);
  });
  it('介于参考上限与溢价上限之间的蓝装价也拒绝', () => {
    expect(checkPrice('equip', 蓝武器, '一阶', 900).ok).toBe(false);
  });
  it('下限=基准下限×阶位²×0.4，允许贱卖不许离谱', () => {
    expect(checkPrice('equip', 蓝武器, '一阶', 160).ok).toBe(true); // 400×0.4
    expect(checkPrice('equip', 蓝武器, '一阶', 159).ok).toBe(false);
  });
  it('金装最多+50%', () => {
    expect(checkPrice('equip', 金防具, '一阶', 900).ok).toBe(true); // 600×1.5
    expect(checkPrice('equip', 金防具, '一阶', 901).ok).toBe(false);
  });
  it('紫装上限=参考上限×2', () => {
    expect(checkPrice('equip', 紫饰品, '一阶', 45000).ok).toBe(true); // 22500×2
    expect(checkPrice('equip', 紫饰品, '一阶', 45001).ok).toBe(false);
  });
  it('白装拒绝上架', () => {
    const r = checkPrice('equip', { 名称: '铁剑', 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('白');
  });
  it('银装拒绝上架', () => {
    const r = checkPrice('equip', { 名称: '圣剑', 品质: '银色', 类型: '武器', 阶位: '一阶' }, '一阶', 99999);
    expect(r.ok).toBe(false);
  });
  it('装备缺品质/类型拒绝', () => {
    expect(checkPrice('equip', { 名称: '无名', 类型: '武器' }, '一阶', 100).ok).toBe(false);
    expect(checkPrice('equip', { 名称: '无名', 品质: '蓝色' }, '一阶', 100).ok).toBe(false);
  });
  it('物品缺阶位时按卖家阶位算', () => {
    const 无阶蓝武 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器' };
    // 卖家三阶 → [100,200]×9 = [900,1800]
    expect(checkPrice('equip', 无阶蓝武, '三阶', 1800).ok).toBe(true);
    expect(checkPrice('equip', 无阶蓝武, '三阶', 1801).ok).toBe(false);
  });
});

describe('checkPrice · goods 自由出价', () => {
  it('正常范围通过', () => {
    expect(checkPrice('goods', 药剂, '一阶', 15).ok).toBe(true);
  });
  it('数量与价格防刷', () => {
    expect(checkPrice('goods', { ...药剂, 数量: 100 }, '一阶', 15).ok).toBe(false);
    expect(checkPrice('goods', 药剂, '一阶', 10000000).ok).toBe(false);
    expect(checkPrice('goods', 药剂, '一阶', -1).ok).toBe(false);
  });
});
