// ================================================================
// 制作核心：DC 计算 / 五档判定 / 成功档波动 / 材料消耗 / 成品生成（纯函数）
// ================================================================
import type { Bag } from '../market/settle';
import type { MarketItemSnapshot } from '../market/priceTable';
import {
  ARMOR_NAME, TIER_COEF, TIER_NAMES, armorStats, attrBonus, nextQuality,
  weaponStats, wearThreshold, type ArmorSpectrum, type Attr, type Quality,
} from './equipTables';
import { GOODS_BASE, INDUSTRY_ATTR, type MaterialCategory, type 材料档案条目, type 配方 } from './recipes';

export type CraftResult = '大失败' | '失败' | '成功' | '精制' | '杰作';

export interface DCBreakdown {
  基础: number;
  修正: { 项: string; 值: number }[];
  最终: number;
}

export function computeDC(品质: Quality, 阶位: number, 修正: { 项: string; 值: number }[]): DCBreakdown {
  const 基础 = ({ 白色: 10, 蓝色: 15, 金色: 20, 紫色: 25 } as Record<Quality, number>)[品质];
  const sum = 修正.reduce((s, m) => s + m.值, 0);
  return { 基础, 修正, 最终: Math.floor((基础 + sum) * (1 + (阶位 - 1) / 1.4)) };
}

export function judgeRoll(d20: number, 检定值: number, dc: number): CraftResult {
  if (d20 === 1) return '大失败';
  if (d20 === 20) return '杰作';
  if (检定值 < dc) return '失败';
  if (检定值 < dc + 5) return '成功';
  return '精制';
}

/** 成功档波动：正数在 [round(0.8×基准), 基准] 内取整；非正数原样返回 */
export function fluctuate(基准: number, rand: () => number): number {
  if (基准 <= 0) return 基准;
  return Math.round(基准 * (0.8 + rand() * 0.2));
}

/** 按类别从背包拣材料（排除指定物品），不足返回 null */
export function autoPick(
  bag: Bag,
  codex: Record<string, 材料档案条目>,
  类别: MaterialCategory,
  需要: number,
  exclude: string[],
): { 物品名: string; 数量: number }[] | null {
  const picks: { 物品名: string; 数量: number }[] = [];
  let left = 需要;
  for (const [name, item] of Object.entries(bag)) {
    if (left <= 0) break;
    if (exclude.includes(name)) continue;
    if (类别 !== '任意' && codex[name]?.类别 !== 类别) continue;
    const take = Math.min(Number(item.数量), left);
    if (take > 0) {
      picks.push({ 物品名: name, 数量: take });
      left -= take;
    }
  }
  return left > 0 ? null : picks;
}

export interface CraftInput {
  配方: 配方;
  阶位: number; // 1~5，制作时选定
  子类型: string; // 武器: WEAPON_TABLE 键；防具: ArmorSpectrum；消耗品: ''
  副属性: Attr;
  数量: number; // 批量（≤ 配方.批量上限）
  核心材料: { 物品名: string; 数量: number };
  辅料: { 物品名: string; 数量: number }[];
  缺图纸: boolean;
  图纸持有: boolean; // 金/紫：图纸物品是否在手（不在手 → 强制降档 + 基础 DC+5）
  越阶材料: boolean;
  劣质材料: boolean;
  设施: { 修正: number; 仅白色: boolean; 标签: string };
  制作者: {
    姓名: string;
    阶位上限: number;
    基础属性: Record<Attr, number>;
    属性修正值: Record<Attr, number>;
    技能?: { 分类: string; 阶位: number; 等级: number };
    职业名: string;
  };
}

export interface CraftOutcome {
  结果: CraftResult;
  d20: number;
  检定值: number;
  DC: DCBreakdown;
  扣减: { 物品名: string; 数量: number }[];
  新增: (MarketItemSnapshot & { 数量: number })[];
  HP伤害: number;
  摘要: string[];
}

/** 前置校验。`核心材料档位` = 玩家实际投入的那件核心材料在材料档案里的阶位（由调用方从 codex 查出）：
 *  validateCraft 是纯函数、签名里没有材料档案，spec §6.1 的「紫需高阶材料」只能靠调用方喂入。
 *  该参数仅紫色配方会读；白/蓝/金传不传都一样。未传（纯函数调用方无档案）按**不满足**处理——fail-closed。 */
