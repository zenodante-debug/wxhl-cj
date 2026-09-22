import { describe, expect, it } from 'vitest';
import type { Bag } from '../../market/settle';
import { blueprintPrice, collectBlueprints, readBlueprint, uploadBlueprint, writeBlueprint } from '../blueprint';
import { blueprintItemName } from '../recipes';

const 金配方 = {
  名称: '狼王牙刃', 来源: '图纸' as const, 行业: '锻造' as const, 成品类型: '装备' as const,
  装备子类: '武器' as const, 品质: '金色' as const, 阶位: 3, 装备基础: '短剑',
  材料: [{ 类别: '怪物素材' as const, 数量: 1, 核心: true }],
  技能要求: { 分类: '高级' as const, 等级: 1 }, 批量上限: 1, 成品名: '', 效果: [],
};
const 图纸物品 = blueprintItemName('狼王牙刃');

function bagWith蓝图的(): Bag {
  return {
    [图纸物品]: { 名称: 图纸物品, 描述: '狼王牙刃的制作图纸', 数量: 1, 图纸数据: { 配方: 金配方, 制作者: 'AI', 补全: false, 版本: 1 } },
    精铁: { 名称: '精铁', 描述: '', 数量: 5 },
  };
}

describe('blueprintPrice · 图纸定价（成品一阶中值×2×阶位系数）', () => {
  it('金三阶武器 = 10800', () => {
    expect(blueprintPrice('装备', '武器', 3, '金色')).toBe(10800);
  });
  it('金三阶防具 = 7650；金三阶饰品 = 9000', () => {
    expect(blueprintPrice('装备', '防具', 3, '金色')).toBe(7650);
    expect(blueprintPrice('装备', '饰品', 3, '金色')).toBe(9000);
  });
  it('紫三阶武器 = 40500', () => {
    expect(blueprintPrice('装备', '武器', 3, '紫色')).toBe(40500);
  });
  it('金一阶武器 = 1200（对照 spec 表）', () => {
    expect(blueprintPrice('装备', '武器', 1, '金色')).toBe(1200);
  });
  it('道具图纸 = 一阶单价×20×阶位系数', () => {
    expect(blueprintPrice('消耗品', '', 3, '金色', 40)).toBe(7200);
  });
});

describe('图纸背包读写', () => {
  it('collectBlueprints 只挑出带合法图纸数据的物品', () => {
    const list = collectBlueprints(bagWith蓝图的());
    expect(list.length).toBe(1);
    expect(list[0].物品名).toBe(图纸物品);
    expect(list[0].数据.配方.品质).toBe('金色');
  });
  it('readBlueprint 可读、非图纸返回 null', () => {
    expect(readBlueprint(bagWith蓝图的(), 图纸物品)?.配方.名称).toBe('狼王牙刃');
    expect(readBlueprint(bagWith蓝图的(), '精铁')).toBeNull();
  });
  it('writeBlueprint 回写数据且不动数量', () => {
    const bag = bagWith蓝图的();
    const next = writeBlueprint(bag, 图纸物品, { ...readBlueprint(bag, 图纸物品)!, 补全: true });
    expect(next[图纸物品].数量).toBe(1);
    expect((next[图纸物品] as any).图纸数据.补全).toBe(true);
  });
});

describe('uploadBlueprint · 上传学习', () => {
  it('成功：扣图纸物品、配方入库', () => {
    const r = uploadBlueprint(bagWith蓝图的(), 图纸物品, {});
    expect('bag' in r).toBe(true);
    if (!('bag' in r)) return;
    expect(r.bag[图纸物品]).toBeUndefined();
    expect(r.bag.精铁.数量).toBe(5);
    expect(r.配方库['狼王牙刃'].品质).toBe('金色');
  });
  it('同名已掌握 → 拒绝', () => {
    const r = uploadBlueprint(bagWith蓝图的(), 图纸物品, { 狼王牙刃: 金配方 });
    expect('error' in r && r.error).toContain('已掌握');
  });
  it('物品不存在 → 拒绝', () => {
    const r = uploadBlueprint({}, 图纸物品, {});
    expect('error' in r).toBe(true);
  });
});
