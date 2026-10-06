// ================================================================
// 无限回廊 · 前端战斗引擎 · 酒馆接口接线
// MVU 变量读写 / 脚本变量读写 / AI 调用
// ================================================================

import type { 战斗单位, 战斗解释, 战斗状态, 结算步骤 } from './types';
import { sanitizeJsonSchema } from '@/wxhl-003/schemaSanitize';
import type { ApiConfig } from './settings';
import { 构建翻译提示词, 解析翻译结果, 战斗解释_SCHEMA } from './ai/skillInterpreter';
import { 构建收尾提示词 } from './ai/aftermath';
import { 读设置 } from './settingsStore';

/**
 * 从 MVU 变量读取战斗单位
 * @param 路径 变量路径键，如 '副本角色.骨卫兵' | '小队.成员.白露露' | '契约者'
 */
export async function 读取战斗单位(路径: string): Promise<战斗单位> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const stat_data = vars?.stat_data;

  if (!stat_data?.契约者) {
    throw new Error('MVU 变量中没有契约者数据');
  }

  // 解析路径
  if (路径 === '契约者') {
    return {
      id: '契约者',
      阵营: '我方',
      类型: '玩家',
      // 属性/资源数值由开战流程填充，此处给占位默认值
      属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } },
      阶位: '一阶',
      HP_当前: 100,
      HP_最大: 100,
      MP_当前: 50,
      MP_最大: 50,
      耐力_当前: 100,
      耐力_最大: 100,
      防御: 0,
      闪避值: 10,
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
    };
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

  // 判定阵营
  let 阵营: '我方' | '敌方' = '敌方';
  if (容器 === '小队.成员') 阵营 = '我方';
  if (容器 === '其他契约者') 阵营 = '敌方'; // 默认敌方，可手动改

  return {
    id: 路径,
    阵营,
    类型: 实体.类型 || '杂兵',
    // 属性/资源数值由开战流程填充，此处给占位默认值
    属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } },
    阶位: '一阶',
    HP_当前: 100,
    HP_最大: 100,
    MP_当前: 50,
    MP_最大: 50,
    耐力_当前: 100,
    耐力_最大: 100,
    防御: 0,
    闪避值: 10,
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
  };
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

  // 特殊状态：把战斗里的 状态 写回
  for (const 单位 of Object.values(状态.单位)) {
    const 路径前缀 = 单位.id === '契约者' ? '契约者' : `契约者.${单位.id}`;
    const 特殊状态: Record<string, string> = {};
    for (const s of 单位.状态) {
      特殊状态[s.名] = s.层数 !== undefined ? `${s.层数}层|持续${s.持续}回合` : `持续${s.持续}回合`;
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
