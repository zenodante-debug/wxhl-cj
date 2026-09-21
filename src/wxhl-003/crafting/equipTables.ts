// ================================================================
// 世界书《装备与消耗品系统》数值表移植（工坊专用）
// 设计填补（世界书未列明，均为可调常量）：
//   - 防具「蓝色」与「中装」基准 = 相邻两档平均，向下取整
//   - 副属性穿戴门槛 = 主门槛/2 向下取整
//   - 防具负重基准 ARMOR_WEIGHT_BASE（世界书只给了阶位负重倍率）
// ================================================================

export type Quality = '白色' | '蓝色' | '金色' | '紫色';
export type Attr = 'STR' | 'AGI' | 'CON' | 'PER';
export type ArmorSpectrum = '极轻' | '轻装' | '中装' | '重装' | '极重';

export const Q_ORDER: readonly Quality[] = ['白色', '蓝色', '金色', '紫色'];
export const TIER_NAMES = ['一阶', '二阶', '三阶', '四阶', '五阶'] as const;
/** 阶位系数 x²（经济/消耗品通用） */
export const TIER_COEF = [0, 1, 4, 9, 16, 25] as const;
/** 防具防闪阶位倍率（世界书：1、2、4、7、11） */
export const TIER_DEF_MULT = [0, 1, 2, 4, 7, 11] as const;
/** 阶位负重倍率（世界书：×1.0/1.4/1.8/2.2/3.0） */
export const TIER_WEIGHT_MULT = [0, 1, 1.4, 1.8, 2.2, 3.0] as const;

export function nextQuality(q: Quality): Quality {
  return Q_ORDER[Math.min(Q_ORDER.indexOf(q) + 1, Q_ORDER.length - 1)];
}

const DICE_PATH = [4, 6, 8, 10, 12, 20, 40] as const;
export function upgradeDice(face: number, steps: number): number {
  const i = DICE_PATH.indexOf(face as (typeof DICE_PATH)[number]);
  if (i === -1) throw new Error(`非法骰面 d${face}`);
  return DICE_PATH[Math.min(i + steps, DICE_PATH.length - 1)];
}
const QUALITY_DICE_UP: Record<Quality, number> = { 白色: 0, 蓝色: 1, 金色: 2, 紫色: 3 };

// ---- 武器：白色全阶位速查表 [骰数, 骰面, 倍率, 负重kg]，下标=阶位（0 不用）----
type WeaponRow = readonly [number, number, number, number];
const Z: WeaponRow = [0, 0, 0, 0];
export const WEAPON_TABLE: Record<string, readonly WeaponRow[]> = {
  徒手:     [Z, [1, 4, 0.5, 0],     [3, 4, 0.5, 0],     [5, 4, 0.5, 0],     [7, 4, 0.5, 0],     [11, 4, 0.5, 0]],
  匕首短棍: [Z, [1, 6, 0.5, 0.5],   [3, 6, 0.5, 0.7],   [5, 6, 0.5, 0.9],   [7, 6, 0.5, 1.1],   [11, 6, 0.5, 1.5]],
  短剑:     [Z, [2, 6, 0.75, 1.5],  [4, 6, 0.75, 2.1],  [6, 6, 0.75, 2.7],  [8, 6, 0.75, 3.3],  [12, 6, 0.75, 4.5]],
  长剑战斧: [Z, [2, 8, 1.0, 3],     [4, 8, 1.0, 4.2],   [6, 8, 1.0, 5.4],   [8, 8, 1.0, 6.6],   [12, 8, 1.0, 9.0]],
  巨剑:     [Z, [3, 12, 1.5, 6],    [5, 12, 1.5, 8.4],  [7, 12, 1.5, 10.8], [9, 12, 1.5, 13.2], [13, 12, 1.5, 18.0]],
  突击步枪: [Z, [3, 6, 0.5, 4],     [5, 6, 0.5, 5.6],   [7, 6, 0.5, 7.2],   [9, 6, 0.5, 8.8],   [13, 6, 0.5, 12.0]],
  重型狙击: [Z, [4, 8, 0.5, 8],     [6, 8, 0.5, 11.2],  [8, 8, 0.5, 14.4],  [10, 8, 0.5, 17.6], [14, 8, 0.5, 24.0]],
  魔杖:     [Z, [1, 8, 0.75, 0.5],  [3, 8, 0.75, 0.7],  [5, 8, 0.75, 0.9],  [7, 8, 0.75, 1.1],  [11, 8, 0.75, 1.5]],
  法杖:     [Z, [2, 8, 1.0, 2],     [4, 8, 1.0, 2.8],   [6, 8, 1.0, 3.6],   [8, 8, 1.0, 4.4],   [12, 8, 1.0, 6.0]],
};

