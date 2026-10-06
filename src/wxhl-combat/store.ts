// ================================================================
// 无限回廊 · 前端战斗引擎 · 酒馆接口接线
// MVU 变量读写 / 脚本变量读写 / AI 调用
// ================================================================

import type { 战斗单位, 战斗解释, 战斗状态, 结算步骤 } from './types';
import { sanitizeJsonSchema } from '@/wxhl-003/schemaSanitize';
import type { ApiConfig } from './settings';
import { 构建翻译提示词, 解析翻译结果, 战斗解释_SCHEMA } from './ai/skillInterpreter';
import { 构建敌方意图提示词, 解析敌方意图, type 敌方意图 } from './ai/enemyTactics';
import { 构建收尾提示词 } from './ai/aftermath';
import { buff转字符串 } from './engine/buffMapper';
import { 解析伤害骰 } from './engine/damage';
import { 读设置 } from './settingsStore';

/** 数值兜底：只接受有限数（合法的 0 与负数照收），其余（undefined/NaN/字符串）退回兜底值。 */
function 读数值(o: any, k: string, 兜底: number): number {
  const v = Number(o?.[k]);
  return Number.isFinite(v) ? v : 兜底;
}

/**
 * 读主武器（`实体.装备.主武器`）。
 * 未装备 / 空槽（名称 '无'）/ 伤害骰缺失或非法 → 返回 undefined（退化为徒手），
 * **绝不让非法骰式流进 `解析伤害骰` 在结算时抛错**。
 *
 * 倍率：卡里 `倍率` 的 zod prefault 是 0 —— 0 与「没写」在存档里分不开，
 * 而一把伤害骰合法的真武器不该因此把自己归零，所以**非正数一律取中性默认 1.0**。
 */
function 读主武器(槽: any): { 伤害骰: string; 倍率: number; 强化等级: number; 阶位: string } | undefined {
  if (!槽 || typeof 槽 !== 'object' || !槽.名称 || 槽.名称 === '无') return undefined;

  const 伤害骰 = typeof 槽.伤害骰 === 'string' ? 槽.伤害骰.trim() : '';
  if (!伤害骰 || 伤害骰 === '无') return undefined;
  try {
    解析伤害骰(伤害骰);
  } catch {
    return undefined;
  }

  const 倍率 = 读数值(槽, '倍率', 1);

  return {
    伤害骰,
    倍率: 倍率 > 0 ? 倍率 : 1,
    强化等级: 读数值(槽, '强化等级', 0),
    阶位: typeof 槽.阶位 === 'string' ? 槽.阶位 : '',
  };
}

/** 从 stat_data 定位一个实体。返回实体与容器路径（'契约者本体' 或容器名如 '副本角色'）。 */
function 定位单位(stat_data: any, 路径: string): { 实体: any; 容器: string } {
  if (!stat_data?.契约者) {
    throw new Error('MVU 变量中没有契约者数据');
  }

  if (路径 === '契约者') {
    return { 实体: stat_data.契约者, 容器: '契约者本体' };
  }

  // 副本角色.骨卫兵 / 小队.成员.白露露 / 其他契约者.某某
  // 容器路径段数可变（'小队.成员' 是两段），最后一段是名称，其余是容器路径
  const parts = 路径.split('.');
  if (parts.length < 2) {
    throw new Error(`无效的单位路径: ${路径}`);
  }

  const 名称 = parts[parts.length - 1];
  const 容器 = parts.slice(0, -1).join('.');
  const 容器对象 = 容器
    .split('.')
    .reduce<any>((node, key) => (node ? node[key] : undefined), stat_data.契约者);
  const 实体 = 容器对象?.[名称];

  if (!实体) {
    throw new Error(`单位不存在: ${路径}`);
  }

  return { 实体, 容器 };
}

/**
 * 从实体对象读四维/阶位/资源/防闪，缺字段给兜底。
 * 资源与防闪一律读 `衍生属性.*`（前端代算落盘后的值）。
 */
