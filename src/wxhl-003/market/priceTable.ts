import { 归一位阶 } from '../dice';

export type MarketKind = 'equip' | 'goods';

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

/** 一阶基准价表 [下限, 上限]，来自经济系统文档；与 cloudflare/wxhl-market/worker.js 同规则，改动须两边同步 */
const BASE: Record<string, Record<string, [number, number]>> = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500] },
};

/** 溢价上限倍率（相对参考价上限）：蓝禁溢价、金+50%、紫+100% */
const PREMIUM: Record<string, number> = { 蓝色: 1.0, 金色: 1.5, 紫色: 2.0 };

/** 贱卖下限倍率（相对参考价下限），对应系统 40% 回收价 */
const FLOOR_RATE = 0.4;

const EQUIP_TYPES = ['武器', '防具', '饰品'];

export function isEquip(item: MarketItemSnapshot): boolean {
  return typeof item.品质 === 'string' && item.品质.length > 0 && EQUIP_TYPES.includes(String(item.类型 ?? ''));
}

/** 阶位 → 系数 x²（一阶1、二阶4、三阶9、四阶16、五阶25），认不出返回 null */
function tierFactor(tier: string): number | null {
  const idx = 归一位阶(tier);
  if (idx === undefined) return null;
  return (idx + 1) ** 2;
}

/** 参考价区间（未含溢价/下限放宽），无法定价返回 null */
export function refRange(品质: string, 类型: string, 阶位: string): { min: number; max: number } | null {
  const base = BASE[类型]?.[品质];
  const f = tierFactor(阶位);
  if (!base || !f) return null;
  return { min: base[0] * f, max: base[1] * f };
}

export function checkPrice(kind: MarketKind, item: MarketItemSnapshot, sellerTier: string, price: number): PriceCheck {
  const fail = (reason: string, min = 0, max = 0): PriceCheck => ({ ok: false, min, max, reason });
  if (!Number.isFinite(price) || price < 0 || price > 9_999_999) return fail('价格超出允许范围');

  if (kind === 'goods') {
    const qty = Number(item.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return fail('数量须为 1~99 的整数');
    return { ok: true, min: 0, max: 9_999_999, reason: '' };
  }

  // equip
  const 品质 = String(item.品质 ?? '');
  const 类型 = String(item.类型 ?? '');
  if (!BASE[类型]?.[品质]) return fail('装备缺少可定价的品质/类型字段');
  if (品质 === '白色') return fail('白色装备没有市场，回廊不收录');
  if (品质 === '银色') return fail('银色装备有价无市，只走剧情，不进入市场');
  const 阶位 = String(item.阶位 ?? '') || sellerTier;
  const ref = refRange(品质, 类型, 阶位);
  if (!ref) return fail('阶位无法识别');
  const min = Math.floor(ref.min * FLOOR_RATE);
  const max = Math.floor(ref.max * (PREMIUM[品质] ?? 1));
  if (price < min) return fail(`价格过低，不得低于 ${min} UP`, min, max);
  if (price > max) return fail(`价格过高，${品质}装备不得超过 ${max} UP`, min, max);
  return { ok: true, min, max, reason: '' };
}
