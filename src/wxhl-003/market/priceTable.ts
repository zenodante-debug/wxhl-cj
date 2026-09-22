import { 归一位阶 } from '../dice';

// ================================================================
// 自由市场 · 物品分类与价格校验
// 规则来源：世界书<装备与消耗品系统>（强制生成模板/品质/类型）、
// <品质稀有度规范>（灰色封印）、[mvu_plot]经济系统（恒定物价体系）。
// 与 cloudflare/wxhl-market/worker.js 是同一套规则，改动须两边同步。
// ================================================================

export type MarketKind = 'equip' | 'goods';
export type EquipQuality = '白色' | '蓝色' | '金色' | '紫色' | '银色';
export type EquipCategory = '武器' | '防具' | '饰品';

export interface MarketItemSnapshot {
  名称: string;
  描述?: string;
  数量?: number;
  品质?: string;
  类型?: string;
  阶位?: string;
  [k: string]: unknown;
}

export interface PriceCheck {
  ok: boolean;
  min: number;
  max: number;
  reason: string;
}

/** 一阶基准价表 [下限, 上限]（经济系统·恒定物价体系）；与 worker.js 同步 */
const BASE: Record<EquipCategory, Record<EquipQuality, [number, number]>> = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000], 银色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000], 银色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500], 银色: [1200, 2500] },
};

/** 溢价上限倍率（相对基准价上限）：蓝禁溢价、金+50%、紫+100%（银不走市场） */
const PREMIUM: Record<EquipQuality, number> = { 白色: 1, 蓝色: 1.0, 金色: 1.5, 紫色: 2.0, 银色: 2.0 };

/** 道具价格区间（UP），× 阶位²；下限盖住弹药(10/一阶)、上限盖住金色职业书(3000/一阶) */
const GOODS_BASE: [number, number] = [5, 3000];

// ———— 品质归一 ————

export interface ParsedQuality {
  quality: EquipQuality;
  /** 灰色封印(原品质) 解包出的原品质；封印只是军衔锁，定价按原品质 */
  gray: boolean;
}

/** 解析品质字段：白/蓝/金/紫/银（含"灰色封印(紫)"解包）；特殊/无/空 → null（不可定价） */
export function parseQuality(raw: unknown): ParsedQuality | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const gray = /灰色封印|灰色/.test(s);
  const m = s.match(/[白蓝金紫银]/);
  if (!m) return null;
  const map: Record<string, EquipQuality> = {
    白: '白色', 蓝: '蓝色', 金: '金色', 紫: '紫色', 银: '银色',
  };
  return { quality: map[m[0]], gray };
}

// ———— 装备信号与分类 ————

const NONE_STRINGS = ['', '无', 'none', 'None'];

function notNone(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return !NONE_STRINGS.includes(v.trim());
  if (typeof v === 'number') return v !== 0;
  return true;
}

/** 装备专属字段信号：强制生成模板里的字段，任一非默认值即视为装备 */
export function hasEquipMarkers(item: MarketItemSnapshot): boolean {
  return (
    notNone(item.穿戴门槛) ||
    notNone(item.伤害骰) ||
    notNone(item.倍率) ||
    notNone(item.装备防御) ||
    notNone(item.装备闪避) ||
    notNone(item.负重) ||
    notNone(item.主属性) ||
    // 模板必填而道具绝无（JSON 数据里不会出现显式 undefined，语义等同 hasOwn）
    item.强化等级 !== undefined
  );
}

const WEAPON_RE = /武器|兵器|剑|刀|匕|斧|枪|炮|杖|棍|棒|弓|弩|锤|矛|镰|爪|鞭|戟|铳/;
const ACCESSORY_RE = /饰品|戒指|指环|项链|吊坠|坠子|护符|徽章|面具|耳环|手镯|胸针|别针|发饰|眼镜/;
const ARMOR_RE = /防具|头部|躯干|手部|下装|极轻|轻装|中装|重装|极重|甲|铠|衣|袍|盾/;

/**
 * 类型 → 武器/防具/饰品。判定顺序（依据世界书模板）：
 * ① 类型含武器词 ② 有伤害骰（防具模板伤害骰恒为"无"）③ 类型含饰品词
 * ④ 类型含部位/重量/甲衣词 ⑤ 装备防御/闪避信号 ⑥ 兜底饰品（模板三分类的剩余类）
 */