function 实体转战斗单位(实体: any, id: string, 阵营: '我方' | '敌方', 类型: string): 战斗单位 {
  const 头部 = 实体.头部 ?? {};
  const 属性实际 = 实体.属性?.实际 ?? {};
  const 衍生 = 实体.衍生属性 ?? {};

  return {
    id,
    阵营,
    类型,
    属性: {
      实际: {
        STR: 读数值(属性实际, 'STR', 5),
        AGI: 读数值(属性实际, 'AGI', 5),
        CON: 读数值(属性实际, 'CON', 5),
        PER: 读数值(属性实际, 'PER', 5),
      },
    },
    阶位: 头部.阶位 || '一阶',
    HP_当前: 读数值(衍生, 'HP_当前', 0),
    HP_最大: 读数值(衍生, 'HP_最大', 0),
    MP_当前: 读数值(衍生, 'MP_当前', 0),
    MP_最大: 读数值(衍生, 'MP_最大', 0),
    耐力_当前: 读数值(衍生, '耐力_当前', 0),
    耐力_最大: 读数值(衍生, '耐力_最大', 0),
    防御: 读数值(衍生, '防御', 0),
    闪避值: 读数值(衍生, '闪避值', 0),
    距离: 0,
    行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
    额度: 0,
    冷却: {},
    护盾: 0,
    架势: null,
    状态: [],
    濒死: null,
    资源: {},
    词条: new Set(),
    技能: {},
    主武器: 读主武器(实体.装备?.主武器),
  };
}

/**
 * 从 MVU 变量读取战斗单位（数值一律读实体真实值）。
 * @param 路径 变量路径键，如 '副本角色.骨卫兵' | '小队.成员.白露露' | '契约者'
 * @param 阵营 覆盖阵营判定；不传时契约者本体默认 '我方'，其余按容器推断
 */
export async function 读取战斗单位(路径: string, 阵营?: '我方' | '敌方'): Promise<战斗单位> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const { 实体, 容器 } = 定位单位(vars?.stat_data, 路径);

  if (路径 === '契约者') {
    return 实体转战斗单位(实体, '契约者', 阵营 ?? '我方', '玩家');
  }

  // 判定阵营：传入参数优先；未传时按容器推断（其他契约者默认敌方，可手动改）
  let 推断阵营: '我方' | '敌方' = '敌方';
  if (容器 === '小队.成员') 推断阵营 = '我方';

  return 实体转战斗单位(实体, 路径, 阵营 ?? 推断阵营, 实体.类型 || '杂兵');
}

/** 翻译器输入形状：一个效果来源一条（见 ai/skillInterpreter.ts 的 构建翻译提示词）。 */
export interface 单位效果源 {
  名称: string;
  类型: string;
  行动类型: string;
  关联属性: string;
  /** 技能/装备的阶位（原文，如 '一阶'）—— 翻译器据此取同阶伤害倍率与技能阶位序数 */
  阶位: string;
  消耗: string;
  冷却: string;
  射程: string;
  目标: string;
  效果: unknown;
}

/** 技能条目（通用技能 / 职业技能 / 传承技能）→ 一条效果源；缺字段填空串，形状稳定。 */
function 技能条目转效果源(名称: string, s: any): 单位效果源 {
  return {
    名称,
    类型: s?.类型 ?? '',
    行动类型: s?.行动类型 ?? '',
    关联属性: s?.关联属性 ?? '',
    阶位: s?.阶位 ?? '',
    消耗: s?.消耗 ?? '',
    冷却: s?.冷却 ?? '',
    射程: s?.射程 ?? '',
    目标: s?.目标 ?? '',
    效果: s?.效果 ?? {},
  };
}

/**
 * 把实体的**效果来源**拍平成 `构建翻译提示词` 能吃的一维数组（每个来源一条）：
 * 通用技能 / 职业.职业技能 / 职业.传承技能 / 装备（每件已装备槽一条）/ 天赋 / 血统。
 */
