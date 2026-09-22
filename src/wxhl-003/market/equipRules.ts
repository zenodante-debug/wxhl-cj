import { 归一位阶 } from '../dice';
import type { EquipCategory, EquipQuality, MarketItemSnapshot } from './priceTable';

// ================================================================
// 自由市场 · 上架前装备规则校验
// 规则来源：世界书<装备效果强度限制>（效果条目铁律/常驻数值基准/强效果限制/禁止项）
// 与 <装备与消耗品系统>（强制生成模板/主属性加成基准/武器骰面路径）。
// 与 cloudflare/wxhl-market/worker.js 的硬校验同规则，改动须两边同步。
// ================================================================

export interface ValidationResult {
  ok: boolean;
  /** 硬性违规：拒绝上架 */
  errors: string[];
  /** 软性提示：可上架但建议卖家知悉 */
  warnings: string[];
}

/** 主属性加成基准（按 分类×品质×阶位 0..4）；银色数值等同紫色（品质稀有度规范） */
const BONUS: Record<EquipCategory, Record<EquipQuality, number[]>> = {
  // 武器表
  武器: { 白色: [1, 1, 2, 4, 6], 蓝色: [1, 2, 4, 6, 9], 金色: [2, 3, 5, 9, 12], 紫色: [3, 5, 8, 13, 18], 银色: [3, 5, 8, 13, 18] },
  // 躯干表（头部|躯干|手部|下装统一使用）
  防具: { 白色: [0, 1, 1, 2, 3], 蓝色: [0, 1, 2, 3, 5], 金色: [1, 2, 3, 4, 6], 紫色: [2, 3, 4, 7, 10], 银色: [2, 3, 4, 7, 10] },
  // 饰品表
  饰品: { 白色: [0, 1, 1, 2, 3], 蓝色: [0, 1, 2, 3, 5], 金色: [1, 2, 3, 5, 7], 紫色: [1, 3, 5, 8, 11], 银色: [1, 3, 5, 8, 11] },
};

/** 防具防/闪阶位倍率（位阶修正值系数：1、2、4、7、11） */
const ARMOR_MULT = [1, 2, 4, 7, 11];
/** 一阶防/闪绝对值上限（紫银极重防御 15），软上限 = 15×倍率+6 容差 */
const ARMOR_MAX_T1 = 15;
const ARMOR_TOLERANCE = 6;

/** 伤害骰合法面（骰面升级路径 d4→d6→d8→d10→d12→d20→d40） */
const DICE_RE = /^\d*d(4|6|8|10|12|40)$/i;
/** 骰数上限（五阶重型狙击 14d，留余量到 20） */
const DICE_COUNT_MAX = 20;

/** 强效果关键词：仅四阶以上紫银品质可出现 */
const STRONG_RE = /必中|无敌|锁血|即死|无限/;

/** 数值容差：AI 生成的存档与基准表存在小幅偏差（真实存档回归得出） */
const BONUS_TOLERANCE = 2;

/** 强制生成模板的必填字段（名称/品质/类型为分类前置条件，不在此重复检查） */
const TEMPLATE_FIELDS = ['阶位', '穿戴门槛', '强化等级', '伤害骰', '倍率', '主属性', '副属性', '主属性加成', '副属性加成', '装备防御', '装备闪避', '负重', '效果', '描述'] as const;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 效果条目数（效果为 record；字符串/缺失视为 0 条） */
function effectCount(item: MarketItemSnapshot): number {
  const e = item.效果;
  if (e && typeof e === 'object' && !Array.isArray(e)) return Object.keys(e).length;
  return 0;
}

/** 效果全文（供关键词扫描） */
function effectText(item: MarketItemSnapshot): string {
  const e = item.效果;
  if (e && typeof e === 'object') {
    return Object.entries(e as Record<string, unknown>)
      .map(([k, v]) => k + String(v))
      .join('');
  }
  return typeof e === 'string' ? e : '';
}

/**
 * 装备规则校验。cls 来自 classify()（已确认品质/分类），tierIdx 为定价阶位下标 0..4。
 * 只做装备侧校验；价格区间校验在 priceTable.checkPrice。
 */
