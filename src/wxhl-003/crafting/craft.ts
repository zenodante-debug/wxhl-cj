// ================================================================
// 制作核心：DC 计算 / 五档判定 / 成功档波动 / 材料消耗 / 成品生成（纯函数）
// ================================================================
import type { Bag } from '../market/settle';
import type { MarketItemSnapshot } from '../market/priceTable';
import {
  ARMOR_NAME, TIER_COEF, TIER_NAMES, armorStats, attrBonus, nextQuality,
  weaponStats, wearThreshold, type ArmorSpectrum, type Attr, type Quality,
} from './equipTables';
import {
  INDUSTRY_ATTR, isBlueprintName,
  type MaterialCategory, type 材料档案条目, type 配方,
} from './recipes';
import { checkSkill, type 技能命中 } from './skillMatch';

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

/** 开工前的难度分档（纯函数：UI 的「检定值上限 vs DC」提示与回归测试共用）。
 *
 *  口径与 judgeRoll 逐点对齐：检定值 = d20 + 基础属性 + 技能等级，所以 `检定值上限` 就是 d20 取满值 20 时的
 *  检定值；反过来，成功（非「失败」）所需的最小 d20 = DC − 检定值上限 + 20。又因 judgeRoll 让
 *  d20=1 恒大失败、d20=20 恒杰作，分档为：
 *    - 需骰 ≤ 2 → 「必成」：上限已高到 d20=2 都不失败（自然 1 仍会炸炉，绝不粉饰成「稳成」）
 *    - 3..19  → 「靠骰运」：须掷出 ≥ 需骰
 *    - ≥ 20   → 「仅自然20」：2..19 全失败，只有自然 20 的杰作能成
 *  `需骰` 已夹到可掷范围内：必成档给 2，仅自然20 档给 21（d20 掷不出的哨兵）。
 *  调用方须保证入参是有限数（UI 在无配方时自行短路，不进这里）。 */
export interface 难度档位 {
  档: '必成' | '靠骰运' | '仅自然20';
  /** 成功所需的最小 d20（必成档夹为 2；仅自然20 档为哨兵 21 —— d20 掷不出来） */
  需骰: number;
}

export function 难度分档(检定值上限: number, dc: number): 难度档位 {
  const 需骰 = dc - 检定值上限 + 20;
  if (需骰 <= 2) return { 档: '必成', 需骰: 2 };
  if (需骰 <= 19) return { 档: '靠骰运', 需骰 };
  return { 档: '仅自然20', 需骰: 21 };
}

/** 成功档波动：正数在 [round(0.8×基准), 基准] 内取整；非正数原样返回 */
export function fluctuate(基准: number, rand: () => number): number {
  if (基准 <= 0) return 基准;
  return Math.round(基准 * (0.8 + rand() * 0.2));
}

/** 按类别从背包拣材料（排除指定物品与图纸），不足返回 null */
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
    // 图纸是生产资料、不是材料，绝不能被自动拣选烧掉：类别「任意」会放行任何条目，
    // 且 codexOf 的启发式还会把「图纸·狼王牙刃」按「牙」字归入怪物素材（玩家 4500 UP 买的东西一次无关制作就没了）。
    // 排除放在函数内而非交给调用方：autoPick 是 exported 纯函数，调用方不该承担「记得排除图纸」的义务。
    // 玩家显式指定为核心材料（input.核心材料）不经此路径，不受影响。
    if (isBlueprintName(name)) continue;
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
  // 数值模板（v2.1 起一律由 配方.参照模板 决定；本字段是配方未指定模板时的回落）：
  // 武器 = WEAPON_TABLE 键；防具 = ArmorSpectrum；饰品/道具 = ''
  子类型: string;
  副属性: Attr;
  数量: number; // 批量（≤ 配方.批量上限）
  核心材料: { 物品名: string; 数量: number }[]; // 配方可要求多种核心材料（v2.1）
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

