import { describe, expect, it } from 'vitest';
import { armorStats, attrBonus, nextQuality, upgradeDice, weaponStats, wearThreshold } from '../equipTables';

describe('upgradeDice · 骰面升级路径', () => {
  it('沿路径推进并在 d40 封顶', () => {
    expect(upgradeDice(6, 2)).toBe(10);
    expect(upgradeDice(6, 1)).toBe(8);
    expect(upgradeDice(40, 3)).toBe(40);
    expect(upgradeDice(20, 2)).toBe(40);
  });
  it('非法骰面抛错', () => {
    expect(() => upgradeDice(7, 1)).toThrow();
  });
});

describe('weaponStats · 世界书示例锚点', () => {
  it('金色三阶短剑 = 6d10/0.75/2.7kg（世界书原文示例）', () => {
    expect(weaponStats('短剑', 3, '金色')).toEqual({ 伤害骰: '6d10', 倍率: 0.75, 负重: 2.7 });
  });
  it('蓝色五阶重型狙击 = 14d10/0.5/24.0kg（世界书原文示例）', () => {
    expect(weaponStats('重型狙击', 5, '蓝色')).toEqual({ 伤害骰: '14d10', 倍率: 0.5, 负重: 24 });
  });
  it('白色一阶巨剑 = 3d12/1.5/6kg（品质不升骰）', () => {
    expect(weaponStats('巨剑', 1, '白色')).toEqual({ 伤害骰: '3d12', 倍率: 1.5, 负重: 6 });
  });
  it('未知武器抛错', () => {
    expect(() => weaponStats('圣剑', 1, '白色')).toThrow();
  });
});

describe('armorStats · 防闪基准 × 阶位倍率(1/2/4/7/11)', () => {
  it('轻装一阶金：防3闪3 负重2', () => {
    expect(armorStats('轻装', 1, '金色')).toEqual({ 装备防御: 3, 装备闪避: 3, 负重: 2 });
  });
  it('轻装三阶金：×4 → 防12闪12 负重3.6', () => {
    expect(armorStats('轻装', 3, '金色')).toEqual({ 装备防御: 12, 装备闪避: 12, 负重: 3.6 });
  });
  it('中装一阶紫：相邻档平均填补 → 防8闪0', () => {
    expect(armorStats('中装', 1, '紫色')).toEqual({ 装备防御: 8, 装备闪避: 0, 负重: 4 });
  });
});

describe('attrBonus · 主属性加成基准（副=主×0.5 向下取整）', () => {
  it('武器三阶紫：主8副4', () => {
    expect(attrBonus('武器', 3, '紫色')).toEqual({ 主: 8, 副: 4 });
  });
  it('躯干一阶金：主1副0', () => {
    expect(attrBonus('躯干', 1, '金色')).toEqual({ 主: 1, 副: 0 });
  });
  it('饰品五阶蓝：主5副2', () => {
    expect(attrBonus('饰品', 5, '蓝色')).toEqual({ 主: 5, 副: 2 });
  });
});

describe('wearThreshold · 穿戴门槛', () => {
  it('轻装一阶蓝：主≥7 副≥3', () => {
    expect(wearThreshold('轻装', 1, '蓝色')).toBe('主属性≥7，副属性≥3');
  });
  it('重装三阶金：(12+40)=52 / 26', () => {
    expect(wearThreshold('重装', 3, '金色')).toBe('主属性≥52，副属性≥26');
  });
  it('极轻按轻装档、极重按重装档', () => {
    expect(wearThreshold('极轻', 1, '白色')).toBe('主属性≥5，副属性≥2');
    expect(wearThreshold('极重', 1, '白色')).toBe('主属性≥8，副属性≥4');
  });
});

describe('nextQuality', () => {
  it('递进且紫封顶', () => {
    expect(nextQuality('白色')).toBe('蓝色');
    expect(nextQuality('紫色')).toBe('紫色');
  });
});