export async function 读取单位效果源(路径: string): Promise<单位效果源[]> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const { 实体 } = 定位单位(vars?.stat_data, 路径);

  const 出: 单位效果源[] = [];

  // 技能三来源
  const 技能来源 = [实体.通用技能, 实体.职业?.职业技能, 实体.职业?.传承技能];
  for (const 组 of 技能来源) {
    for (const [名称, s] of Object.entries<any>(组 ?? {})) {
      出.push(技能条目转效果源(名称, s));
    }
  }

  // 装备：每件已装备的槽位算一条。
  // 空槽记「无」——可能是字符串 '无' 或对象 { 名称: '无' }，两种都要跳过。
  for (const [槽, e] of Object.entries<any>(实体.装备 ?? {})) {
    if (!e || typeof e !== 'object' || !e.名称 || e.名称 === '无') continue;
    出.push({
      名称: `${e.名称}（${槽}）`,
      类型: '装备',
      行动类型: '无',
      关联属性: e.主属性 ?? '',
      阶位: e.阶位 ?? '',
      消耗: '无',
      冷却: '无',
      射程: '自身',
      目标: '自身',
      效果: e.效果 ?? {},
    });
  }

  // 天赋 / 血统：各一条（无则跳过）
  const 底牌来源: [string, any][] = [
    ['天赋', 实体.头部?.天赋],
    ['血统', 实体.头部?.血统],
  ];
  for (const [标签, b] of 底牌来源) {
    if (b && typeof b === 'object' && b.名称 && b.名称 !== '无') {
      出.push({
        名称: `${b.名称}（${标签}）`,
        类型: 标签,
        行动类型: '无',
        关联属性: '',
        阶位: '',
        消耗: '无',
        冷却: '无',
        射程: '自身',
        目标: '自身',
        效果: b.效果 ?? {},
      });
    }
  }

  return 出;
}

export interface 可参战单位 {
  id: string;
  名称: string;
  容器: '契约者本体' | '小队.成员' | '其他契约者' | '副本角色';
  类型: string;
  阶位: string;
  等级: number;
  HP_当前: number;
  HP_最大: number;
  默认阵营: '我方' | '敌方' | '待定';
}

/** 从 MVU 变量读四类容器，展开成可参战单位列表。MVU 无契约者数据时返回空数组。 */
export async function 读取可参战单位(): Promise<可参战单位[]> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const 契约者 = vars?.stat_data?.契约者;

  if (!契约者) return [];

  const 结果: 可参战单位[] = [];

  // 契约者本体
  结果.push({
    id: '契约者',
    名称: 契约者.头部?.姓名 || '契约者',
    容器: '契约者本体',
    类型: '玩家',
    阶位: 契约者.头部?.阶位 || '一阶',
    等级: Number(契约者.头部?.等级) || 1,
    HP_当前: Number(契约者.衍生属性?.HP_当前) || 0,
    HP_最大: Number(契约者.衍生属性?.HP_最大) || 0,
    默认阵营: '我方',
  });

  const 展开 = (
    容器: '小队.成员' | '其他契约者' | '副本角色',
    默认阵营: 可参战单位['默认阵营'],
  ) => {
    // 容器名是带点的路径（如 '小队.成员'），对应 MVU 变量里的嵌套结构：
    // 契约者.小队.成员.<名称>。逐段下钻，任一段缺失都当作空容器。
    const obj =
      (容器
        .split('.')
        .reduce<any>((node, key) => (node ? node[key] : undefined), 契约者) as
        | Record<string, any>
        | undefined) || {};
    for (const [名称, 实体] of Object.entries<any>(obj)) {
      结果.push({
        id: `${容器}.${名称}`,
        名称,
        容器,
        类型: 实体.类型 || '杂兵',
        阶位: 实体.头部?.阶位 || '一阶',
        等级: Number(实体.头部?.等级) || 1,
        HP_当前: Number(实体.衍生属性?.HP_当前) || 0,
        HP_最大: Number(实体.衍生属性?.HP_最大) || 0,
        默认阵营,
      });
    }
  };

  展开('小队.成员', '我方');
  展开('其他契约者', '待定');   // 敌友中立都可能 → 开战时手动选
  展开('副本角色', '敌方');     // 固有角色可能中立 → 开战时可改

  return 结果;
}

/** 从 AI 回复文本中抠出 JSON（直接 parse → 代码围栏 → 首个平衡括号段）。 */
function extractJSON(text: string): any {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch (_) {} }
  const first = text.search(/[\{\[]/);
  if (first >= 0) {
    const chars = [...text.slice(first)];
    let d = 0, inS = false, esc = false, end = -1;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inS = !inS; continue; }
      if (inS) continue;
      if (ch === '{' || ch === '[') d++;
      else if (ch === '}' || ch === ']') { d--; if (d === 0) { end = i; break; } }
    }
    if (end > 0) { try { return JSON.parse(text.slice(first, first + end + 1)); } catch (_) {} }
  }
  throw new Error('AI 回复中未找到有效 JSON，原始回复: ' + text.slice(0, 300));
}