export interface WeaponStats {
  伤害骰: string;
  倍率: number;
  负重: number;
}
export function weaponStats(武器: string, 阶位: number, 品质: Quality): WeaponStats {
  const row = WEAPON_TABLE[武器]?.[阶位] as WeaponRow | undefined;
  if (!row) throw new Error(`未知武器或阶位：${武器} ${阶位}阶`);
  const [count, face, 倍率, 负重] = row;
  return { 伤害骰: `${count}d${upgradeDice(face, QUALITY_DICE_UP[品质])}`, 倍率, 负重 };
}

// ---- 防具：一阶基准 [防御, 闪避]；蓝/中装为相邻档平均向下取整（设计填补）----
const ARMOR_BASE: Record<ArmorSpectrum, Record<Quality, readonly [number, number]>> = {
  极轻: { 白色: [-1, 3], 蓝色: [-2, 4], 金色: [-2, 6], 紫色: [-3, 9] },
  轻装: { 白色: [1, 2],  蓝色: [2, 2],  金色: [3, 3],  紫色: [5, 4] },
  中装: { 白色: [2, 0],  蓝色: [4, 0],  金色: [5, 0],  紫色: [8, 0] },
  重装: { 白色: [4, -1], 蓝色: [6, -2], 金色: [8, -2], 紫色: [12, -3] },
  极重: { 白色: [5, -2], 蓝色: [7, -3], 金色: [10, -3], 紫色: [15, -4] },
};
/** 防具负重基准（设计填补：世界书未给防具基础负重） */
const ARMOR_WEIGHT_BASE: Record<ArmorSpectrum, number> = { 极轻: 1, 轻装: 2, 中装: 4, 重装: 6, 极重: 9 };

export interface ArmorStats {
  装备防御: number;
  装备闪避: number;
  负重: number;
}
export function armorStats(光谱: ArmorSpectrum, 阶位: number, 品质: Quality): ArmorStats {
  const base = ARMOR_BASE[光谱][品质];
  const mult = TIER_DEF_MULT[阶位];
  const wmult = TIER_WEIGHT_MULT[阶位];
  if (base === undefined || mult === undefined || wmult === undefined) {
    throw new Error(`未知防具参数：${光谱} ${阶位}阶`);
  }
  return {
    装备防御: base[0] * mult,
    装备闪避: base[1] * mult,
    负重: Math.round(ARMOR_WEIGHT_BASE[光谱] * wmult * 10) / 10,
  };
}

// ---- 主属性加成基准 [白,蓝,金,紫]，下标=阶位；副=主×0.5 向下取整 ----
const ATTR_BONUS: Record<'武器' | '躯干' | '饰品', readonly (readonly [number, number, number, number])[]> = {
  武器: [[0, 0, 0, 0], [1, 1, 2, 3], [1, 2, 3, 5], [2, 4, 5, 8], [4, 6, 9, 13], [6, 9, 12, 18]],
  躯干: [[0, 0, 0, 0], [0, 0, 1, 2], [1, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 7], [3, 5, 6, 10]],
  饰品: [[0, 0, 0, 0], [0, 0, 1, 1], [1, 1, 2, 3], [1, 2, 3, 5], [2, 3, 5, 8], [3, 5, 7, 11]],
};
export function attrBonus(kind: '武器' | '躯干' | '饰品', 阶位: number, 品质: Quality): { 主: number; 副: number } {
  const row = ATTR_BONUS[kind][阶位];
  if (!row) throw new Error(`未知加成参数：${kind} ${阶位}阶`);
  const 主 = row[Q_ORDER.indexOf(品质)];
  return { 主, 副: Math.floor(主 * 0.5) };
}

// ---- 穿戴门槛：一阶基准 + 跨阶递增(+20/阶)；蓝/副属性为填补 ----
const THRESHOLD_BASE: Record<'轻装' | '中装' | '重装', Record<Quality, number>> = {
  轻装: { 白色: 5, 蓝色: 7, 金色: 9, 紫色: 12 },
  中装: { 白色: 6, 蓝色: 8, 金色: 10, 紫色: 14 },
  重装: { 白色: 8, 蓝色: 10, 金色: 12, 紫色: 16 },
};
const TIER_THRESHOLD_ADD = [0, 0, 20, 40, 60, 80] as const;
export function wearThreshold(光谱: ArmorSpectrum, 阶位: number, 品质: Quality): string {
  const 档 = 光谱 === '极轻' || 光谱 === '轻装' ? '轻装' : 光谱 === '中装' ? '中装' : '重装';
  const v = THRESHOLD_BASE[档][品质] + TIER_THRESHOLD_ADD[阶位];
  return `主属性≥${v}，副属性≥${Math.floor(v / 2)}`;
}

/** 防具命名后缀（核心材料名 + 此词 = 成品名） */
export const ARMOR_NAME: Record<ArmorSpectrum, string> = {
  极轻: '薄甲',
  轻装: '轻甲',
  中装: '锁甲',
  重装: '重甲',
  极重: '堡垒甲',
};
