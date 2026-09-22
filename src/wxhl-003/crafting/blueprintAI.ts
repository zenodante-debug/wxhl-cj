// ================================================================
// AI 图纸：定制（从零生成）与补全（补齐残缺图纸）
// 硬校验：AI 只负责创意，数值一律过 effectRules 钳制、违禁项一律拒绝
// AI 调用经 store.ts 的 aiGenerate（复用终端设置里的 API 配置）
// 名称与数值来源分离（v2.1）：`装备基础` 只存自由文本种类名（显示/命名用，**绝不查表**），
//   数值一律走 `参照模板`（WEAPON_TABLE 键 / ArmorSpectrum；饰品为空）——故 AI 选的模板必须落在
//   真实表里且与 `装备子类` 同类，否则整体拒绝：AI 编造的模板键流进 buildEquip 就是坏物品（v2 会直接抛错）
// 道具（v2.1）：不再按成品名查表，AI 必须给出结构化 `道具类型`/`道具固定值`/`关联属性`，
//   越界数值一律钳制（钳制上限按品质），非法枚举值一律拒绝
// no-throw 契约：sanitizeDesign 对任何输入都只返回 ok:false + 理由（safeParse + 阶位守卫），
//   不用异常当拒绝信号——两个异步入口的 try/catch 只兜 AI 调用本身
// ================================================================
import { mergeBlueprintData } from './blueprint';
import { checkEffects, type EffectEntry } from './effectRules';
import { ARMOR_NAME, Q_ORDER, WEAPON_TABLE, type Quality } from './equipTables';
import {
  BlueprintDataSchema, 配方Schema, 道具类型列表, type 道具类型, type 图纸数据,
} from './recipes';
import { extractJSON, getActiveCfg, useForumStore, aiGenerate } from '../store';

export interface DesignTarget {
  成品类型: '装备' | '道具';
  /** 装备子类；道具恒为 ''（配方 schema 也只接受这三个值或空串） */
  装备子类: '武器' | '防具' | '饰品' | '';
  种类: string; // 自由文本种类名（如「浮游炮」），v2.1 起只参与显示与命名，数值另走 参照模板
  // AI 定制只服务金/紫（见 generateBlueprint 入口守卫）；补全沿用图纸原品质（白/蓝不可被静默升格），
  // 故这里是完整 Quality 而非「金色|紫色」——窄化会让补全路径与 技能要求表 无处安放
  品质: Quality;
  阶位: number; // 1~5，0 与越界一律拒绝（EFFECT_CAP[0] 是零哨兵行）
  核心材料: string[]; // 玩家选定的多件核心材料（物品名），进提示词
  行业: string;
  设计要求: string; // 玩家填的方向/要求：AI 定制的主输入，同时写进配方留痕
  名称: string; // 玩家填的成品名；可留空 → 用 AI 起的名字
}

/** AI 输出 schema：结构化，数值字段必须显式给出，便于硬钳制
 *  v2.1 新增两组互斥的数值来源字段（装备 vs 道具），两类都列进 required：
 *  模型漏给时 sanitizeDesign 只会拒（参照模板）或按「其他」兜底（道具类型），
 *  让模型每次都吐全，能把「少一个字段就烧掉一次生成」的失败模式挡在源头。 */
export const DESIGN_SCHEMA = {
  name: 'craft_blueprint',
  value: {
    type: 'object',
    properties: {
      名称: { type: 'string' },
      描述: { type: 'string' },
      参照模板: { type: 'string', description: '装备必填：数值模板，只能原样取提示词给定表内的值（武器名或防具光谱）；饰品与道具留空串' },
      道具类型: { type: 'string', enum: 道具类型列表, description: '道具必填：决定成品数值口径' },
      道具固定值: { type: 'number', description: '道具必填：非负数值基准。恢复HP/恢复MP＝基础恢复量（恢复量 = 固定值×阶位 + 属性修正×阶位系数）；爆炸物＝附加固定伤害（骰数由品质决定：白2/蓝4/金6/紫6 × 阶位，与该值无关）；其余类型无固定值时填 0。超过品质上限会被系统钳制' },
      关联属性: { type: 'string', enum: ['PER', 'CON'], description: '道具必填：该道具吃哪一项属性修正' },
      材料: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            类别: { type: 'string' },
            数量: { type: 'number' },
            核心: { type: 'boolean' },
          },
          required: ['类别', '数量', '核心'],
        },
      },
      效果: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            类型: { type: 'string', enum: ['常驻', '触发', '消耗'] },
            描述: { type: 'string' },
            命中闪避: { type: 'number' },
            伤害百分比: { type: 'number' },
            属性加成: { type: 'number' },
            触发条件: { type: 'string' },
            消耗: { type: 'string' },
          },
          required: ['类型', '描述'],
        },
      },
    },
    required: ['名称', '描述', '参照模板', '道具类型', '道具固定值', '关联属性', '材料', '效果'],
  },
} as const;

