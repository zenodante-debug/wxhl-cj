// ================================================================
// 回廊交易所 · 破产清算瀑布（spec §8）：纯计算，不碰 MVU——
// 输入资产快照，输出清算清单；MVU 写回由 store 层按清单执行。
// 定价复用自由市场 BASE 表：品质×(归一阶位+1)² 取区间中值；品质缺失兜底白色。
// ================================================================
import { parseQuality, refRange, type EquipCategory, type EquipQuality } from '../../wxhl-003/market/priceTable';

export interface LiqAsset {
  qty?: number;
  品质?: string;
  稀有度?: string; // 职业用稀有度当品质
  类型?: string;
  阶位?: string;
  名称?: string;
}

export interface LiquidationInput {
  positionsProceeds: number; // 持仓强平所得（调用方先用 closePosition 全部平仓后传入；预览时为净值估值）
  cash: number;
  bag: Record<string, LiqAsset>;
  equipment: Record<string, LiqAsset>;
  skills: Record<string, LiqAsset>;
  job: LiqAsset | null;
  bloodline: LiqAsset | null;
  talent: LiqAsset | null;
  playerTier: string; // 玩家当前阶位（技能/职业/血统/天赋的定价阶位）
  debt: number;
}

export type LiqCategory = '持仓' | '现金' | '背包' | '装备' | '通用技能' | '职业' | '血统' | '天赋';

export interface LiquidationStep {
  category: LiqCategory;
  name: string;
  proceeds: number;
}

export interface LiquidationResult {
  steps: LiquidationStep[];
  totalProceeds: number;
  remainingDebt: number;
  returnCash: number; // 抵债后溢出，退回交易所现金
  removedBag: string[];
  clearedSlots: string[];
  removedSkills: string[];
  clearJob: boolean;
  clearBloodline: boolean;
  clearTalent: boolean;
}

/** 单件资产清算价 = BASE[类型][品质] 中值 × (归一阶位+1)²。品质缺失/不可解析 → 白色兜底。 */
export function assetPrice(品质raw: string | undefined, 阶位: string, 类型: EquipCategory = '武器'): number {
  const parsed = parseQuality(品质raw ?? '');
  const quality: EquipQuality = parsed?.quality ?? '白色';
  if (!parsed) console.warn(`[wxhl-cg] 清算定价：品质「${品质raw}」不可解析，按白色兜底`);
  const range = refRange(quality, 类型, 阶位) ?? refRange('白色', 类型, '一阶')!;
  return Math.round(((range.min + range.max) / 2) * 100) / 100;
}

function equipCategoryOf(a: LiqAsset): EquipCategory {
  const t = String(a.类型 ?? '');
  if (t.includes('防具') || t.includes('甲')) return '防具';
  if (t.includes('饰品')) return '饰品';
  return '武器'; // 消耗品/道具按 GOODS_BASE_CATEGORY 惯例走武器列
}

export function computeLiquidation(input: LiquidationInput): LiquidationResult {
  const steps: LiquidationStep[] = [];
  const result: LiquidationResult = {
    steps,
    totalProceeds: 0,
    remainingDebt: input.debt,
    returnCash: 0,
    removedBag: [],
    clearedSlots: [],
    removedSkills: [],
    clearJob: false,
    clearBloodline: false,
    clearTalent: false,
  };
  let covered = 0; // 已抵金额

  const gain = (category: LiqCategory, name: string, proceeds: number) => {
    if (proceeds <= 0) return;
    steps.push({ category, name, proceeds });
    covered += proceeds;
  };
  const done = () => covered >= input.debt;

  // 1. 持仓强平所得 + 现金
  if (input.positionsProceeds > 0) gain('持仓', '全部持仓强平', input.positionsProceeds);
  if (!done() && input.cash > 0) gain('现金', '交易所现金', input.cash);

  // 2. 背包：最便宜先卖（整堆为单位）
  if (!done()) {
    const items = Object.entries(input.bag)
      .filter(([, a]) => (a.qty ?? 0) > 0)
      .map(([name, a]) => ({ name, price: assetPrice(a.品质, a.阶位 || input.playerTier, equipCategoryOf(a)) * (a.qty ?? 1) }))
      .sort((x, y) => x.price - y.price);
    for (const it of items) {
      if (done()) break;
      gain('背包', it.name, Math.round(it.price * 100) / 100);
      result.removedBag.push(it.name);
    }
  }

  // 3. 装备槽（名称为「无」的空槽跳过）
  if (!done()) {
    const slots = Object.entries(input.equipment)
      .filter(([, a]) => a.名称 && a.名称 !== '无')
      .map(([slot, a]) => ({ slot, name: a.名称!, price: assetPrice(a.品质, a.阶位 || input.playerTier, equipCategoryOf(a)) }))
      .sort((x, y) => x.price - y.price);
    for (const s of slots) {
      if (done()) break;
      gain('装备', `${s.slot}·${s.name}`, s.price);
      result.clearedSlots.push(s.slot);
    }
  }

  // 4. 通用技能（品质查武器列 × 玩家阶位²）
  if (!done()) {
    const skills = Object.entries(input.skills)
      .map(([name, a]) => ({ name, price: assetPrice(a.品质, input.playerTier) }))
      .sort((x, y) => x.price - y.price);
    for (const s of skills) {
      if (done()) break;
      gain('通用技能', s.name, s.price);
      result.removedSkills.push(s.name);
    }
  }

  // 5. 职业（稀有度当品质）
  if (!done() && input.job && input.job.名称 !== '无') {
    gain('职业', input.job.名称 ?? '职业', assetPrice(input.job.稀有度, input.playerTier));
    result.clearJob = true;
  }

  // 6. 血统（普通地球人类 = 默认血统，不值钱不卖）
  if (!done() && input.bloodline && input.bloodline.名称 !== '无' && input.bloodline.名称 !== '普通地球人类') {
    gain('血统', input.bloodline.名称 ?? '血统', assetPrice(input.bloodline.品质, input.playerTier));
    result.clearBloodline = true;
  }

  // 7. 天赋
  if (!done() && input.talent && input.talent.名称 !== '无') {
    gain('天赋', input.talent.名称 ?? '天赋', assetPrice(input.talent.品质, input.playerTier));
    result.clearTalent = true;
  }

  result.totalProceeds = Math.round(covered * 100) / 100;
  const excess = covered - input.debt;
  result.returnCash = excess > 0 ? Math.round(excess * 100) / 100 : 0;
  result.remainingDebt = Math.max(0, Math.round((input.debt - covered) * 100) / 100);
  return result;
}
