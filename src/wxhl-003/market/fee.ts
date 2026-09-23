import { 归一位阶 } from '../dice';
import { BASE, type MarketItemSnapshot } from './priceTable';
import { BONUS, ARMOR_MULT } from './equipRules';

// ================================================================
// 无限回廊 · 超模上架费（2026-09-23 用户定稿）
// 名义阶位 = 物品写的阶位；真实阶位 = 效果实际达到的阶位（AI 语义判定 + 数值基准反查，取较高者）。
// 系数两套，用途不同：
//   定价系数（算"真实阶位基准价"）：一阶~五阶 = 阶位²(1,4,9,16,25)；超脱 = 五阶基准价×20（即一阶×500）
//   修正系数（算费用倍率）：1, 2, 4, 7, 11, 20（一阶~五阶、超脱）
// RP 费 = 50 ×（名义..真实 修正系数和，含两端）
// UP 费 = 真实阶位基准价 ×（名义..真实 修正系数和）
//   真实阶位基准价 = 一阶基准价 × 真实阶位定价系数；装备查 BASE 表取下限，道具取 3000（一阶道具价上限）
// 符合名义阶位（realIdx <= nominalIdx）不收费。
// 与 cloudflare/wxhl-market/worker.js 的 op 字段校验同一套口径。
// ================================================================

export const TIER_NAMES = ['一阶', '二阶', '三阶', '四阶', '五阶', '超脱'] as const;
export type RealTier = (typeof TIER_NAMES)[number];

/** 阶位修正系数（违规费用倍率用） */
export const TIER_COEFS = [1, 2, 4, 7, 11, 20];

/** 定价系数：0..4 = 阶位²；5(超脱) = 25×20 = 500 */
export function priceCoef(realIdx: number): number {
  if (realIdx <= 4) return (realIdx + 1) ** 2;
  return 25 * 20;
}

export function realTierName(realIdx: number): RealTier {
  return TIER_NAMES[Math.max(0, Math.min(5, realIdx))];
}

export function realTierIdx(name: string): number | null {
  const i = TIER_NAMES.indexOf(name as RealTier);
  return i >= 0 ? i : null;
}

export interface OpFee {
  /** 名义..真实 修正系数之和 */
  sum: number;
  /** RP 费 = 50 × sum */
  rp: number;
  /** UP 费 = 基准价 × 真实阶位定价系数 × sum */
  up: number;
  realIdx: number;
}

/**
 * 超模上架费。nominalIdx/realIdx：0..4=一阶~五阶，5=超脱。
 * realIdx <= nominalIdx → null（符合规格，不走手续）。
 */
export function opFeeFor(nominalIdx: number, realIdx: number, baseUp: number): OpFee | null {
  if (realIdx <= nominalIdx) return null;
  let sum = 0;
  for (let i = Math.max(0, nominalIdx); i <= Math.min(5, realIdx); i++) sum += TIER_COEFS[i];
  return { sum, rp: 50 * sum, up: baseUp * priceCoef(realIdx) * sum, realIdx };
}

/**
 * 物品的一阶基准价（UP 费公式用）：
 * 装备按 类型×品质 查表取下限；道具按品质查**武器**表取下限（2026-09-23 起道具与武器同表）；
 * 品质不可识别时退白色武器下限（30）。
 */
export function baseUpOf(kind: 'equip' | 'goods', item: MarketItemSnapshot, category?: string | null): number {
  const table = (kind === 'equip' && category ? (BASE as Record<string, Record<string, [number, number]>>)[category] : undefined) ?? BASE.武器;
  const base = table?.[String(item.品质 ?? '')];
  return base ? base[0] : BASE.武器.白色[0];
}

export interface OpAssessment {
  realIdx: number;
  points: string[];
}

/** 在基准行里反查数值所属的最低真实阶位（含容差）；超出全部行 → 超脱(5) */
function invertBench(value: number, bench: number[], tolerance: number): number {
  for (let i = 0; i < bench.length; i++) {
    if (value <= bench[i] + tolerance) return i;
  }
  return 5;
}

/** 属性加成容差：真实存档与基准表存在 ±2 小幅偏差（不收费），显著超出才计费 */
const ATTR_TOLERANCE = 2;
/** 防/闪容差（与旧软上限一致：15×倍率+6） */
const ARMOR_TOLERANCE = 6;

/**
 * 确定性超模反查（不需要 AI）：主/副属性加成、装备防御/闪避超出名义阶位基准时，
 * 反推它实际达到的阶位。返回 null = 数值层面没有超出名义阶位。
 */
export function assessDeterministic(
  item: MarketItemSnapshot,
  cls: { quality: string; category: string },
  nominalIdx: number,
): OpAssessment | null {
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const row = (BONUS as Record<string, Record<string, number[]>>)[cls.category]?.[cls.quality];
  const points: string[] = [];
  let realIdx = nominalIdx;

  if (row) {
    const 主 = num(item.主属性加成);
    if (主 > 0) {
      const idx = invertBench(主, row, ATTR_TOLERANCE);
      if (idx > nominalIdx) {
        realIdx = Math.max(realIdx, idx);
        points.push(`主属性加成 ${主} 已达到「${realTierName(idx)}」规格（${cls.quality}·${cls.category}名义阶位基准约 ${row[nominalIdx] ?? 0}）`);
      }
    }
    const 副 = num(item.副属性加成);
    if (副 > 0) {
      const bench = row.map(v => Math.floor(v * 0.5));
      const idx = invertBench(副, bench, ATTR_TOLERANCE);
      if (idx > nominalIdx) {
        realIdx = Math.max(realIdx, idx);
        points.push(`副属性加成 ${副} 已达到「${realTierName(idx)}」规格（名义阶位基准约 ${bench[nominalIdx] ?? 0}）`);
      }
    }
  }

  // 防御/闪避：各阶位合理上限 = 15 × 修正系数（+容差）
  const 防 = Math.abs(num(item.装备防御));
  const 闪 = Math.abs(num(item.装备闪避));
  const capBench = ARMOR_MULT.map(m => 15 * m);
  for (const [label, v] of [['装备防御', 防], ['装备闪避', 闪]] as const) {
    if (v > 0) {
      const idx = invertBench(v, capBench, ARMOR_TOLERANCE);
      if (idx > nominalIdx) {
        realIdx = Math.max(realIdx, idx);
        points.push(`${label} ${v} 已达到「${realTierName(idx)}」规格（名义阶位合理上限约 ${capBench[nominalIdx] ?? 15}）`);
      }
    }
  }

  return points.length > 0 ? { realIdx, points } : null;
}

/** 物品的名义阶位下标（0..4）；阶位写的是超脱或认不出 → null（无法按名义收费，走拒绝路径） */
export function nominalIdxOf(item: MarketItemSnapshot, sellerTier: string): number | null {
  const idx = 归一位阶(String(item.阶位 ?? '') || sellerTier);
  return idx === undefined ? null : idx;
}