export const COMPLETE_SCHEMA = DESIGN_SCHEMA;

/** 效果强度上限表注入提示词（与 effectRules.EFFECT_CAP 同源，此处为可读文本） */
const CAP_TEXT = [
  '一阶：命中/闪避 +3~6%，伤害 +7~13%，属性/防御加成 +1',
  '二阶：命中/闪避 +5~10%，伤害 +10~20%，属性/防御加成 +2',
  '三阶：命中/闪避 +7~13%，伤害 +13~27%，属性/防御加成 +3',
  '四阶：命中/闪避 +8~17%，伤害 +17~33%，属性/防御加成 +4',
  '五阶：命中/闪避 +10~20%，伤害 +20~40%，属性/防御加成 +6',
].join('\n');

const RULES = `【硬性规则｜违反会被系统拒绝】
1. 效果最多 2 条。
2. 常驻类数值不得超过该阶位上限（见下表）；触发类/消耗类最多为其 2 倍，且必须同时写明「触发条件」与「消耗」。
3. 禁止：无条件即死、永久无敌、无限资源/锁血、无条件必中核心弱点、任何无代价强效果。
4. 品质只能是「金色」或「紫色」；银色为副本唯一剧情物品，不可制作。
5. 材料类别只能取：金属、布料皮革、草药、矿石、能量、怪物素材、食材、火药。
6. 数值来源字段（装备的 参照模板 / 道具的 道具类型、道具固定值、关联属性）只能取系统给定表或枚举内的值，**不得自创**：装备必须给 参照模板，道具必须给 道具类型 与 道具固定值。
【效果数值上限表】
${CAP_TEXT}`;

/** 道具固定值钳制上限（设计填补，可调）：白/蓝 ≤ 60、金 ≤ 120、紫 ≤ 200。
 *  依据：世界书物价表的白色/蓝色标准道具固定值为 20~55，金/紫图纸服务更高档位的成品，
 *  按品质逐级放宽即可拦住「一张图纸产出远超物价表恢复量」的失衡（钳制会在确认框留痕）。 */
const 道具固定值上限: Record<Quality, number> = { 白色: 60, 蓝色: 60, 金色: 120, 紫色: 200 };

/** 可取的数值模板清单（注入提示词用；与 equipTables 的表同源，AI 只能原样挑一个） */
const 武器模板清单 = Object.keys(WEAPON_TABLE).join('、');
const 防具模板清单 = Object.entries(ARMOR_NAME).map(([光谱, 词]) => `${光谱}（${词}）`).join('、');

/** 数值来源说明（两段提示词共用）：装备只认参照模板表、道具只认结构化字段，口径与拒收点都写清楚 */
function 数值说明(成品类型: '装备' | '道具', 装备子类: DesignTarget['装备子类']): string {
  if (成品类型 === '道具') {
    return `【数值来源｜必填】
道具类型：只能取 ${道具类型列表.join('/')} 之一，决定成品数值口径（恢复量 / 骰数 / 状态）。
道具固定值：非负数字。恢复HP/恢复MP＝基础恢复量（成品恢复量 = 固定值 × 阶位 + 属性修正 × 阶位系数）；
  爆炸物＝**附加固定伤害**（骰数由品质决定，一阶 白2d6/蓝4d6/金6d6，与该值无关）；其余类型无固定值时填 0。
  上限按品质（白/蓝 ≤ ${道具固定值上限.白色}、金 ≤ ${道具固定值上限.金色}、紫 ≤ ${道具固定值上限.紫色}），超过会被系统钳制。
关联属性：PER 或 CON（该道具吃哪一项属性修正）。
参照模板 与 装备子类 一律留空串。`;
  }
  if (装备子类 === '防具') {
    return `【数值来源｜必填：参照模板】
装备数值一律从下表取，你只能**原样**挑一个防具光谱（不得自创），它决定成品的装备防御/闪避/负重/穿戴门槛：
${防具模板清单}
「种类」只是风味名（例：种类「龙鳞披风」→ 参照模板「轻装」）。`;
  }
  if (装备子类 === '饰品') {
    return `【数值来源：饰品】
饰品不占参照模板：只加主/副属性加成（数值由系统按阶位与品质算），无伤害骰、无装备防御/闪避、不负重。
参照模板 一律留空串。
「种类」只是风味名（例：种类「指环」）。`;
  }
  return `【数值来源｜必填：参照模板】
装备数值一律从下表取，你只能**原样**挑一个武器名（不得自创），它决定成品的伤害骰/倍率/负重：
${武器模板清单}
「种类」只是风味名（例：种类「浮游炮」→ 参照模板「突击步枪」）。`;
}

