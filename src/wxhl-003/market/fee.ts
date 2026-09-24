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
  /** RP 费 = 50 × sum（超脱 + 20 RP 上架费） */
  rp: number;
  /** UP 费 = 基准价 × 真实阶位定价系数 × sum（超脱再加 基准价 × 50%） */
  up: number;
  realIdx: number;
}

/**
 * 超模上架费。nominalIdx/realIdx：0..4=一阶~五阶，5=超脱。
 * realIdx <= nominalIdx → null（符合规格，不走手续）。
 * 超脱（realIdx=5）在上超模费之外，另收「超脱上架费」：20 RP + 基准价 × 50% UP。
 */
export function opFeeFor(nominalIdx: number, realIdx: number, baseUp: number): OpFee | null {
  if (realIdx <= nominalIdx) return null;
  let sum = 0;
  for (let i = Math.max(0, nominalIdx); i <= Math.min(5, realIdx); i++) sum += TIER_COEFS[i];
  const transFee = realIdx === 5;
  return {
    sum,
    rp: 50 * sum + (transFee ? 20 : 0),
    up: baseUp * priceCoef(realIdx) * sum + (transFee ? Math.floor(baseUp * 0.5) : 0),
    realIdx,
  };
}

/**
 * 物品的一阶基准价（UP 费公式用）：
 * 装备按 类型×品质 查表取下限；道具按品质查**武器**表取下限（2026-09-23 起道具与武器同表）；
 * 品质不可识别时退白色武器下限（30）。
 */
export function baseUpOf(kind: 'equip' | 'goods', item: MarketItemSnapshot, category?: string | null): number {
  // 显式标注成 string 索引的映射：`??` 两侧类型不同（左边带 string 索引签名、右边是
  // `Record<EquipQuality, …>` 只有五个具体键），不标注的话 table 会推断成**联合类型**，
  // 下一行用 string 索引它就会报 TS7053（联合类型要求 key 对每个成员都合法）。
  // 运行时行为不变 —— `base ? base[0] : …` 本来就兜住了查不到的情况。
  const table: Record<string, [number, number]> | undefined =
    (kind === 'equip' && category ? (BASE as Record<string, Record<string, [number, number]>>)[category] : undefined) ?? BASE.武器;
  const base = table?.[String(item.品质 ?? '')];
  return base ? base[0] : BASE.武器.白色[0];
}

export interface OpAssessment {
  realIdx: number;
  points: string[];
}

/** 在基准行里反查数值所属的最低阶位（超出该阶位最高值即升阶）；超出全部行 → 超脱(5) */
function invertBench(value: number, bench: number[]): number {
  for (let i = 0; i < bench.length; i++) {
    if (value <= bench[i]) return i;
  }
  return 5;
}

/** 超模宽松度：每阶每品质的最高基准属性加成，再放宽 +5（2026-09-24 用户定稿） */
const ATTR_SLACK = 5;
/** 防/闪容差（真实存档与基准表存在小幅偏差） */
const ARMOR_TOLERANCE = 6;

/**
 * 确定性超模反查（不需要 AI）：**属性加成超出该品质当前阶位的最高值 → 往上升一阶，算超模**。
 * 饰品强化等级计入属性加成上限（强化每级 +1 属性加成，世界书<装备与消耗品系统>）。
 * 防御/闪避按各阶位合理上限（15 × 修正系数）反查，防具强化不计入（已有上限表）。
 * 返回 null = 数值层面没有超出名义阶位。
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
    // 超脱阶（5）数值无上限（用户定稿）；仅一~五阶做反查
    if (nominalIdx < 5) {
      // 饰品强化直接加属性加成（主/副属性由玩家选择），上限 = 基准+强化+宽松度
      const 强化 = cls.category === '饰品' ? Math.max(0, num(item.强化等级)) : 0;
      const 主 = num(item.主属性加成);
      if (主 > 0) {
        const idx = invertBench(主, row.map(v => v + 强化 + ATTR_SLACK));
        if (idx > nominalIdx) {
          realIdx = Math.max(realIdx, idx);
          points.push(`主属性加成 ${主} 已达到「${realTierName(idx)}」规格（${cls.quality}·${cls.category}名义阶位最高约 ${row[nominalIdx] ?? 0}${强化 > 0 ? `+强化${强化}` : ''}，放宽+${ATTR_SLACK}）`);
        }
      }
      const 副 = num(item.副属性加成);
      if (副 > 0) {
        const bench = row.map(v => Math.floor(v * 0.5) + 强化 + ATTR_SLACK);
        const idx = invertBench(副, bench);
        if (idx > nominalIdx) {
          realIdx = Math.max(realIdx, idx);
          points.push(`副属性加成 ${副} 已达到「${realTierName(idx)}」规格（名义阶位最高约 ${Math.floor((row[nominalIdx] ?? 0) * 0.5)}${强化 > 0 ? `+强化${强化}` : ''}，放宽+${ATTR_SLACK}）`);
        }
      }
    }
  }

  // 防御/闪避：各阶位合理上限 = 15 × 修正系数（+容差）；超脱阶无上限
  if (nominalIdx < 5) {
    const 防 = Math.abs(num(item.装备防御));
    const 闪 = Math.abs(num(item.装备闪避));
    const capBench = ARMOR_MULT.map(m => 15 * m + ARMOR_TOLERANCE);
    for (const [label, v] of [['装备防御', 防], ['装备闪避', 闪]] as const) {
      if (v > 0) {
        const idx = invertBench(v, capBench);
        if (idx > nominalIdx) {
          realIdx = Math.max(realIdx, idx);
          points.push(`${label} ${v} 已达到「${realTierName(idx)}」规格（名义阶位合理上限约 ${capBench[nominalIdx] ?? 21}）`);
        }
      }
    }
  }

  return points.length > 0 ? { realIdx, points } : null;
}

/** 物品的名义阶位下标（0..5，超脱 = 5）；认不出 → null（无法按名义收费，走拒绝路径） */
export function nominalIdxOf(item: MarketItemSnapshot, sellerTier: string): number | null {
  const s = String(item.阶位 ?? '') || sellerTier;
  if (/超脱/.test(s)) return 5; // 名义即超脱：其上无阶可超，不收超模费
  const idx = 归一位阶(s);
  return idx === undefined ? null : idx;
}