/** 前置校验。`核心材料档位` = 玩家实际投入的核心材料在材料档案里的阶位（由调用方从 codex 查出；
 *  配方要求多种核心材料时传其中最高的那件）：
 *  validateCraft 是纯函数、签名里没有材料档案，spec §6.1 的「紫需高阶材料」只能靠调用方喂入。
 *  该参数仅紫色配方会读；白/蓝/金传不传都一样。未传（纯函数调用方无档案）按**不满足**处理——fail-closed。 */
export function validateCraft(input: CraftInput, bag: Bag, 核心材料档位?: number): string[] {
  const errs: string[] = [];
  const 行业 = input.配方.行业;
  const sk = input.制作者.技能;
  const 金紫 = input.配方.品质 === '金色' || input.配方.品质 === '紫色';
  // 技能判定（**分类 + 等级**）统一交给 checkSkill ——「哪条技能算这个行业的」这一层已在
  // store.assembleMaker 用 resolveSkill 四级回退解析过（映射表/精确名/模糊名/效果文本），
  // 这里只把结果装回「命中」形状（依据 只是审计信息，本层无需重解析）。
  // v2.1 的关键补漏：旧版只比 `等级`，`分类` 完全没查 —— 基础系 Lv.9 能过金图纸的「高级技能 Lv.1」。
  //
  // **分类要求由 品质 推导，不读 配方.技能要求.分类**（裁定）：所需分类本就由品质完全决定
  // （白/蓝 = 基础，金/紫 = 高级），把它再存一份在配方里既是冗余数据，又能被撒谎 ——
  // AI/GM 直写背包的坏图纸只要把 技能要求.分类 写成「基础」，读该字段的闸门就形同虚设。
  // 等级不推导（品质推不出：金 Lv.1 < 蓝 Lv.3，各自有各自的约定），仍读配方字段。
  const 所需分类: '基础' | '高级' = 金紫 ? '高级' : '基础';
  const 命中: 技能命中 | null = sk ? { 技能名: 行业, 技能: sk, 依据: '精确名' } : null;
  const 技能错误 = checkSkill(命中, { ...input.配方.技能要求, 分类: 所需分类 }, 行业);
  // 金/紫（v2 图纸系统）：需高级技能 + 对应生活系职业；缺图纸**不阻断**——由 executeCraft 走「降档 + DC+5」
  if (金紫) {
    // 无技能时只报「未掌握」一条（旧行为）：checkSkill 给的就是这一条，直接返回即可
    if (!sk) return errs;
    errs.push(...技能错误);
    if (!input.制作者.职业名 || input.制作者.职业名 === '无') errs.push('金/紫品质需对应生活系职业');
    // spec §6.1：紫 = 高级技能 Lv.5 + 职业 + **高阶材料**（至少一件核心材料的档案阶位 ≥ 配方阶位）
    if (input.配方.品质 === '紫色' && !(核心材料档位 !== undefined && 核心材料档位 >= input.配方.阶位)) {
      errs.push(`紫色配方需高阶材料：核心材料阶位${核心材料档位 === undefined ? '未知' : 核心材料档位} < 配方阶位${input.配方.阶位}`);
    }
  }
  if (input.阶位 > input.制作者.阶位上限) errs.push(`成品阶位超过契约者阶位上限（${input.制作者.阶位上限}）`);
  if (!sk) {
    errs.push(`未掌握生活技能「${行业}」`);
    return errs;
  }
  if (input.阶位 > sk.阶位) errs.push(`生活技能阶位不足（技能${sk.阶位}阶 < 成品${input.阶位}阶）`);
  // 白/蓝的技能错误放在这里报：金/紫那条路径上「先技能、后职业」的既有顺序（与 [0] 文案）保持不变
  if (!金紫) errs.push(...技能错误);
  if (input.设施.仅白色 && input.配方.品质 !== '白色') errs.push('野外简陋环境仅可制作白色品质');
  if (input.数量 > input.配方.批量上限) errs.push(`批量超过上限（${input.配方.批量上限}）`);
  const 全部投入 = [...input.核心材料, ...input.辅料];
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
  // 多核心材料：命名与描述里把各核心材料串起来（单核心时与 v1 逐字相同）
  const core = input.核心材料.map(m => m.物品名).join('、');
  const 主属性 = INDUSTRY_ATTR[input.配方.行业][0];
  const 署名 = 结果 === '杰作' ? `\n署名：由${input.制作者.姓名}亲手制造，永久刻印。` : '';
  // 数值一律取 配方.参照模板（v2.1）；配方.装备基础 已改为自由文本种类名，只参与显示/命名，**绝不查表**：
  // 「浮游炮」这类 AI 自创种类名若被当键查表要么抛错要么静默取错数值。模板/标准/旧图纸该字段为空 → 回落制作时选的子类型。
  const 基础 = input.配方.参照模板 || input.子类型;
  // 图纸特效落装：特效名 → 描述
  const 效果 = Object.fromEntries((input.配方.效果 ?? []).map(e => [e.描述, e.描述]));
  const 风味 = input.配方.描述 ? ` ${input.配方.描述}` : '';

  // 饰品（v2.1 新分支）：只加主/副属性，无伤害骰、无防闪、不负重
  if (input.配方.装备子类 === '饰品') {
    const 词 = input.配方.装备基础 || '饰品'; // 自由文本种类名即命名用词（如「指环」）
    const 名称 = input.配方.成品名 || `${core}${词}`;
    const b = attrBonus('饰品', tier, q);
    return {
      名称, 类型: '饰品', 品质: q, 阶位: TIER_NAMES[tier - 1],
      // 设计填补：世界书未给饰品专属穿戴门槛基准（只给了轻/中/重三档防具），饰品属轻量装备，
      // 故借用最宽松的轻装档；数值偏高时若裁决给出饰品专属基准，改这一行即可。
     穿戴门槛: wearThreshold('轻装', tier, q), 强化等级: 0, 伤害骰: '无', 倍率: 0,
      主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
      装备防御: 0, 装备闪避: 0, 负重: 0, 效果,
      描述: `手工制作的${q}${词}，以${core}为核心材料打造。${风味}${署名}`, 数量: 1,
    };
  }

  // 武器类型词（用于回落命名）；防具同理用光谱词。
  // 命名词一律在数值查询**之后**才算：非法输入若先撞 ARMOR_NAME[基础] 只会得到一条
  // 「Cannot read properties of undefined」，与武器分支 weaponStats 的可读报错不对称。
  if (input.配方.装备子类 === '武器') {
    const w = weaponStats(基础, tier, q);
    const b = attrBonus('武器', tier, q);
    return {
      名称: input.配方.成品名 || `${core}${基础}`, 类型: '武器', 品质: q, 阶位: TIER_NAMES[tier - 1],
      穿戴门槛: '无', 强化等级: 0, 伤害骰: w.伤害骰, 倍率: w.倍率,
      主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
      装备防御: 0, 装备闪避: 0, 负重: w.负重, 效果,
      描述: `手工制作的${q}${基础}，以${core}为核心材料打造。${风味}${署名}`, 数量: 1,
    };
  }
  // 防具
  const 光谱 = 基础 as ArmorSpectrum;
  const 光谱词 = ARMOR_NAME[光谱];
  // 与武器分支对称的可读报错：armorStats 内部先取 ARMOR_BASE[光谱][品质]，非法光谱在那里只会抛 TypeError
  if (!光谱词) throw new Error(`未知防具光谱：${光谱}（合法值：${Object.keys(ARMOR_NAME).join('/')}）`);
  const a = armorStats(光谱, tier, q);
  const b = attrBonus('躯干', tier, q);
  return {
    名称: input.配方.成品名 || `${core}${光谱词}`, 类型: '防具', 品质: q, 阶位: TIER_NAMES[tier - 1],
    穿戴门槛: wearThreshold(光谱, tier, q), 强化等级: 0, 伤害骰: '无', 倍率: 0,
    主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
    装备防御: roll(a.装备防御), 装备闪避: roll(a.装备闪避), 负重: a.负重, 效果,
    描述: `手工制作的${q}${光谱词}，以${core}为核心材料打造。${风味}${署名}`, 数量: 1,
  };
}

