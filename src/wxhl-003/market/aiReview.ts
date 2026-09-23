import type { MarketKind, MarketItemSnapshot } from './priceTable';

// ================================================================
// 无由回廊 · 自由市场上架 AI 审核（前端，用卖家终端设置中配置的 API）
// 两道审核合一次调用：
//   1. 规则审核——效果语义强度判定「真实阶位」（一阶~五阶/超脱）。
//      2026-09-23 起超模不再拒绝，改为收费上架（费用由 fee.ts 按真实阶位计算）；
//      AI 负责语义层（效果文本实际达到哪一阶规格），数值层由 fee.assessDeterministic 反查。
//   2. 红线审核——政治敏感 / R18·18+·NSFW / 违法内容 → 仍然直接拒绝（不可收费放行）。
// 批量：一次调用可审多件（多选上架时只花一次 API）。
// 标注：卖家可手动把物品标为装备/道具，只影响本审核口径；
//       服务器仍按物品真实字段分类定价（防"标成道具"绕过装备价格上限）。
// fail-closed：未配置 API、调用失败、格式异常、红线命中 → 一律不上架（由 store.sell 保证）。
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
            realTier: { type: 'string' },
            opPoints: { type: 'array', items: { type: 'string' } },
          },
          required: ['名称', 'pass', 'reasons', 'realTier', 'opPoints'],
        },
      },
    },
    required: ['results'],
  },
} as const;

export interface ReviewVerdict {
  /** false = 红线/结构问题，拒绝上架（不可收费放行） */
  pass: boolean;
  reasons: string[];
  /** AI 判定的效果真实阶位下标 0..5（0..4=一阶~五阶，5=超脱）；解析失败为 null */
  realIdx: number | null;
  /** 超模点：哪里超模、超到什么程度 */
  opPoints: string[];
}

export interface ReviewTarget {
  item: MarketItemSnapshot;
  /** 卖家标注（未标注则按自动分类传入） */
  kind: MarketKind;
  /** 名义阶位下标 0..4（供 AI 对照判定真实阶位） */
  nominalIdx: number;
}

/** 世界书<装备效果强度限制>常驻数值基准（阶位 → 命中/闪避、伤害%、属性/防御加成） */
const EFFECT_BENCH = [
  '一阶: 命中/闪避+3~6%、伤害+7~13%、属性/防御+1',
  '二阶: 命中/闪避+5~10%、伤害+10~20%、属性/防御+2',
  '三阶: 命中/闪避+7~13%、伤害+13~27%、属性/防御+3',
  '四阶: 命中/闪避+8~17%、伤害+17~33%、属性/防御+4',
  '五阶: 命中/闪避+10~20%、伤害+20~40%、属性/防御+6',
].join('；');

const 装备规则段 = `【第一道 · 规则审核】（本物品按「装备」口径审：判定效果的真实阶位）
装备效果阶位参照：
- 常驻数值基准（按阶位）——${EFFECT_BENCH}
- 效果分常驻/触发/消耗三类：触发类数值至多常驻上限的 1.5~2 倍且须写明触发条件；消耗类强度最高且须写明消耗或冷却
- 每件装备最多 2 条效果（破限器可合法扩到 3 条，超过 3 条属结构违规，直接 pass=false）
- 必中/无敌/锁血/即死类强力效果：四阶以上紫/银品质且限定回合数（单次≤2回合）并有明确消耗才算四/五阶规格，否则视超出程度上调真实阶位
- 真实阶位判定：效果实际达到哪一阶的规格，就判哪一阶——超模不再直接拒绝，而是按真实阶位收取上架费，所以请诚实评估、不要放水也不要过严
- 数值字段（主/副属性加成、防御/闪避、伤害骰）已由回廊确定性规则反查阶位，你重点审「效果文本」的语义强度（如把超模数值伪装成触发条件、无冷却无限触发等）`;