export function validateCraft(input: CraftInput, bag: Bag, 核心材料档位?: number): string[] {
  const errs: string[] = [];
  const sk = input.制作者.技能;
  // 金/紫（v2 图纸系统）：需高级技能 + 对应生活系职业；缺图纸**不阻断**——由 executeCraft 走「降档 + DC+5」
  if (input.配方.品质 === '金色' || input.配方.品质 === '紫色') {
    if (!sk) return [`未掌握生活技能「${input.配方.行业}」`];
    if (input.配方.品质 === '金色' && sk.等级 < 1) errs.push('金色图纸需高级技能 Lv.1');
    if (input.配方.品质 === '紫色' && sk.等级 < 5) errs.push('紫色图纸需高级技能 Lv.5');
    if (!input.制作者.职业名 || input.制作者.职业名 === '无') errs.push('金/紫品质需对应生活系职业');
    // spec §6.1：紫 = 高级技能 Lv.5 + 职业 + **高阶材料**（至少一件核心材料的档案阶位 ≥ 配方阶位）
    if (input.配方.品质 === '紫色' && !(核心材料档位 !== undefined && 核心材料档位 >= input.配方.阶位)) {
      errs.push(`紫色配方需高阶材料：核心材料阶位${核心材料档位 === undefined ? '未知' : 核心材料档位} < 配方阶位${input.配方.阶位}`);
    }
  }
  if (input.阶位 > input.制作者.阶位上限) errs.push(`成品阶位超过契约者阶位上限（${input.制作者.阶位上限}）`);
  if (!sk) {
    errs.push(`未掌握生活技能「${input.配方.行业}」`);
    return errs;
  }
  if (input.阶位 > sk.阶位) errs.push(`生活技能阶位不足（技能${sk.阶位}阶 < 成品${input.阶位}阶）`);
  const 需要等级 = input.配方.技能要求.等级;
  if (sk.等级 < 需要等级) errs.push(`技能等级不足：需要 Lv.${需要等级}，当前 Lv.${sk.等级}`);
  if (input.设施.仅白色 && input.配方.品质 !== '白色') errs.push('野外简陋环境仅可制作白色品质');
  if (input.数量 > input.配方.批量上限) errs.push(`批量超过上限（${input.配方.批量上限}）`);
  const 全部投入 = [input.核心材料, ...input.辅料];
  for (const m of 全部投入) {
    const have = Number(bag[m.物品名]?.数量 ?? 0);
    if (have < m.数量) errs.push(`「${m.物品名}」数量不足：现有 ${have}，需要 ${m.数量}`);
  }
  return errs;
}

/** 缺图纸判定：金/紫 = 图纸物品不在手（世界书「金/紫须图纸，无则强制降档且基础 DC+5」）；
 *  白/蓝本就不需图纸，沿用 v1 的「缺图纸」修正入口（兼容既有调用方，store 恒传 false） */
function 缺图纸降档(input: CraftInput): boolean {
  const 金紫 = input.配方.品质 === '金色' || input.配方.品质 === '紫色';
  return 金紫 ? !input.图纸持有 : input.缺图纸;
}

/** 缺图纸降档：金→蓝、紫→金；白/蓝不在降档范围（世界书只对金/紫强制降档），原样返回 */
function downgrade(q: Quality): Quality {
  if (q === '金色') return '蓝色';
  if (q === '紫色') return '金色';
  return q;
}

/** 装备成品生成 */
function buildEquip(input: CraftInput, 结果: CraftResult, rand: () => number): MarketItemSnapshot & { 数量: number } {
  // 缺图纸先强制降一档，杰作再升档；野外简陋环境（仅白色）升档也守住白色——validateCraft 只拦非白配方，拦不住掷出的升档
  const 基础品质 = 缺图纸降档(input) ? downgrade(input.配方.品质) : input.配方.品质;
  const q = 结果 === '杰作' && !input.设施.仅白色 ? nextQuality(基础品质) : 基础品质;
  const full = 结果 === '精制' || 结果 === '杰作';
  const roll = (b: number) => (full ? b : fluctuate(b, rand));
  const tier = input.阶位;
  const core = input.核心材料.物品名;
  const 主属性 = INDUSTRY_ATTR[input.配方.行业][0];
  const 署名 = 结果 === '杰作' ? `\n署名：由${input.制作者.姓名}亲手制造，永久刻印。` : '';
  // 图纸可指定武器类型/光谱（AI 定制），优先于制作时选的子类型；模板/标准配方该字段为空串 → 回落子类型
  const 基础 = input.配方.装备基础 || input.子类型;
  // 武器类型词（用于回落命名）；防具同理用光谱词
  const 词 = input.配方.装备子类 === '武器' ? 基础 : ARMOR_NAME[基础 as ArmorSpectrum];
  // 图纸特效落装：特效名 → 描述
  const 效果 = Object.fromEntries((input.配方.效果 ?? []).map(e => [e.描述, e.描述]));
  const 风味 = input.配方.描述 ? ` ${input.配方.描述}` : '';
  const 名称 = input.配方.成品名 || `${core}${词}`;

  if (input.配方.装备子类 === '武器') {
    const w = weaponStats(基础, tier, q);
    const b = attrBonus('武器', tier, q);
    return {
      名称, 类型: '武器', 品质: q, 阶位: TIER_NAMES[tier - 1],
      穿戴门槛: '无', 强化等级: 0, 伤害骰: w.伤害骰, 倍率: w.倍率,
      主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
      装备防御: 0, 装备闪避: 0, 负重: w.负重, 效果,
      描述: `手工制作的${q}${基础}，以${core}为核心材料打造。${风味}${署名}`, 数量: 1,
    };
  }
  // 防具
  const 光谱 = 基础 as ArmorSpectrum;
  const a = armorStats(光谱, tier, q);
  const b = attrBonus('躯干', tier, q);
  return {
    名称, 类型: '防具', 品质: q, 阶位: TIER_NAMES[tier - 1],
    穿戴门槛: wearThreshold(光谱, tier, q), 强化等级: 0, 伤害骰: '无', 倍率: 0,
    主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
    装备防御: roll(a.装备防御), 装备闪避: roll(a.装备闪避), 负重: a.负重, 效果,
    描述: `手工制作的${q}${ARMOR_NAME[光谱]}，以${core}为核心材料打造。${风味}${署名}`, 数量: 1,
  };
}

