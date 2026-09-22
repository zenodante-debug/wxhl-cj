// ================================================================
// AI 图纸：定制（从零生成）与补全（补齐残缺图纸）
// 硬校验：AI 只负责创意，数值一律过 effectRules 钳制、违禁项一律拒绝
// AI 调用经 store.ts 的 aiGenerate（复用终端设置里的 API 配置）
// 装备基础参照校验：AI 编造的武器名/防具光谱会流进 buildEquip 产出坏物品，
//   故必须落在 equipTables 的真实表里（WEAPON_TABLE 键 / 防具光谱），否则整体拒绝
// ================================================================
import { checkEffects, type EffectEntry } from './effectRules';
import { ARMOR_NAME, WEAPON_TABLE } from './equipTables';
import { BlueprintDataSchema, 配方Schema, type 图纸数据 } from './recipes';
import { extractJSON, getActiveCfg, useForumStore, aiGenerate } from '../store';

export interface DesignTarget {
  名称: string;
  成品类型: '装备' | '消耗品';
  子类: string; // 武器=WEAPON_TABLE 键 / 防具=光谱 / 消耗品=''
  品质: '金色' | '紫色';
  阶位: number;
  核心材料: string;
  行业: string;
}

/** AI 输出 schema：结构化，数值字段必须显式给出，便于硬钳制 */
export const DESIGN_SCHEMA = {
  name: 'craft_blueprint',
  value: {
    type: 'object',
    properties: {
      名称: { type: 'string' },
      描述: { type: 'string' },
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
    required: ['名称', '描述', '材料', '效果'],
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
【效果数值上限表】
${CAP_TEXT}`;

export function buildDesignPrompt(目标: DesignTarget): string {
  return `你是《无限回廊》的装备设计系统。根据契约者的要求设计一张制作图纸。

【设计目标】
名称：${目标.名称}
成品类型：${目标.成品类型}${目标.子类 ? `（${目标.子类}）` : ''}
品质：${目标.品质}
阶位：${目标.阶位}阶
行业：${目标.行业}
核心材料：${目标.核心材料}

${RULES}

【输出】只输出 JSON，字段：名称、描述（一两句风味文案，贴合核心材料）、材料（数组，每项含 类别/数量/核心；核心材料必须用「${目标.核心材料}」所属类别，数量 1~3；辅料 1~2 项）、效果（数组，0~2 条，每项含 类型/描述，数值型效果必须给出 命中闪避/伤害百分比/属性加成 中的对应字段）。`;
}

export function buildCompletePrompt(现有: 图纸数据, 阶位: number): string {
  return `你是《无限回廊》的装备设计系统。下面是一张残缺的制作图纸，请你补全缺失的部分（已有且合法的内容不要改动）。

【现有图纸】
${JSON.stringify(现有.配方, null, 2)}

【阶位】${阶位}阶（效果数值一律按该阶位上限）

${RULES}

【输出】只输出 JSON，字段同现有图纸结构：名称、描述、材料、效果。缺失的字段补上，已有的合法字段保持原样。`;
}

/** 纯函数硬校验：AI 返回的原始对象 → 合法图纸数据（或拒绝理由） */
export function sanitizeDesign(
  raw: unknown,
  目标: DesignTarget,
): { ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] } {
  const o = (raw ?? {}) as Record<string, any>;
  const reasons: string[] = [];

  const 品质 = String(o.品质 ?? 目标.品质);
  if (品质 === '银色') return { ok: false, reasons: ['银色为副本唯一剧情物品，不可制作'] };
  if (o.品质 && o.品质 !== 目标.品质) reasons.push(`品质被强制回到目标值「${目标.品质}」`);

  const 材料 = Array.isArray(o.材料) ? o.材料 : [];
  if (材料.length === 0) return { ok: false, reasons: [...reasons, '图纸缺少材料清单'] };

  const 效果原始: EffectEntry[] = Array.isArray(o.效果) ? o.效果 : [];
  const 效果检查 = checkEffects(效果原始, 目标.阶位);
  if (!效果检查.ok) return { ok: false, reasons: [...reasons, ...效果检查.reasons] };

  // 装备基础参照校验：必须命中 equipTables 的真实表，否则拒绝（AI 不得编造基础）
  let 装备子类 = '';
  let 装备基础 = '';
  if (目标.成品类型 === '装备') {
    if (Object.hasOwn(WEAPON_TABLE, 目标.子类)) {
      装备子类 = '武器';
      装备基础 = 目标.子类;
    } else if (Object.hasOwn(ARMOR_NAME, 目标.子类)) {
      装备子类 = '防具';
      装备基础 = 目标.子类;
    } else {
      return { ok: false, reasons: [...reasons, '未知的装备基础：' + 目标.子类] };
    }
  }
  // 消耗品：装备基础/装备子类 恒为空串（配方 schema 也只接受空串）

  const 配方 = 配方Schema.parse({
    名称: String(o.名称 ?? 目标.名称),
    来源: '图纸',
    行业: 目标.行业,
    成品类型: 目标.成品类型,
    装备子类,
    品质: 目标.品质,
    阶位: 目标.阶位,
    装备基础,
    材料: 材料.map((m: any) => ({
      类别: String(m.类别 ?? '任意'),
      数量: Math.max(1, Math.round(Number(m.数量 ?? 1))),
      核心: Boolean(m.核心),
    })),
    技能要求: { 分类: '高级', 等级: 目标.品质 === '金色' ? 1 : 5 },
    效果: 效果检查.效果,
    成品名: String(o.名称 ?? 目标.名称),
  });

  const 数据 = BlueprintDataSchema.parse({ 配方, 制作者: 'AI', 补全: false, 版本: 1 });
  return { ok: true, 数据, clamped: 效果检查.clamped };
}

function activeCfg() {
  return getActiveCfg(useForumStore().settings);
}

export async function generateBlueprint(
  目标: DesignTarget,
): Promise<{ ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }> {
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
  const 目标: DesignTarget = {
    名称: 现有.配方.名称,
    成品类型: 现有.配方.成品类型,
    子类: 现有.配方.装备基础,
    品质: 现有.配方.品质 === '紫色' ? '紫色' : '金色',
    阶位,
    核心材料: 现有.配方.材料.find(m => m.核心)?.类别 ?? '任意',
    行业: 现有.配方.行业,
  };
  try {
    const raw = await aiGenerate(cfg, buildCompletePrompt(现有, 阶位), COMPLETE_SCHEMA as any);
    const r = sanitizeDesign(extractJSON(raw), 目标);
    if (!r.ok) return r;
    return { ok: true, 数据: { ...r.数据, 补全: true }, clamped: r.clamped };
  } catch (e: any) {
    return { ok: false, reasons: [e?.message ?? 'AI 调用失败'] };
  }
}