export function buildDesignPrompt(目标: DesignTarget): string {
  const 玩家名称 = String(目标.名称 ?? '').trim();
  const 核心 = 目标.核心材料.join('、');
  return `你是《无限回廊》的装备设计系统。根据契约者的要求设计一张制作图纸。

【设计目标】
名称：${玩家名称 || '（玩家未指定，请按设计要求与核心材料起一个贴合的成品名）'}
成品类型：${目标.成品类型}${目标.种类 ? `（${目标.种类}）` : ''}
品质：${目标.品质}
阶位：${目标.阶位}阶
行业：${目标.行业}
核心材料：${核心 || '（未指定）'}
设计要求：${目标.设计要求 || '（无）'}

${数值说明(目标.成品类型, 目标.装备子类)}

${RULES}

【输出】只输出 JSON，字段：名称、描述（一两句风味文案，贴合核心材料与设计要求）、材料（数组，每项含 类别/数量/核心；核心材料必须用「${核心 || '核心材料'}」所属类别，数量 1~3；辅料 1~2 项）、效果（数组，0~2 条，每项含 类型/描述，数值型效果必须给出 命中闪避/伤害百分比/属性加成 中的对应字段），以及上面的数值来源字段（参照模板，或 道具类型/道具固定值/关联属性）。`;
}

export function buildCompletePrompt(现有: 图纸数据, 阶位: number): string {
  const r = 现有.配方;
  return `你是《无限回廊》的装备设计系统。下面是一张残缺的制作图纸，请你补全缺失的部分（已有且合法的内容不要改动）。

【现有图纸】
${JSON.stringify(r, null, 2)}

【阶位】${阶位}阶（效果数值一律按该阶位上限）

${数值说明(r.成品类型, r.装备子类)}

${RULES}

【输出】只输出 JSON，字段同现有图纸结构：名称、描述、材料、效果，以及上面的数值来源字段。
缺失的字段补上；已有的合法字段**原样返回**——尤其 参照模板/道具类型/道具固定值/关联属性 已有值时不得改写，
装备的 参照模板 缺失时按上面的表补一个与 装备子类 同类的。`;
}

/** zod issue 的最小结构（zod 4 的 issue 只带 path/values，不带原始取值，需自己沿 path 取回） */
type 解析问题 = { path: readonly PropertyKey[]; message: string; values?: readonly unknown[] };

/** 沿 zod 的 path 从被校验对象里取回非法取值，供理由展示 */
function 路径取值(root: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<any>((cur, k) => (cur == null ? undefined : cur[k]), root);
}

/** zod 错误 → 可读中文理由（带字段路径、允许集合、实收值），把 AI 的非法字段变成具体拒绝理由 */
function 解析理由(root: unknown, issues: readonly 解析问题[]): string[] {
  return issues.map(i => {
    const 字段 = i.path.map(String).join('.') || '(根)';
    const 实收 = 路径取值(root, i.path);
    const 实收文 = 实收 === undefined ? '' : `，实收「${typeof 实收 === 'object' ? JSON.stringify(实收) : String(实收)}」`;
    const 允许 = i.values ? `，允许：${i.values.map(String).join('/')}` : '';
    return `字段「${字段}」非法：${i.message}${允许}${实收文}`;
  });
}