/**
 * 精简版 aiGenerate（独立脚本自己的 AI 通道）。
 * - 请求侧 schema 先经 sanitizeJsonSchema 净化
 * - API 以 400 拒收 schema 时自动降级为纯提示词重试
 */
export async function aiGenerate(
  cfg: ApiConfig,
  userInput: string,
  jsonSchema?: { name: string; value: Record<string, any> },
): Promise<string> {
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置');
  if (typeof generateRaw !== 'function') throw new Error('generateRaw 不可用');

  let prompt = userInput;
  if (jsonSchema) {
    prompt = `【死命令】你只能返回一个合法的 JSON，不能包含任何 markdown、标题、解释性文字。直接输出 JSON。\n\n${userInput}`;
  }

  let lastErr = '';
  let schema已降级 = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const config: any = {
        user_input: prompt,
        custom_api: { apiurl: cfg.url, key: cfg.apiKey, model: cfg.model },
        ordered_prompts: ['user_input'],
        should_silence: true,
        max_chat_history: 0,
      };
      if (jsonSchema && !schema已降级) {
        config.json_schema = { name: jsonSchema.name, strict: true, value: sanitizeJsonSchema(jsonSchema.value) };
      }

      const result = await generateRaw(config);
      const text = typeof result === 'string' ? result : (result as any).content || '';

      if (!jsonSchema) return text;

      try {
        extractJSON(text);
        return text;
      } catch (_) {
        if (attempt < 2) {
          const warnings = [
            '【第一次警告】上次返回不是合法JSON。这次必须只输出JSON，不要任何其他内容。',
            '【最后一次警告】绝对只输出 {} 或 [] 包裹的 JSON。不要 markdown。不要解释。不要标题。只要 JSON。',
          ];
          prompt = warnings[attempt] + '\n\n' + userInput;
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw new Error('AI 连续3次返回了非 JSON 格式。原始回复: ' + text.slice(0, 300));
      }
    } catch (e: any) {
      lastErr = e.message || String(e);
      if (jsonSchema && !schema已降级 && /\b400\b|bad\s*request|invalid/i.test(lastErr)) {
        schema已降级 = true;
        continue;
      }
      if (attempt < 2 && !jsonSchema) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }
  throw new Error(lastErr || '生成失败');
}

/** 一次性翻译：把每个技能翻成战斗解释。API 未配置时抛错。 */
export async function 翻译战斗解释(技能列表: any[]): Promise<Record<string, 战斗解释>> {
  const cfg = 读设置().快路;
  if (!cfg.url || !cfg.apiKey) {
    throw new Error('API 未配置：请先在设置里配置 API');
  }

  const 结果: Record<string, 战斗解释> = {};
  for (const 技能 of 技能列表) {
    // 必须传 schema —— 否则 aiGenerate 缺省直接返回首答，非法 JSON 不会重试
    const raw = await aiGenerate(cfg, 构建翻译提示词(技能), 战斗解释_SCHEMA);
    结果[技能.名称] = 解析翻译结果(raw);
  }
  return 结果;
}

/**
 * 调快路 AI 为敌方单位生成行动意图（每回合一次）。
 * API 未配置时抛错；AI 回复不是合法 JSON 数组时由 `解析敌方意图` 抛错。
 * 注意：**不传 jsonSchema** —— 依赖 `aiGenerate` 的「无 schema 直返首答」路径，
 * 形状校验交给 `解析敌方意图`（非数组 / 缺字段都会抛错，由调用方兜底记日志）。
 */
export async function 生成敌方意图(状态: 战斗状态): Promise<敌方意图[]> {
  const cfg = 读设置().快路;
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置：请先在设置里配置 API');
  const raw = await aiGenerate(cfg, 构建敌方意图提示词(状态));
  return 解析敌方意图(raw);
}

/**
 * 把战斗结果写回 MVU 变量。
 * 铁律：只写 衍生属性.*_当前 与 状态.特殊状态；严禁写 *_最大/实际/属性修正值（前端代算）。
 * @param 状态 战斗状态
 * @param hp表 各单位的最终 HP_当前（单位 id → 数值）
 */
