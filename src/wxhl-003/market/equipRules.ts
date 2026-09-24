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

/** 主属性加成最高值（按 分类×品质×阶位 0..5，含超脱）；
 *  超脱 = 五阶基准 ×1.2 取整（武器紫/银 22、防具 12、饰品 14）。
 *  银色数值等同紫色（品质稀有度规范）。
 *  导出供 fee.ts 做超模判定（超出该品质当前阶位的最高值 → 往上升一阶，算超模） */
export const BONUS: Record<EquipCategory, Record<EquipQuality, number[]>> = {
  // 武器表
  武器: { 白色: [1, 1, 2, 4, 6, 7], 蓝色: [1, 2, 4, 6, 9, 11], 金色: [2, 3, 5, 9, 12, 14], 紫色: [3, 5, 8, 13, 18, 22], 银色: [3, 5, 8, 13, 18, 22] },
  // 躯干表（头部|躯干|手部|下装统一使用）
  防具: { 白色: [0, 1, 1, 2, 3, 4], 蓝色: [0, 1, 2, 3, 5, 6], 金色: [1, 2, 3, 4, 6, 7], 紫色: [2, 3, 4, 7, 10, 12], 银色: [2, 3, 4, 7, 10, 12] },
  // 饰品表
  饰品: { 白色: [0, 1, 1, 2, 3, 4], 蓝色: [0, 1, 2, 3, 5, 6], 金色: [1, 2, 3, 5, 7, 8], 紫色: [1, 3, 5, 8, 11, 14], 银色: [1, 3, 5, 8, 11, 14] },
};

/** 防具防/闪阶位倍率（位阶修正值系数：1、2、4、7、11）。导出供 fee.ts 超模反查 */
export const ARMOR_MULT = [1, 2, 4, 7, 11];

/** 伤害骰合法面（骰面升级路径 d4→d6→d8→d10→d12→d20→d40） */
const DICE_FACES = [4, 6, 8, 10, 12, 20, 40];
const DICE_RE = /^(\d*)d(\d+)$/i;
/** 骰数上限（五阶重型狙击 14d，留余量到 20） */
const DICE_COUNT_MAX = 20;

/** 强制生成模板的必填字段（名称/品质/类型为分类前置条件，不在此重复检查） */
const TEMPLATE_FIELDS = ['阶位', '穿戴门槛', '强化等级', '伤害骰', '倍率', '主属性', '副属性', '主属性加成', '副属性加成', '装备防御', '装备闪避', '负重', '效果', '描述'] as const;

/** 效果条目数（效果为 record；字符串/缺失视为 0 条） */
function effectCount(item: MarketItemSnapshot): number {
  const e = item.效果;
  if (e && typeof e === 'object' && !Array.isArray(e)) return Object.keys(e).length;
  return 0;
}

/**
 * 装备结构校验（上架前的硬性门槛）。cls 来自 classify()（已确认品质/分类），tierIdx 为定价阶位下标 0..4。
 * 只拦「结构/数据损坏」类问题：效果条目超限、骰面格式非法、缺模板字段（警告）。
 * 数值超基准与强效果（必中/无敌/锁血/即死/无限）自 2026-09-23 起改为「超模收费上架」路径，
 * 由 fee.assessDeterministic + AI 语义判定评估真实阶位，不再在此拒绝。
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

  // ———— 伤害骰格式（骰面升级路径 + 骰数上限）；格式与骰数分开报错，错误带原值 ————
  const dice = String(item.伤害骰 ?? '无').trim();
  if (dice !== '' && dice !== '无') {
    const m = dice.match(DICE_RE);
    if (!m) {
      errors.push(`伤害骰「${dice}」格式非法（应为 Nd4/d6/d8/d10/d12/d20/d40，如 4d20）`);
    } else {
      const face = Number(m[2]);
      if (!DICE_FACES.includes(face)) {
        errors.push(`伤害骰「${dice}」骰面 d${face} 不在合法骰面内（只认 d4/d6/d8/d10/d12/d20/d40）`);
      } else {
        const count = Number(m[1] || 1);
        if (count > DICE_COUNT_MAX) {
          errors.push(`伤害骰「${dice}」骰数 ${count} 超出上限（约 ${DICE_COUNT_MAX}）`);
        }
      }
    }
  }

  // ———— 模板字段完整性（软提示） ————
  const missing = TEMPLATE_FIELDS.filter(f => item[f] === undefined || item[f] === null);
  if (missing.length > 0) {
    warnings.push(`缺少模板字段：${missing.join('、')}（建议补全后再上架）`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