/** 技能要求映射：白/蓝沿用 recipes.ts 的模板/标准货约定（基础 1/3），金/紫走图纸约定（高级 1/5）
 *  白/蓝不在图纸体系内（只有金/紫能生成图纸），但补全路径存在就该写对——
 *  一律给「高级 Lv.5」会让一张白图纸比金图纸还难做 */
const 技能要求表: Record<Quality, { 分类: '基础' | '高级'; 等级: number }> = {
  白色: { 分类: '基础', 等级: 1 },
  蓝色: { 分类: '基础', 等级: 3 },
  金色: { 分类: '高级', 等级: 1 },
  紫色: { 分类: '高级', 等级: 5 },
};

/** 纯函数硬校验：AI 返回的原始对象 → 合法图纸数据（或拒绝理由）
 *  契约：任何输入都不抛错（含 AI 编造的材料类别/效果类型、非法阶位），只返回 ok:false + 理由 */
export function sanitizeDesign(
  raw: unknown,
  目标: DesignTarget,
): { ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] } {
  const o = (raw ?? {}) as Record<string, any>;
  const reasons: string[] = [];
  const clamped: string[] = [];

  // 阶位守卫：EFFECT_CAP[0] 是「未使用」零哨兵行，若不拦住，descaleCap 会把一切效果数值静默钳成 0
  if (!Number.isInteger(目标.阶位) || 目标.阶位 < 1 || 目标.阶位 > 5) {
    return { ok: false, reasons: [`非法阶位：${目标.阶位}（图纸阶位只能是 1~5）`] };
  }

  const 品质 = String(o.品质 ?? 目标.品质);
  if (品质 === '银色') return { ok: false, reasons: ['银色为副本唯一剧情物品，不可制作'] };
  // 软修正必须同时进 clamped：成功路径只回传 clamped，只进 reasons 玩家看不到
  if (o.品质 && o.品质 !== 目标.品质) {
    const 提示 = `品质被强制回到目标值「${目标.品质}」`;
    reasons.push(提示);
    clamped.push(提示);
  }
  if (o.阶位 !== undefined && Number(o.阶位) !== 目标.阶位) {
    const 提示 = `阶位被强制回到目标值「${目标.阶位}阶」`;
    reasons.push(提示);
    clamped.push(提示);
  }

  const 材料 = Array.isArray(o.材料) ? o.材料 : [];
  if (材料.length === 0) return { ok: false, reasons: [...reasons, '图纸缺少材料清单'] };

  const 效果原始: EffectEntry[] = Array.isArray(o.效果) ? o.效果 : [];
  const 效果检查 = checkEffects(效果原始, 目标.阶位);
  if (!效果检查.ok) return { ok: false, reasons: [...reasons, ...效果检查.reasons] };

  // ---- 数值来源（v2.1）：装备 = 参照模板（真表键、且与子类同类）、道具 = 结构化字段 ----
  let 装备子类: '武器' | '防具' | '饰品' | '' = '';
  let 参照模板 = '';
  let 道具类型: 道具类型 = '其他';
  let 道具固定值 = 0;
  let 关联属性: 'PER' | 'CON' = 'PER';
  if (目标.成品类型 === '道具') {
    // 道具不查表：类型定口径、固定值定强度，成品数值由 buildGoods 按世界书公式算
    const 类型原文 = o.道具类型 === undefined ? '' : String(o.道具类型);
    if (类型原文 === '') {
      clamped.push('AI 未给道具类型，已按「其他」处理');
    } else if (道具类型列表.includes(类型原文 as 道具类型)) {
      道具类型 = 类型原文 as 道具类型;
    } else {
      return { ok: false, reasons: [...reasons, `非法道具类型「${类型原文}」：只能是 ${道具类型列表.join('/')}`] };
    }
    const 上限 = 道具固定值上限[目标.品质];
    const 固定值原文 = Number(o.道具固定值);
    if (!Number.isFinite(固定值原文) || 固定值原文 < 0) {
      clamped.push(`道具固定值「${String(o.道具固定值)}」不是非负有限数，已按 0 处理`);
    } else if (固定值原文 > 上限) {
      道具固定值 = 上限;
      clamped.push(`道具固定值 ${固定值原文} 超过「${目标.品质}」上限 ${上限}，已钳到 ${上限}`);
    } else {
      道具固定值 = 固定值原文;
    }
    // 关联属性 只影响 buildGoods 的属性修正项，不值得为它拒掉整张图纸：缺省/非法值都落回 PER 并留痕
    // （留痕与「AI 未给道具类型」对称：缺省也是 AI 漏填，静默兜底会让玩家看不出成品吃了哪项属性）
    const 关联原文 = o.关联属性;
    if (关联原文 === undefined) {
      clamped.push('AI 未给关联属性，已按 PER 处理');
    } else if (关联原文 !== 'PER' && 关联原文 !== 'CON') {
      clamped.push(`关联属性「${String(关联原文)}」非法，已按 PER 处理`);
    } else if (关联原文 === 'CON') {
      关联属性 = 'CON';
    }
  } else {
    // 装备：参照模板 必须命中 equipTables 的真实表且与 装备子类 同类，否则拒绝（AI 不得编造数值来源）
    const 子类 = 目标.装备子类;
    if (子类 !== '武器' && 子类 !== '防具' && 子类 !== '饰品') {
      return { ok: false, reasons: [...reasons, `装备子类非法：「${String(子类)}」（只能是 武器/防具/饰品）`] };
    }
    装备子类 = 子类;
    参照模板 = o.参照模板 === undefined ? '' : String(o.参照模板);
    if (子类 === '饰品') {
      // 饰品数值只走 attrBonus('饰品')，参照模板 无消费者——AI 硬塞的键一律清空，留在配方里只会误导 UI 与后续补全
      if (参照模板 !== '') {
        clamped.push(`饰品不走参照模板，已清空「${参照模板}」`);
        参照模板 = '';
      }
    } else if (子类 === '武器') {
      if (!Object.hasOwn(WEAPON_TABLE, 参照模板)) {
        return { ok: false, reasons: [...reasons, `非法参照模板「${参照模板}」：武器只能取 ${Object.keys(WEAPON_TABLE).join('/')}`] };
      }
    } else if (!Object.hasOwn(ARMOR_NAME, 参照模板)) {
      return { ok: false, reasons: [...reasons, `非法参照模板「${参照模板}」：防具只能取 ${Object.keys(ARMOR_NAME).join('/')}`] };
    }
  }

  // 名称：玩家填了就用玩家的（成品名由玩家定，AI 只管数值与风味），没填才用 AI 起的名字
  const 名称 = String(目标.名称 ?? '').trim() || String(o.名称 ?? '').trim();
  const 配方输入 = {
    名称,
    来源: '图纸',
    行业: 目标.行业,
    成品类型: 目标.成品类型,
    装备子类,
    品质: 目标.品质,
    阶位: 目标.阶位,
    // 自由文本种类名：v2.1 起只参与显示/命名，数值不再查它（道具恒为空串）
    装备基础: 目标.成品类型 === '装备' ? String(目标.种类 ?? '') : '',
    参照模板,
    道具类型,
    道具固定值,
    关联属性,
    设计要求: String(目标.设计要求 ?? ''),
    材料: 材料.map((m: any) => ({
      类别: String(m.类别 ?? '任意'),
      数量: Math.max(1, Math.round(Number(m.数量 ?? 1))),
      核心: Boolean(m.核心),
    })),
    技能要求: 技能要求表[目标.品质],
    效果: 效果检查.效果,
    成品名: 名称,
    描述: typeof o.描述 === 'string' ? o.描述 : '',
  };

  // AI 最可能的失败模式（编造材料类别/效果类型）只能在这一层拦住——用 safeParse 换成可读理由，绝不抛
  const 配方解析 = 配方Schema.safeParse(配方输入);
  if (!配方解析.success) return { ok: false, reasons: [...reasons, ...解析理由(配方输入, 配方解析.error.issues)] };

  const 数据输入 = { 配方: 配方解析.data, 制作者: 'AI', 补全: false, 版本: 1 };
  const 数据解析 = BlueprintDataSchema.safeParse(数据输入);
  if (!数据解析.success) return { ok: false, reasons: [...reasons, ...解析理由(数据输入, 数据解析.error.issues)] };

  return { ok: true, 数据: 数据解析.data, clamped: [...clamped, ...效果检查.clamped] };
}