export function validateEquip(
  item: MarketItemSnapshot,
  cls: { quality: EquipQuality; category: EquipCategory; gray?: boolean },
  tierIdx: number,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ———— 效果条目数（绝对铁律：最多2条；破限器可合法加到3条） ————
  const effects = effectCount(item);
  if (effects > 3) {
    errors.push(`效果条目数 ${effects} 条超出上限（铁律最多 2 条，破限器上限 3 条）`);
  } else if (effects === 3) {
    warnings.push('效果条目 3 条：若未使用「效果条目破限器」则超出铁律（最多 2 条）');
  }

  // ———— 主/副属性加成基准 ————
  const 强化 = num(item.强化等级);
  // 强化只提升饰品的属性加成（武器+伤害、防具+防闪，不动属性加成）
  const 强化加成 = cls.category === '饰品' ? Math.max(0, 强化) : 0;
  const bench = BONUS[cls.category][cls.quality][tierIdx] ?? 0;
  const 主属性加成 = num(item.主属性加成);
  const 副属性加成 = num(item.副属性加成);
  const 主上限 = bench + 强化加成 + BONUS_TOLERANCE;
  const 副上限 = Math.floor(bench * 0.5) + 强化加成 + BONUS_TOLERANCE;
  if (主属性加成 > 主上限) {
    errors.push(`主属性加成 ${主属性加成} 超出基准（${cls.quality}${cls.category}该阶位约 ${bench}，含容差上限 ${主上限}）`);
  }
  if (副属性加成 > 副上限) {
    errors.push(`副属性加成 ${副属性加成} 超出基准（该阶位约 ${Math.floor(bench * 0.5)}，含容差上限 ${副上限}）`);
  }

  // ———— 防具防/闪软上限（防绝对值离谱；负值同判——重甲负闪避是正常设计） ————
  const 防闪上限 = ARMOR_MAX_T1 * (ARMOR_MULT[tierIdx] ?? 1) + ARMOR_TOLERANCE;
  if (Math.abs(num(item.装备防御)) > 防闪上限) {
    errors.push(`装备防御 ${num(item.装备防御)} 超出该阶位合理范围（上限约 ${防闪上限}）`);
  }
  if (Math.abs(num(item.装备闪避)) > 防闪上限) {
    errors.push(`装备闪避 ${num(item.装备闪避)} 超出该阶位合理范围（上限约 ${防闪上限}）`);
  }

  // ———— 伤害骰格式（骰面升级路径 + 骰数上限） ————
  const dice = String(item.伤害骰 ?? '无').trim();
  if (dice !== '' && dice !== '无') {
    if (!DICE_RE.test(dice)) {
      errors.push(`伤害骰「${dice}」格式非法（只认 Nd4/d6/d8/d10/d12/d20/d40）`);
    } else {
      const count = Number(dice.match(/^(\d*)d/i)?.[1] ?? 1) || 1;
      if (count > DICE_COUNT_MAX) {
        errors.push(`伤害骰骰数 ${count} 超出上限（约 ${DICE_COUNT_MAX}）`);
      }
    }
  }

  // ———— 强效果限制（必中/无敌/锁血/即死/无限 仅四阶以上紫银） ————
  const text = effectText(item);
  if (STRONG_RE.test(text)) {
    const 四阶以上紫银 = tierIdx >= 3 && (cls.quality === '紫色' || cls.quality === '银色');
    if (!四阶以上紫银) {
      const hit = text.match(STRONG_RE)?.[0];
      errors.push(`效果含「${hit}」类强力关键词：仅四阶以上紫/银品质装备可出现`);
    }
  }

  // ———— 模板字段完整性（软提示） ————
  const missing = TEMPLATE_FIELDS.filter(f => item[f] === undefined || item[f] === null);
  if (missing.length > 0) {
    warnings.push(`缺少模板字段：${missing.join('、')}（建议补全后再上架）`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** 便捷入口：从物品直接校验（阶位缺省回退卖家阶位） */
export function validateEquipItem(item: MarketItemSnapshot, sellerTier: string): ValidationResult & { tierIdx: number } {
  const tierIdx = 归一位阶(String(item.阶位 ?? '') || sellerTier) ?? 0;
  const r = validateEquip(item, { quality: '蓝色', category: '武器' }, tierIdx);
  return { ...r, tierIdx };
}