/** 消耗品成品生成（恢复量=固定值×阶位+属性修正×阶位系数；固定值/倍率均为设计填补） */
function buildGoods(input: CraftInput, 结果: CraftResult, rand: () => number): MarketItemSnapshot & { 数量: number } {
  const base = GOODS_BASE[input.配方.名称];
  const tier = input.阶位;
  const q = input.配方.品质;
  const 署名 = 结果 === '杰作' ? `\n署名：由${input.制作者.姓名}亲手调制，永久刻印。` : '';
  // 图纸自带的风味文案（AI 定制）落到成品描述；模板/标准配方为空串
  const 风味 = input.配方.描述 ? ` ${input.配方.描述}` : '';
  let 效果描述 = '';
  if (base && (base.类别 === '恢复HP' || base.类别 === '恢复MP')) {
    const full = 结果 === '精制' || 结果 === '杰作';
    const 固定 = (full ? base.固定值 : fluctuate(base.固定值, rand)) * (结果 === '杰作' ? 1.5 : 1);
    const 恢复量 = Math.round(固定 * tier + input.制作者.属性修正值[base.关联属性] * TIER_COEF[tier]);
    效果描述 = `${base.类别 === '恢复HP' ? '恢复HP' : '恢复MP'} ${恢复量}点。`;
  } else if (base && base.类别 === '爆炸物') {
    const 骰数 = (q === '白色' ? 2 : 4) * tier; // 世界书一阶白2d6/蓝4d6，高阶骰数×阶位（设计填补）
    const 加值 = input.制作者.属性修正值[base.关联属性] * TIER_COEF[tier];
    效果描述 = `爆炸伤害 ${骰数}d6+${加值}。`;
  } else if (base) {
    效果描述 = `${base.类别}用品。`;
  }
  return {
    名称: input.配方.名称, 类型: '消耗品', 品质: q, 阶位: TIER_NAMES[tier - 1],
    自制: true, 毒性值: tier,
    描述: `${效果描述}（自制品：同类连用效果减半，含毒性需医疗中心净化）${风味}${署名}`,
    数量: input.数量,
  };
}

export function executeCraft(input: CraftInput, d20: number, rand: () => number): CraftOutcome {
  const 修正 = [
    ...(缺图纸降档(input) ? [{ 项: '缺图纸', 值: 5 }] : []),
    ...(input.越阶材料 ? [{ 项: '越阶高级材料代替', 值: -2 }] : []),
    ...(input.劣质材料 ? [{ 项: '劣质材料替代', 值: 3 }] : []),
    ...(input.设施.修正 !== 0 ? [{ 项: input.设施.标签, 值: input.设施.修正 }] : []),
  ];
  const DC = computeDC(input.配方.品质, input.阶位, 修正);
  const attr值 = Math.max(...INDUSTRY_ATTR[input.配方.行业].map(a => input.制作者.基础属性[a]));
  const 技能等级 = input.制作者.技能?.等级 ?? 0;
  const 检定值 = d20 + attr值 + 技能等级;
  const 结果 = judgeRoll(d20, 检定值, DC.最终);

  const 全部投入 = [input.核心材料, ...input.辅料];
  let 扣减: CraftOutcome['扣减'];
  let 新增: CraftOutcome['新增'] = [];
  let HP伤害 = 0;

  if (结果 === '大失败') {
    扣减 = 全部投入.map(m => ({ ...m }));
    HP伤害 = input.阶位 * 10;
  } else if (结果 === '失败') {
    扣减 = [{ 物品名: input.核心材料.物品名, 数量: Math.ceil(input.核心材料.数量 / 2) }];
    新增 = [{ 名称: '灰色废料', 描述: '制作失败留下的残渣，毫无价值。', 数量: input.数量 }];
  } else {
    扣减 = 全部投入.map(m => ({ ...m }));
    const product = input.配方.成品类型 === '装备' ? buildEquip(input, 结果, rand) : buildGoods(input, 结果, rand);
    新增 = [product];
  }

  return {
    结果, d20, 检定值, DC, 扣减, 新增, HP伤害,
    摘要: [
      `D20=${d20} + 基础属性${attr值} + 技能Lv.${技能等级} = ${检定值} vs DC${DC.最终}`,
      `结果：${结果}`,
    ],
  };
}