/** 补全的纯函数主体：AI 原始返回 → 硬校验 → 与「现有」做 base 优先合并
 *  合流必须走 blueprint.mergeBlueprintData（Task 3 裁决：只填缺失/非法字段，绝不覆盖既有合法内容；
 *  名称是配方库去重键，尤不可被 AI 改写）——整份替换配方会让一次补全抹掉玩家已有的风味描述。
 *  抽成纯函数是为了可单测；completeBlueprint 只剩「取配置 + 调 AI」。
 *  契约与 sanitizeDesign 一致：任何输入都不抛错，只返回 ok:false + 理由。 */
export function sanitizeCompletion(
  raw: unknown,
  现有: 图纸数据,
  阶位: number,
): { ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] } {
  const 目标: DesignTarget = {
    成品类型: 现有.配方.成品类型,
    装备子类: 现有.配方.装备子类,
    种类: 现有.配方.装备基础,
    // 沿用图纸原品质：白/蓝映射成金色会静默升格（技能要求、定价全跟着变），只有不在允许集合内才回落金色
    品质: Q_ORDER.includes(现有.配方.品质) ? 现有.配方.品质 : '金色',
    阶位,
    核心材料: 现有.配方.材料.filter(m => m.核心).map(m => m.类别),
    行业: 现有.配方.行业,
    设计要求: 现有.配方.设计要求,
    名称: 现有.配方.名称,
  };
  // 装备补全的 参照模板 只能由 AI 重新给出（DesignTarget 里没有该字段：定制路径要 AI 挑、补全路径要沿用存档，
  // 两者语义相反，不能共用一个字段）。但 AI 漏给时先拿存档值垫上再进硬校验——否则一个小模型忘了这个字段，
  // 一次补全就白跑；而 mergeBlueprintData 的 base 优先本来也不会采纳它对存档值的改写。
  // AI 一旦给了值（哪怕是个编造的键）就照常走 sanitizeDesign 的硬校验：给了错值一律整份拒，绝不静默替换。
  const 原始 = (raw ?? {}) as Record<string, unknown>;
  const 免漏参照 = 现有.配方.参照模板 && 现有.配方.装备子类 !== '饰品' && !原始.参照模板
    ? { ...原始, 参照模板: 现有.配方.参照模板 }
    : raw;
  const r = sanitizeDesign(免漏参照, 目标);
  if (!r.ok) return r;
  // mergeBlueprintData 末尾还有一次 BlueprintDataSchema.parse：那条路径当前不可达失败
  // （送进去的「补」恒为 sanitizeDesign 产出的完整合法对象），但本函数已 export 为公开 API，
  // 与 sanitizeDesign 同契约——parse 失败时一律返回 ok:false 而非抛出，不给未来调用方埋坑。
  try {
    return { ok: true, 数据: mergeBlueprintData(现有, r.数据), clamped: r.clamped };
  } catch (e: any) {
    return { ok: false, reasons: [`合流后图纸不合法：${e?.message ?? '未知错误'}`] };
  }
}