export function parseCategory(item: MarketItemSnapshot): EquipCategory | null {
  const t = String(item.类型 ?? '');
  if (WEAPON_RE.test(t)) return '武器';
  if (notNone(item.伤害骰)) return '武器';
  if (ACCESSORY_RE.test(t)) return '饰品';
  if (ARMOR_RE.test(t)) return '防具';
  if (notNone(item.装备防御) || notNone(item.装备闪避)) return '防具';
  if (notNone(item.主属性) || notNone(item.主属性加成)) return '饰品';
  return null;
}

export type ItemClass =
  | { kind: 'equip'; quality: EquipQuality; gray: boolean; category: EquipCategory }
  | { kind: 'goods' };

/**
 * 物品分类（装备/道具）。装备 = 品质可定价 + 类型/信号可判分类。
 * 不要求装备字段信号齐全——卖家可能剥离属性字段伪装成道具，只要品质+类型仍在
 * 就按装备定价（防绕价）；两类都不满足才是道具（真实存档里消耗品也带品质
 * 和效果，但其类型不含武器/防具/饰品词、也无任何装备字段信号）。
 */
export function classify(item: MarketItemSnapshot): ItemClass {
  const q = parseQuality(item.品质);
  if (!q) return { kind: 'goods' };
  const category = parseCategory(item);
  if (!category) return { kind: 'goods' };
  return { kind: 'equip', quality: q.quality, gray: q.gray, category };
}

/** 兼容旧接口：是否装备 */
export function isEquip(item: MarketItemSnapshot): boolean {
  return classify(item).kind === 'equip';
}

// ———— 价格 ————

/** 阶位 → 系数 x²（一阶1、二阶4、三阶9、四阶16、五阶25），认不出返回 null */
function tierFactor(tier: string): number | null {
  const idx = 归一位阶(tier);
  if (idx === undefined) return null;
  return (idx + 1) ** 2;
}

/** 参考价区间（基准价×阶位²，未含溢价），无法定价返回 null */
export function refRange(品质: EquipQuality, 类型: EquipCategory, 阶位: string): { min: number; max: number } | null {
  const base = BASE[类型]?.[品质];
  const f = tierFactor(阶位);
  if (!base || !f) return null;
  return { min: base[0] * f, max: base[1] * f };
}

/** 物品的定价阶位：优先物品自身阶位，缺省回退卖家阶位 */
function priceTierOf(item: MarketItemSnapshot, sellerTier: string): string {
  return String(item.阶位 ?? '') || sellerTier;
}

export function checkPrice(kind: MarketKind, item: MarketItemSnapshot, sellerTier: string, price: number): PriceCheck {
  const fail = (reason: string, min = 0, max = 0): PriceCheck => ({ ok: false, min, max, reason });
  if (!Number.isFinite(price) || price < 0 || price > 9_999_999) return fail('价格超出允许范围');

  if (kind === 'goods') {
    const qty = Number(item.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return fail('数量须为 1~99 的整数');
    const f = tierFactor(priceTierOf(item, sellerTier));
    if (!f) return fail('阶位无法识别');
    const min = GOODS_BASE[0] * f;
    const max = GOODS_BASE[1] * f;
    if (price < min) return fail(`价格过低，${qty}件道具单价不得低于 ${min} UP`, min, max);
    if (price > max) return fail(`价格过高，道具单价不得超过 ${max} UP`, min, max);
    return { ok: true, min, max, reason: '' };
  }

  // equip
  const parsed = parseQuality(item.品质);
  const category = parseCategory(item);
  if (!parsed || !category || !BASE[category]?.[parsed.quality])
    return fail('装备缺少可定价的品质/类型字段');
  if (parsed.quality === '白色') return fail('白色装备没有市场，回廊不收录');
  if (parsed.quality === '银色') return fail('银色装备有价无市，只走剧情，不进入市场');
  const ref = refRange(parsed.quality, category, priceTierOf(item, sellerTier));
  if (!ref) return fail('阶位无法识别');
  const min = Math.floor(ref.min);
  const max = Math.floor(ref.max * (PREMIUM[parsed.quality] ?? 1));
  if (price < min) return fail(`价格过低，不得低于基准下限 ${min} UP`, min, max);
  if (price > max) return fail(`价格过高，${parsed.quality}装备不得超过 ${max} UP`, min, max);
  return { ok: true, min, max, reason: '' };
}
