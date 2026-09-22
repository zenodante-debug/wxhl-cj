import type { MarketKind, MarketItemSnapshot } from './priceTable';

// ================================================================
// 无由回廊 · 自由市场上架 AI 审核（前端，用卖家终端设置中配置的 API）
// 两道审核合一次调用：
//   1. 规则审核——装备数值/效果是否符合世界书<装备效果强度限制>（道具只看效果文本是否明显离谱）
//   2. 红线审核——政治敏感 / R18·18+·NSFW / 违法内容，装备道具一视同仁
// fail-closed：未配置 API、调用失败、格式异常、审核不过 → 一律不上架（由 store.sell 保证）
// 价格与硬性数值校验仍由 priceTable/equipRules/Worker 确定性规则兜底，AI 只管语义与内容。
// ================================================================

/** 审核结果 JSON Schema（aiGenerate 结构化输出） */
export const REVIEW_SCHEMA = {
  name: 'market_review',
  value: {
    type: 'object',
    properties: {
      pass: { type: 'boolean' },
      reasons: { type: 'array', items: { type: 'string' } },
    },
    required: ['pass', 'reasons'],
  },
} as const;

export interface ReviewVerdict {
  pass: boolean;
  reasons: string[];
}

/** 世界书<装备效果强度限制>常驻数值基准（阶位 → 命中/闪避、伤害%、属性/防御加成） */
const EFFECT_BENCH = [
  '一阶: 命中/闪避+3~6%、伤害+7~13%、属性/防御+1',
  '二阶: 命中/闪避+5~10%、伤害+10~20%、属性/防御+2',
  '三阶: 命中/闪避+7~13%、伤害+13~27%、属性/防御+3',
  '四阶: 命中/闪避+8~17%、伤害+17~33%、属性/防御+4',
  '五阶: 命中/闪避+10~20%、伤害+20~40%、属性/防御+6',
].join('；');

/** 构建审核提示词（纯函数）。kind=equip 附装备规则，goods 只做效果离谱度+红线 */
export function buildReviewPrompt(item: MarketItemSnapshot, kind: MarketKind): string {
  const snapshot = JSON.stringify(item, null, 1);
  const 规则段 =
    kind === 'equip'
      ? `【第一道 · 规则审核】（本物品是装备，需做数值与效果判断）
装备规则：
- 每件装备最多 2 条效果（效果条目破限器可合法扩到 3 条，超过 3 条为严重违规）
- 效果分常驻/触发/消耗三类：常驻仅限纯数值且不得超基准；触发类需写明触发条件，数值至多常驻上限的 1.5~2 倍；消耗类需写明消耗或冷却，强度最高
- 常驻数值基准（按阶位）——${EFFECT_BENCH}
- 必中/无敌/锁血/即死类强力效果：仅四阶以上紫/银品质装备可出现，且必须限定明确回合数（单次≤2回合）并有明确消耗
- 禁止：无条件即死、永久无敌、无限资源/锁血、无条件必中核心弱点、无代价强效果、效果无限循环联动
- 数值字段（主/副属性加成、防御/闪避、伤害骰）已由回廊确定性规则硬校验过，你重点审查「效果文本」的语义强度是否绕开上述基准（例如把超模数值伪装成触发条件、无冷却无限触发等）`
      : `【第一道 · 规则审核】（本物品是道具，无装备数值基准）
- 道具价格已由回廊按阶位硬性限制，你只看「效果」文本是否明显离谱：普通药剂/消耗品不应出现无条件即死、永久无敌、无限资源、改变整个战局的强力效果
- 有触发类/消耗类效果时，应写明触发条件或消耗`;

  return `你是「无限回廊」自由市场的上架审核官。回廊是成年玩家游玩的中文文字跑团世界，玩家把物品挂上跨玩家市场前需通过你的审核。只输出 JSON，不要任何其他文字。

${规则段}

【第二道 · 红线审核】（装备与道具一视同仁，检查物品名称、描述、效果全文）
- 政治敏感：现实政治人物/事件/组织、意识形态宣传、现实国家间冲突的立场化内容
- R18 / 18+ / NSFW：色情、露骨性描写；任何涉及未成年人的性化内容是绝对红线，一律拒绝
- 违法内容：现实毒品/武器/爆炸物制作教唆、诈骗话术、现实犯罪指导
- 仅为施虐而施虐的极端血腥猎奇
注意：「无限回廊」是战斗向黑暗奇幻世界观，架空战斗、流血、死亡、恐怖元素是正常游戏内容，不算红线——不要过度保守，只有真正踩线的内容才拒绝。

【待审物品】（${kind === 'equip' ? '装备' : '道具'}）
${snapshot}

【输出格式】
{"pass": true, "reasons": []}
或
{"pass": false, "reasons": ["逐条写清违反了什么规则/红线、涉及哪段文本、为什么"]}
pass=false 时 reasons 必须非空且具体。`;
}

/** 审核结果归一：格式异常抛错（调用方 fail-closed） */
export function reviewVerdict(parsed: any): ReviewVerdict {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('审核结果格式异常');
  if (typeof parsed.pass !== 'boolean') throw new Error('审核结果格式异常（缺少 pass）');
  const pass = parsed.pass;
  let reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map(r => String(r).trim()).filter(r => r.length > 0)
    : [];
  if (!pass && reasons.length === 0) reasons = ['AI 审核未通过（未给出具体理由），请调整物品内容后重试'];
  return { pass, reasons };
}

// ———— 审核结果缓存（同一内容不重复花 API 钱；改价/改数量不重审，改内容才重审） ————

const reviewCache = new Map<string, ReviewVerdict>();

/** 缓存键 = 物品内容（去掉数量）的稳定序列化。字段顺序无关（键排序后序列化） */
export function cacheKey(item: MarketItemSnapshot): string {
  const { 数量: _qty, ...rest } = item;
  const sorted = Object.keys(rest as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = (rest as Record<string, unknown>)[k];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

export function getCachedReview(item: MarketItemSnapshot): ReviewVerdict | null {
  return reviewCache.get(cacheKey(item)) ?? null;
}

export function setCachedReview(item: MarketItemSnapshot, verdict: ReviewVerdict): void {
  if (reviewCache.size > 200) reviewCache.clear(); // 会话级缓存，防无界增长
  reviewCache.set(cacheKey(item), verdict);
}
