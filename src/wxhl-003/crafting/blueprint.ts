// ================================================================
// 图纸：背包物品形态的读写、定价、上传学习（纯函数，零酒馆依赖）
// 定价（spec §7.1）：装备=成品一阶中值×2×阶位系数；道具=一阶单价×20×阶位系数
// ================================================================
import { bagRemove, type Bag } from '../market/settle';
import { TIER_COEF, type Quality } from './equipTables';
import { BlueprintDataSchema, 配方Schema, type 图纸数据, type 配方库 } from './recipes';

/** 一阶成品价格区间中值（与 market/priceTable.ts 的 BASE 同源；改动须两边同步）
 *  防具「白色」=(15+40)/2=27.5，按 Math.round 上取整为 28（测试对两表做交叉断言） */
const EQUIP_MID: Record<'武器' | '防具' | '饰品', Record<Quality, number>> = {
  武器: { 白色: 45, 蓝色: 150, 金色: 600, 紫色: 2250 },
  防具: { 白色: 28, 蓝色: 100, 金色: 425, 紫色: 1500 },
  饰品: { 白色: 30, 蓝色: 105, 金色: 500, 紫色: 1850 },
};
/** 图纸相对成品的倍率：装备=生产资料（做 2~3 件回本），道具=走量（做 20 份回本） */
const EQUIP_MULT = 2;
const GOODS_MULT = 20;

export function blueprintPrice(
  成品类型: '装备' | '道具',
  子类: '武器' | '防具' | '饰品' | '',
  阶位: number,
  品质: Quality,
  道具一阶单价?: number,
): number {
  const coef = TIER_COEF[阶位];
  // 注意：TIER_COEF[0] === 0 是"未使用"哨兵，故用 falsy 判定，0 阶/越界阶位一律抛错
  if (!coef) throw new Error(`未知阶位：${阶位}`);
  if (成品类型 === '道具') {
    if (!道具一阶单价) throw new Error('道具图纸定价需要一阶单价');
    return 道具一阶单价 * GOODS_MULT * coef;
  }
  if (!子类) throw new Error('装备图纸定价需要子类');
  const 一阶中值 = EQUIP_MID[子类]?.[品质];
  if (一阶中值 === undefined) throw new Error(`未知成品子类或品质：${子类} ${品质}`);
  return 一阶中值 * EQUIP_MULT * coef;
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
  // 空名图纸不得入库（终审 I1 的另一入口）：设计路径已由 sanitizeDesign 拦住，但 AI/GM 可以直写背包，
  // 上传后 配方库[''] 会制作出**空名背包条目**（主卡背包空键 → 无法上架/识别、可无限复制）。
  // 与「不是有效图纸」「已掌握」同一形态：只返回 error，背包与配方库都不动。
  if (String(名称).trim() === '') return { error: '图纸名称为空，无法上传学习' };
  // 用 hasOwn：图纸名由 AI 生成，`constructor`/`toString` 之类会让真值判定误报"已掌握"
  if (Object.hasOwn(配方库, 名称)) return { error: `已掌握配方「${名称}」，不能重复上传` };
  let nextBag: Bag;
  try {
    nextBag = bagRemove(bag, 物品名, 1);
  } catch (e: any) {
    return { error: e?.message ?? '图纸数量不足' };
  }
  return { bag: nextBag, 配方库: { ...配方库, [名称]: 数据.配方 } };
}

/** 零也是合法取值的数值字段（终审 M2）：`0` 是 `道具固定值` 在世界书物价表里的正常取值
 *  （弹药/状态/餐食/陷阱 全为 0，恢复类为 0 亦合法），不能按「未填」处理——
 *  否则 base 的合法 0 会被 AI 的非零值静默覆盖（对恢复类图纸就是免费加强，且不留痕）。
 *  其余数值字段（阶位、批量上限、版本）的 0 都是非法/哨兵值，仍按未填让位给 AI。 */
const 零合法字段 = new Set<string>(['道具固定值']);

/** 是否「已填」：undefined/null/空串/空数组/0 视为未填（0 判定只对数值字段有意义；零合法字段除外） */
function 已填(v: unknown, 字段 = ''): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return v !== 0 || 零合法字段.has(字段);
  return true;
}

type 字段校验器 = { safeParse: (v: unknown) => { success: boolean } };
type 字段形状 = Record<string, 字段校验器 | undefined>;

function 取对象(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** base 的该字段算「已有有效内容」：已填 且 通过字段自身的 schema 校验 */
function 有效字段(base: Record<string, unknown>, k: string, 形状: 字段形状): boolean {
  const v = base[k];
  return 已填(v, k) && (形状[k]?.safeParse(v).success ?? true);
}

/** 逐字段合并：base 优先；base 缺失/空/非法时才用补的 */
function 合并字段(base: Record<string, unknown>, 补: Record<string, unknown>, 形状: 字段形状): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(补)) {
    if (!有效字段(out, k, 形状)) out[k] = v;
  }
  return out;
}

/** 补全：只填缺失/非法的字段，绝不覆盖已有有效内容
 *  配方逐字段 base 优先（名称是配方库去重键，尤不可被 AI 改写）；补全恒置 true；末尾 parse 收口 */
export function mergeBlueprintData(现有: unknown, 补全结果: Partial<图纸数据>): 图纸数据 {
  const base = 取对象(现有);
  const 补 = 补全结果 as Record<string, unknown>;
  const 顶层形状 = BlueprintDataSchema.shape as 字段形状;
  return BlueprintDataSchema.parse({
    制作者: 有效字段(base, '制作者', 顶层形状) ? base.制作者 : 补.制作者,
    版本: 有效字段(base, '版本', 顶层形状) ? base.版本 : 补.版本,
    配方: 合并字段(取对象(base.配方), 取对象(补.配方), 配方Schema.shape as 字段形状),
    补全: true,
  });
}
