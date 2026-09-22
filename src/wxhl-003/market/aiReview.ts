import type { MarketKind, MarketItemSnapshot } from './priceTable';

// ================================================================
// 无由回廊 · 自由市场上架 AI 审核（前端，用卖家终端设置中配置的 API）
// 两道审核合一次调用：
//   1. 规则审核——装备数值/效果是否符合世界书<装备效果强度限制>
//      （道具按卖家标注只审效果文本是否明显离谱）
//   2. 红线审核——政治敏感 / R18·18+·NSFW / 违法内容，装备道具一视同仁
// 批量：一次调用可审多件（多选上架时只花一次 API）。
// 标注：卖家可手动把物品标为装备/道具，只影响本审核口径；
//       服务器仍按物品真实字段分类定价（防"标成道具"绕过装备价格上限）。
// fail-closed：未配置 API、调用失败、格式异常、审核不过 → 一律不上架（由 store.sell 保证）
// 价格与硬性数值校验仍由 priceTable/equipRules/Worker 确定性规则兜底，AI 只管语义与内容。
// ================================================================

/** 审核结果 JSON Schema——一次审多件（aiGenerate 结构化输出） */
export const REVIEW_SCHEMA = {
  name: 'market_review',
  value: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            名称: { type: 'string' },
            pass: { type: 'boolean' },
            reasons: { type: 'array', items: { type: 'string' } },
          },
          required: ['名称', 'pass', 'reasons'],
        },
      },
    },
    required: ['results'],
  },
} as const;

export interface ReviewVerdict {
  pass: boolean;
  reasons: string[];
}

export interface ReviewTarget {
  item: MarketItemSnapshot;
  /** 卖家标注（未标注则按自动分类传入） */
  kind: MarketKind;
}

/** 世界书<装备效果强度限制>常驻数值基准（阶位 → 命中/闪避、伤害%、属性/防御加成） */
const EFFECT_BENCH = [
  '一阶: 命中/闪避+3~6%、伤害+7~13%、属性/防御+1',
  '二阶: 命中/闪避+5~10%、伤害+10~20%、属性/防御+2',
  '三阶: 命中/闪避+7~13%、伤害+13~27%、属性/防御+3',
  '四阶: 命中/闪避+8~17%、伤害+17~33%、属性/防御+4',
  '五阶: 命中/闪避+10~20%、伤害+20~40%、属性/防御+6',
].join('；');

const 装备规则段 = `【第一道 · 规则审核】（本物品按「装备」口径审：需做数值与效果判断）
装备规则：
- 每件装备最多 2 条效果（效果条目破限器可合法扩到 3 条，超过 3 条为严重违规）
- 效果分常驻/触发/消耗三类：常驻仅限纯数值且不得超基准；触发类需写明触发条件，数值至多常驻上限的 1.5~2 倍；消耗类需写明消耗或冷却，强度最高
- 常驻数值基准（按阶位）——${EFFECT_BENCH}
- 必中/无敌/锁血/即死类强力效果：仅四阶以上紫/银品质装备可出现，且必须限定明确回合数（单次≤2回合）并有明确消耗
- 禁止：无条件即死、永久无敌、无限资源/锁血、无条件必中核心弱点、无代价强效果、效果无限循环联动
- 数值字段（主/副属性加成、防御/闪避、伤害骰）已由回廊确定性规则硬校验过，你重点审查「效果文本」的语义强度是否绕开上述基准（例如把超模数值伪装成触发条件、无冷却无限触发等）`;

const 道具规则段 = `【第一道 · 规则审核】（本物品按「道具」口径审：无装备数值基准）
- 道具价格已由回廊按阶位硬性限制，你只看「效果」文本是否明显离谱：普通药剂/消耗品不应出现无条件即死、永久无敌、无限资源、改变整个战局的强力效果
- 有触发类/消耗类效果时，应写明触发条件或消耗`;

const 红线段 = `【第二道 · 红线审核】（所有物品一视同仁，检查名称、描述、效果全文）
- 政治敏感：现实政治人物/事件/组织、意识形态宣传、现实国家间冲突的立场化内容
- R18 / 18+ / NSFW：色情、露骨性描写；任何涉及未成年人的性化内容是绝对红线，一律拒绝
- 违法内容：现实毒品/武器/爆炸物制作教唆、诈骗话术、现实犯罪指导
- 仅为施虐而施虐的极端血腥猎奇
注意：「无限回廊」是战斗向黑暗奇幻世界观，架空战斗、流血、死亡、恐怖元素是正常游戏内容，不算红线——不要过度保守，只有真正踩线的内容才拒绝。`;

/**
 * 构建审核提示词（纯函数）。批量时一次审多件，逐件给出结论。
 * 卖家标注为「装备」才附数值基准，标为「道具」只审效果离谱度与红线。
 */
export function buildReviewPrompt(targets: ReviewTarget[]): string {
  const multi = targets.length > 1;
  const 清单 = targets
    .map((t, i) => {
      const head = `—${i + 1}—（${t.kind === 'equip' ? '装备' : '道具'}）\n${JSON.stringify(t.item)}`;
      return head;
    })
    .join('\n');

  const 规则段 = targets.some(t => t.kind === 'equip') ? 装备规则段 : 道具规则段;

  const 输出格式 = multi
    ? `{"results": [{"名称": "物品名", "pass": true, "reasons": []}, {"名称": "另一件", "pass": false, "reasons": ["违反了什么、涉及哪段文本、为什么"]}]}`
    : `{"results": [{"名称": "物品名", "pass": true, "reasons": []}]}`;

  return `你是「无限回廊」自由市场的上架审核官。回廊是成年玩家游玩的中文文字跑团世界，玩家把物品挂上跨玩家市场前需通过你的审核。只输出 JSON，不要任何其他文字。

${规则段}

${红线段}

【待审物品清单】（共 ${targets.length} 件，逐件给出结论；名称必须与清单中的「名称」完全一致）
${清单}

【输出格式】
${输出格式}
pass=false 时 reasons 必须非空且具体。`;
}

/** 单件审核结果归一：格式异常抛错（调用方 fail-closed） */
export function reviewVerdict(parsed: any): ReviewVerdict {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('审核结果格式异常');
  if (typeof parsed.pass !== 'boolean') throw new Error('审核结果格式异常（缺少 pass）');
  const pass = parsed.pass;
  let reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map((r: unknown) => String(r).trim()).filter((r: string) => r.length > 0)
    : [];
  if (!pass && reasons.length === 0) reasons = ['AI 审核未通过（未给出具体理由），请调整物品内容后重试'];
  return { pass, reasons };
}

/**
 * 批量审核结果归一 → Map<名称, ReviewVerdict>。
 * 接受 {"results":[...]} 或裸数组；清单里任何一件缺失结论 → 抛错（fail-closed，绝不放行未审物品）。
 */
export function reviewVerdicts(parsed: any, names: string[]): Map<string, ReviewVerdict> {
  const arr = Array.isArray(parsed) ? parsed : parsed?.results;
  if (!Array.isArray(arr)) throw new Error('审核结果格式异常（缺少 results）');
  const out = new Map<string, ReviewVerdict>();
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const name = String(row.名称 ?? '');
    if (!name) continue;
    try {
      out.set(name, reviewVerdict(row));
    } catch (_) {
      /* 单行格式异常 → 该件视为缺失，由下面的缺失检查兜底 */
    }
  }
  const missing = names.filter(n => !out.has(n));
  if (missing.length > 0) {
    throw new Error('AI 审核未覆盖以下物品：' + missing.join('、'));
  }
  return out;
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
