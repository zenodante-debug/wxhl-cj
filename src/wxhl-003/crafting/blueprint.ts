// ================================================================
// 图纸：背包物品形态的读写、定价、上传学习（纯函数，零酒馆依赖）
// 定价（spec §7.1）：装备=成品一阶中值×2×阶位系数；道具=一阶单价×20×阶位系数
// ================================================================
import { bagRemove, type Bag } from '../market/settle';
import { TIER_COEF, type Quality } from './equipTables';
import { BlueprintDataSchema, type 图纸数据, type 配方库 } from './recipes';

/** 一阶成品价格区间中值（与 market/priceTable.ts 的 BASE 同源；改动须两边同步） */
const EQUIP_MID: Record<'武器' | '防具' | '饰品', Record<Quality, number>> = {
  武器: { 白色: 45, 蓝色: 150, 金色: 600, 紫色: 2250 },
  防具: { 白色: 28, 蓝色: 100, 金色: 425, 紫色: 1500 },
  饰品: { 白色: 30, 蓝色: 105, 金色: 500, 紫色: 1850 },
};
/** 图纸相对成品的倍率：装备=生产资料（做 2~3 件回本），道具=走量（做 20 份回本） */
const EQUIP_MULT = 2;
const GOODS_MULT = 20;

export function blueprintPrice(
  成品类型: '装备' | '消耗品',
  子类: '武器' | '防具' | '饰品' | '',
  阶位: number,
  品质: Quality,
  道具一阶单价?: number,
): number {
  const coef = TIER_COEF[阶位];
  if (coef === undefined) throw new Error(`未知阶位：${阶位}`);
  if (成品类型 === '消耗品') {
    if (!道具一阶单价) throw new Error('道具图纸定价需要一阶单价');
    return 道具一阶单价 * GOODS_MULT * coef;
  }
  if (!子类) throw new Error('装备图纸定价需要子类');
  return EQUIP_MID[子类][品质] * EQUIP_MULT * coef;
}

/** 扫描背包，挑出带合法图纸数据的物品 */
export function collectBlueprints(bag: Bag): { 物品名: string; 数据: 图纸数据 }[] {
  const out: { 物品名: string; 数据: 图纸数据 }[] = [];
  for (const [name, item] of Object.entries(bag)) {
    const raw = (item as any)?.图纸数据;
    if (!raw) continue;
    const parsed = BlueprintDataSchema.safeParse(raw);
    if (parsed.success) out.push({ 物品名: name, 数据: parsed.data });
  }
  return out;
}

export function readBlueprint(bag: Bag, 物品名: string): 图纸数据 | null {
  const raw = (bag[物品名] as any)?.图纸数据;
  if (!raw) return null;
  const parsed = BlueprintDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** 回写背包物品的图纸数据（保留数量/描述/名称） */
export function writeBlueprint(bag: Bag, 物品名: string, 数据: 图纸数据): Bag {
  const cur = bag[物品名];
  if (!cur) return bag;
  return { ...bag, [物品名]: { ...cur, 图纸数据: 数据 } };
}

/** 上传学习：扣掉背包里的图纸物品，配方登记进配方库；同名已掌握则拒绝 */
export function uploadBlueprint(
  bag: Bag,
  物品名: string,
  配方库: 配方库,
): { bag: Bag; 配方库: 配方库 } | { error: string } {
  const 数据 = readBlueprint(bag, 物品名);
  if (!数据) return { error: `「${物品名}」不是有效图纸` };
  const 名称 = 数据.配方.名称;
  if (配方库[名称]) return { error: `已掌握配方「${名称}」，不能重复上传` };
  let nextBag: Bag;
  try {
    nextBag = bagRemove(bag, 物品名, 1);
  } catch (e: any) {
    return { error: e?.message ?? '图纸数量不足' };
  }
  return { bag: nextBag, 配方库: { ...配方库, [名称]: 数据.配方 } };
}

/** 补全：只填缺失/非法的字段，不覆盖已有有效内容 */
export function mergeBlueprintData(现有: unknown, 补全结果: Partial<图纸数据>): 图纸数据 {
  const base = BlueprintDataSchema.safeParse(现有);
  const merged = {
    ...(base.success ? base.data : {}),
    ...补全结果,
    配方: { ...(base.success ? base.data.配方 : {}), ...(补全结果.配方 ?? {}) },
    补全: true,
  };
  return BlueprintDataSchema.parse(merged);
}