export async function 写回战斗结果(
  状态: 战斗状态,
  hp表: Record<string, { HP_当前?: number; MP_当前?: number; 耐力_当前?: number }>,
): Promise<void> {
  await waitGlobalInitialized('Mvu');
  const data = Mvu.getMvuData({ type: 'message', message_id: -1 });

  for (const [id, hp] of Object.entries(hp表)) {
    const 路径前缀 = id === '契约者' ? '契约者' : `契约者.${id}`;
    if (hp.HP_当前 !== undefined) _.set(data, `stat_data.${路径前缀}.衍生属性.HP_当前`, hp.HP_当前);
    if (hp.MP_当前 !== undefined) _.set(data, `stat_data.${路径前缀}.衍生属性.MP_当前`, hp.MP_当前);
    if (hp.耐力_当前 !== undefined) _.set(data, `stat_data.${路径前缀}.衍生属性.耐力_当前`, hp.耐力_当前);
  }

  // 特殊状态：把战斗里的 状态 写回。
  // 必须用 engine/buffMapper 的 buff转字符串 —— 它是本模块的规范编码器（有单测），
  // 会把「引擎段」的词条一并编码进去（如 元素崩坏 的 禁回复HP/禁回复MP）。
  // 手搓「N层 + 持续M回合」的字符串会整个丢掉词条，读回时引擎段就没了。
  // 语义：战斗引擎在战斗期间独占该字段，收尾时按存活状态重写（＝顺带清掉战斗期间已到期的）。
  for (const 单位 of Object.values(状态.单位)) {
    const 路径前缀 = 单位.id === '契约者' ? '契约者' : `契约者.${单位.id}`;
    const 特殊状态: Record<string, string> = {};
    for (const s of 单位.状态) {
      特殊状态[s.名] = buff转字符串(s);
    }
    _.set(data, `stat_data.${路径前缀}.状态.特殊状态`, 特殊状态);
  }

  await Mvu.replaceMvuData(data, { type: 'message', message_id: -1 });
}

/** 战斗结束：生成收尾正文 → 写入一条 assistant 楼层 */
export async function 写收尾楼层(步骤: 结算步骤[]): Promise<void> {
  const cfg = 读设置().强路;
  if (!cfg.url || !cfg.apiKey) {
    console.warn('[wxhl-combat] 强路 API 未配置，跳过收尾正文');
    return;
  }
  const 正文 = await aiGenerate(cfg, 构建收尾提示词(步骤));
  await createChatMessages([{ role: 'assistant', message: 正文 }]);
}

/** 战斗状态 → 可 JSON 序列化的纯对象（词条 Set → 数组） */
function 战斗状态转纯对象(状态: 战斗状态): any {
  return {
    ...状态,
    单位: Object.fromEntries(
      Object.entries(状态.单位).map(([k, u]) => [k, { ...u, 词条: [...(u.词条 ?? [])] }]),
    ),
  };
}

/** 纯对象 → 战斗状态（词条数组 → Set） */
function 纯对象转战斗状态(obj: any): 战斗状态 {
  return {
    ...obj,
    单位: Object.fromEntries(
      Object.entries(obj.单位 || {}).map(([k, u]: [string, any]) => [k, { ...u, 词条: new Set(u.词条 || []) }]),
    ),
  };
}

/** 读战斗状态（脚本变量）。没有则返回 null。 */
export async function 读战斗状态(): Promise<战斗状态 | null> {
  const v = getVariables({ type: 'script', script_id: getScriptId() }) as any;
  if (!v?.战斗 || !v.战斗.进行中) return null;
  return 纯对象转战斗状态(v.战斗);
}

/** 写战斗状态（脚本变量）。null = 清除。 */
export async function 写战斗状态(状态: 战斗状态 | null): Promise<void> {
  const scriptId = getScriptId();
  const v = getVariables({ type: 'script', script_id: scriptId }) as any;
  const 新变量 = { ...v, 战斗: 状态 ? 战斗状态转纯对象(状态) : undefined };
  if (!状态) delete 新变量.战斗;
  replaceVariables(新变量, { type: 'script', script_id: scriptId });
}