const 道具规则段 = `【第一道 · 规则审核】（本物品按「道具」口径审：判定效果的真实阶位）
- 道具无装备数值基准，按「同等效果在装备上属于哪一阶规格」来判定真实阶位
- 普通药剂/消耗品的效果（回血、解毒、短时增益）是一阶规格
- 真实阶位判定：效果实际达到哪一阶的规格，就判哪一阶——超模不再直接拒绝，而是按真实阶位收取上架费，请诚实评估`;

const 红线段 = `【第二道 · 红线审核】（所有物品一视同仁，检查名称、描述、效果全文；描述可能含卖家自行补充的内容，一并审查。红线命中直接 pass=false，不可收费放行）
- 政治敏感：现实政治人物/事件/组织、意识形态宣传、现实国家间冲突的立场化内容
- R18 / 18+ / NSFW：色情、露骨性描写；任何涉及未成年人的性化内容是绝对红线，一律拒绝
- 违法内容：现实毒品/武器/爆炸物制作教唆、诈骗话术、现实犯罪指导
- 仅为施虐而施虐的极端血腥猎奇
注意：「无限回廊」是战斗向黑暗奇幻世界观，架空战斗、流血、死亡、恐怖元素是正常游戏内容，不算红线——不要过度保守，只有真正踩线的内容才拒绝。`;

/**
 * 构建审核提示词（纯函数）。批量时一次审多件，逐件给出结论。
 * 每件标注口径决定用装备规则还是道具规则；混批时两段都给。
 */
export function buildReviewPrompt(targets: ReviewTarget[]): string {
  const hasEquip = targets.some(t => t.kind === 'equip');
  const hasGoods = targets.some(t => t.kind === 'goods');
  const 规则段 = [hasEquip ? 装备规则段 : '', hasGoods ? 道具规则段 : ''].filter(Boolean).join('\n\n');

  const 清单 = targets
    .map(
      (t, i) =>
        `—${i + 1}—（${t.kind === 'equip' ? '装备' : '道具'}·名义${['一阶', '二阶', '三阶', '四阶', '五阶'][t.nominalIdx] ?? '一阶'}）\n${JSON.stringify(t.item)}`,
    )
    .join('\n');

  return `你是「无限回廊」自由市场的上架审核官。回廊是成年玩家游玩的中文文字跑团世界，玩家把物品挂上跨玩家市场前需通过你的审核。只输出 JSON，不要任何其他文字。

${规则段}

阶位序列：一阶 < 二阶 < 三阶 < 四阶 < 五阶 < 超脱。超脱的定义：一切超出五阶规格的效果——无限资源、无限锁血、现实改写、时间回溯、无代价即死、全属性倍增、规则系能力（抹杀概念、改写因果）等。

${红线段}

【待审物品清单】（共 ${targets.length} 件，逐件给出结论；名称必须与清单中的「名称」完全一致）
${清单}

【输出格式】
{"results": [{"名称": "物品名", "pass": true, "reasons": [], "realTier": "三阶", "opPoints": []}, {"名称": "另一件", "pass": false, "reasons": ["触犯红线：……"], "realTier": "五阶", "opPoints": ["效果X达到五阶规格：……"]}]}
- pass=true：允许上架。realTier 填效果真实阶位（与名义阶位相同则填名义阶位）；opPoints 仅在 realTier 高于名义阶位时逐条列出超模点（哪个效果、超出到什么程度），否则空数组
- pass=false：红线或结构违规，拒绝上架，reasons 逐条写明；realTier 仍填你的评估结果`;
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
  const realIdx = typeof parsed.realTier === 'string' ? ['一阶', '二阶', '三阶', '四阶', '五阶', '超脱'].indexOf(parsed.realTier.trim()) : -1;
  const opPoints = Array.isArray(parsed.opPoints)
    ? parsed.opPoints.map((r: unknown) => String(r).trim()).filter((r: string) => r.length > 0)
    : [];
  return { pass, reasons, realIdx: realIdx >= 0 ? realIdx : null, opPoints };
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