/** 道具成品生成（恢复量=固定值×阶位+属性修正×阶位系数；固定值/倍率均为设计填补）。
 *  v2.1：数值与效果一律取配方自带的结构化字段（道具类型/道具固定值/关联属性/效果），
 *  不再按成品名查内置标准道具配方——AI 自创道具与内置标准道具由此走同一条路径。 */
function buildGoods(input: CraftInput, 结果: CraftResult, rand: () => number): MarketItemSnapshot & { 数量: number } {
  const tier = input.阶位;
  const q = input.配方.品质;
  const 类别 = input.配方.道具类型;
  const 基准 = input.配方.道具固定值;
  const 关联属性 = input.配方.关联属性;
  const 署名 = 结果 === '杰作' ? `\n署名：由${input.制作者.姓名}亲手调制，永久刻印。` : '';
  // 图纸自带的风味文案（AI 定制）落到成品描述；模板/标准配方为空串
  const 风味 = input.配方.描述 ? ` ${input.配方.描述}` : '';
  // 图纸特效落装（与装备同一口径）：特效名 → 描述。AI 自创道具的效果就靠这一格带出来
  const 效果 = Object.fromEntries((input.配方.效果 ?? []).map(e => [e.描述, e.描述]));
  let 效果描述 = '';
  if (类别 === '恢复HP' || 类别 === '恢复MP') {
    const full = 结果 === '精制' || 结果 === '杰作';
    const 固定 = (full ? 基准 : fluctuate(基准, rand)) * (结果 === '杰作' ? 1.5 : 1);
    const 恢复量 = Math.round(固定 * tier + input.制作者.属性修正值[关联属性] * TIER_COEF[tier]);
    效果描述 = `${类别} ${恢复量}点。`;
  } else if (类别 === '爆炸物') {
    // 世界书伤害口径：伤害 = 基础随机骰 +（制作者对应属性修正 × 道具阶位系数），**骰数由品质决定**
    // （一阶 白2d6 / 蓝4d6 / 金6d6，没有自由参数）；世界书只列到金，紫沿用金的 6（设计填补）。
    // 配方.道具固定值 是**附加**固定伤害、不是骰数的替代——写成独立的加法项，0（标准配方恒为 0）时与 v1 逐字一致。
    const 品质骰: Record<Quality, number> = { 白色: 2, 蓝色: 4, 金色: 6, 紫色: 6 };
    const 骰数 = 品质骰[q] * tier;
    const 附加 = 基准 > 0 ? `+${基准}` : '';
    const 加值 = input.制作者.属性修正值[关联属性] * TIER_COEF[tier];
    效果描述 = `爆炸伤害 ${骰数}d6${附加}+${加值}。`;
  } else {
    效果描述 = `${类别}用品。`;
  }
  // 名称：配方.成品名（图纸指定）优先；为空回落配方名——内置标准道具是「按配方名认货」的
  //（世界书物价表商品名），若改用「核心材料名+类型词」会一次性改掉全部标准道具的名字
  const 名称 = input.配方.成品名 || input.配方.名称;
  return {
    名称, 类型: '道具', 品质: q, 阶位: TIER_NAMES[tier - 1],
    自制: true, 毒性值: tier, 效果,
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

  const 全部投入 = [...input.核心材料, ...input.辅料];
  let 扣减: CraftOutcome['扣减'];
  let 新增: CraftOutcome['新增'] = [];
  let HP伤害 = 0;

  if (结果 === '大失败') {
    扣减 = 全部投入.map(m => ({ ...m }));
    HP伤害 = input.阶位 * 10;
  } else if (结果 === '失败') {
    // 世界书原文「每种核心材料损毁 50%」：多核心时逐件各损一半（向上取整，与 v1 单核心口径一致），辅料保留
    扣减 = input.核心材料.map(m => ({ 物品名: m.物品名, 数量: Math.ceil(m.数量 / 2) }));
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