function activeCfg() {
  return getActiveCfg(useForumStore().settings);
}

export async function generateBlueprint(
  目标: DesignTarget,
): Promise<{ ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }> {
  // 定制（从零生成）只服务金/紫图纸——世界书规则 4：白/蓝走模板配方，AI 定制不做白/蓝
  if (目标.品质 !== '金色' && 目标.品质 !== '紫色') {
    return { ok: false, reasons: [`AI 定制只支持金色/紫色图纸（收到「${目标.品质}」）`] };
  }
  const cfg = activeCfg();
  if (!cfg.url || !cfg.apiKey) return { ok: false, reasons: ['未配置 API——请到「终端设置」配置后再定制图纸'] };
  try {
    const raw = await aiGenerate(cfg, buildDesignPrompt(目标), DESIGN_SCHEMA as any);
    return sanitizeDesign(extractJSON(raw), 目标);
  } catch (e: any) {
    return { ok: false, reasons: [e?.message ?? 'AI 调用失败'] };
  }
}

export async function completeBlueprint(
  现有: 图纸数据,
  阶位: number,
): Promise<{ ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }> {
  const cfg = activeCfg();
  if (!cfg.url || !cfg.apiKey) return { ok: false, reasons: ['未配置 API——请到「终端设置」配置后再补全图纸'] };
  try {
    const raw = await aiGenerate(cfg, buildCompletePrompt(现有, 阶位), COMPLETE_SCHEMA as any);
    return sanitizeCompletion(extractJSON(raw), 现有, 阶位);
  } catch (e: any) {
    return { ok: false, reasons: [e?.message ?? 'AI 调用失败'] };
  }
}
