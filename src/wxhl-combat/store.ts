// ================================================================
// 无限回廊 · 前端战斗引擎 · 酒馆接口接线
// MVU 变量读写 / 脚本变量读写 / AI 调用
// ================================================================

import type { 战斗单位, 战斗解释, 战斗状态, 结算步骤 } from './types';
import { sanitizeJsonSchema } from '@/wxhl-003/schemaSanitize';
import type { ApiConfig } from './settings';
import { 构建批量翻译提示词, 解析批量翻译结果, 批量战斗解释_SCHEMA, type 条目解析结果 } from './ai/skillInterpreter';
import { 效果指纹, 翻译缓存版本 } from './ai/translationCache';
import { 构建敌方意图提示词, 解析敌方意图, 敌方意图_SCHEMA, type 敌方意图 } from './ai/enemyTactics';
import { 提取JSON宽容 } from './ai/jsonExtract';
import { 构建收尾提示词 } from './ai/aftermath';
import { buff转字符串 } from './engine/buffMapper';
import { 解析伤害骰 } from './engine/damage';
import { 移动距离计算 } from './engine/distance';
import { 重算全部实体 } from './engine/derived';
import { 读设置 } from './settingsStore';
import { 构建战斗状态快照, 恢复战斗状态, type 战斗快照, type 意图模式 } from './engine/persist';

/** 数值兜底：只接受有限数（合法的 0 与负数照收），其余（undefined/NaN/字符串）退回兜底值。 */
function 读数值(o: any, k: string, 兜底: number): number {
  const v = Number(o?.[k]);
  return Number.isFinite(v) ? v : 兜底;
}

/**
 * 读一把武器（`实体.装备.<槽>`，槽 = 主武器 / 副武器）。
 * 未装备 / 空槽（名称 '无'）/ 伤害骰缺失或非法 → 返回 undefined（退化为徒手），
 * **绝不让非法骰式流进 `解析伤害骰` 在结算时抛错**。
 *
 * 倍率：卡里 `倍率` 的 zod prefault 是 0 —— 0 与「没写」在存档里分不开，
 * 而一把伤害骰合法的真武器不该因此把自己归零，所以**非正数一律取中性默认 1.0**。
 */
function 读武器(槽: any): { 伤害骰: string; 倍率: number; 强化等级: number; 阶位: string } | undefined {
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
 * 把实体的装备拍平成**展示用**清单（界面详情面板要看得见穿了什么）。
 * 只做展示：引擎的判定不读它（防御/闪避已在 `衍生属性` 里算好了）。
 */
function 读装备清单(装备: any): Array<{ 槽: string; 名称: string; 摘要: string }> {
  const 出: Array<{ 槽: string; 名称: string; 摘要: string }> = [];
  for (const [槽, e] of Object.entries<any>(装备 ?? {})) {
    if (!e || typeof e !== 'object' || !e.名称 || e.名称 === '无') continue;
    const 段: string[] = [];
    if (e.伤害骰 && e.伤害骰 !== '无') 段.push(`伤害骰 ${e.伤害骰}`);
    if (Number(e.倍率) > 0) 段.push(`×${e.倍率}`);
    if (Number(e.强化等级) > 0) 段.push(`强化+${e.强化等级}`);
    if (Number(e.装备防御) > 0) 段.push(`防御+${e.装备防御}`);
    if (Number(e.装备闪避) > 0) 段.push(`闪避+${e.装备闪避}`);
    if (e.主属性 && e.主属性 !== '无') 段.push(`${e.主属性}+${Number(e.主属性加成) || 0}`);
    if (e.副属性 && e.副属性 !== '无') 段.push(`${e.副属性}+${Number(e.副属性加成) || 0}`);
    if (e.品质) 段.push(String(e.品质));
    出.push({ 槽, 名称: String(e.名称), 摘要: 段.join(' · ') });
  }
  return 出;
}

/**
 * 从实体对象读四维/阶位/资源/防闪，缺字段给兜底。
 * 资源与防闪一律读 `衍生属性.*`（前端代算落盘后的值）。
 * 防御/闪避值/移动距离 在卡里**已经是含额外加成的总值**（见 wxhl-003 statusbar 的代算：
 * `def = ⌊(conMod+5)×0.2⌋ + 防御额外加成 + 装备防御`）—— 直接读，不要再自己加。
 */
function 实体转战斗单位(实体: any, id: string, 阵营: '我方' | '敌方', 类型: string): 战斗单位 {
  const 头部 = 实体.头部 ?? {};
  const 属性实际 = 实体.属性?.实际 ?? {};
  const 衍生 = 实体.衍生属性 ?? {};

  const 阶位 = 头部.阶位 || '一阶';
  const AGI = 读数值(属性实际, 'AGI', 5);

  // 显示名：变量里的「头部.姓名」；缺省退回 id 末段（界面/日志一律用它，别再把玩家叫「契约者」）
  const 姓名 = typeof 头部.姓名 === 'string' ? 头部.姓名.trim() : '';

  // 移动距离：读卡里的衍生值（含「移动距离额外加成」）；还没代算过（=0）就按公式现算
  const 卡内移动距离 = 读数值(衍生, '移动距离', 0);

  return {
    id,
    名称: 姓名 || id.split('.').pop()!,
    阵营,
    类型,
    属性: {
      实际: {
        STR: 读数值(属性实际, 'STR', 5),
        AGI,
        CON: 读数值(属性实际, 'CON', 5),
        PER: 读数值(属性实际, 'PER', 5),
      },
    },
    阶位,
    HP_当前: 读数值(衍生, 'HP_当前', 0),
    HP_最大: 读数值(衍生, 'HP_最大', 0),
    MP_当前: 读数值(衍生, 'MP_当前', 0),
    MP_最大: 读数值(衍生, 'MP_最大', 0),
    耐力_当前: 读数值(衍生, '耐力_当前', 0),
    耐力_最大: 读数值(衍生, '耐力_最大', 0),
    防御: 读数值(衍生, '防御', 0),
    闪避值: 读数值(衍生, '闪避值', 0),
    移动距离: 卡内移动距离 > 0 ? 卡内移动距离 : 移动距离计算(AGI, 阶位, 0),
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
    主武器: 读武器(实体.装备?.主武器),
    副武器: 读武器(实体.装备?.副武器),
    装备: 读装备清单(实体.装备),
  };
}

/**
 * 开战前重算**全部实体**的衍生属性并写回 MVU。
 *
 * 为什么必须有这一步：`HP_最大 / 防御 / 闪避值 / 移动距离 / 属性.实际` 是"小手机"状态栏
 * 在变量更新时算出来落盘的 —— **玩家不开一次小手机，代算就不发生**，战斗里读到的是过期甚至
 * 为 0 的防御/闪避，而 AI 刚把 属性.基础 写得更高，两下就对不上（实战反馈：命中 DC 473、
 * 混合伤害 93133、HP 却只有 6690）。战斗脚本不能指望另一个脚本先跑，得自己算。
 *
 * 算完**写回 MVU**，顺带让状态栏/面板也能看到最新的面板值。
 */
export async function 重算参战衍生属性(): Promise<void> {
  await waitGlobalInitialized('Mvu');
  const data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  if (!data?.stat_data) return;
  重算全部实体(data.stat_data);
  await Mvu.replaceMvuData(data, { type: 'message', message_id: -1 });
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

/** 翻译器输入形状：一个效果来源一条（见 ai/skillInterpreter.ts 的 待翻译条目）。 */
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
 * 把实体的**效果来源**拍平成翻译器能吃的一维数组（`待翻译条目.来源`）（每个来源一条）：
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

/**
 * 给一个 Promise 套上超时。
 * 为什么必须自己兜：`generateRaw` 的 config **没有 timeout 字段**（见 @types/function/generate.d.ts），
 * 一个不响应的请求会永远挂着 —— 界面上表现为「点了没反应」。开战要连发几十个请求，
 * 没有这道兜底就没法给玩家任何交代。
 * @param ms 非正数/非有限数视为「不超时」
 */
/** setTimeout 的 delay 上限（2^31−1）。超过它的值会让定时器**立刻触发**，而不是等到那时候。 */
const 定时器上限 = 2147483647;

function 带超时<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;

  // ⚠️ 溢出守卫：`setTimeout(fn, 999999999999)` 不会等 31 年 —— 它**立即触发**。
  // 玩家把超时填成一个巨大的数（想表达"别超时"），结果每个请求都被瞬间判定为超时
  // （实战反馈：「请求超时（999999999999ms 未返回）」，敌人意图因此全部走保底）。
  // 超过上限的一律按「不超时」处理。
  if (ms > 定时器上限) return promise;

  return new Promise<T>((resolve, reject) => {
    const 计时器 = setTimeout(() => reject(new Error(`请求超时（${ms}ms 未返回）`)), ms);
    promise.then(
      v => {
        clearTimeout(计时器);
        resolve(v);
      },
      e => {
        clearTimeout(计时器);
        reject(e);
      },
    );
  });
}

// ==================== AI 调用计数（观测点） ====================
//
// 玩家反馈「翻译还是分效果并发，触发 too many request」。源码层是整场一次调用，
// 但与其争辩，不如让现场自己说话：**每发一次真实 HTTP 请求就打印一条带计数和用途的日志**。
// 一场战斗里「技能翻译」应该只出现一次；玩家打开控制台 / 面板就能看到真相。
let AI调用计数 = 0;

/** 取本战斗累计的 AI 调用次数（面板展示用） */
export function 取AI调用计数(): number {
  return AI调用计数;
}

/** 开战时归零（面板展示用） */
export function 重置AI调用计数(): void {
  AI调用计数 = 0;
}

/**
 * 精简版 aiGenerate（独立脚本自己的 AI 通道）。
 * - 请求侧 schema 先经 sanitizeJsonSchema 净化
 * - API 以 400 拒收 schema 时自动降级为纯提示词重试
 * - 单次请求受 `cfg.timeout` 约束（generateRaw 自己不提供超时）
 * - **每发一次真实请求就 console.log 一条带计数与用途的日志**（排查"翻译是不是还在并发"的观测点）
 */
export async function aiGenerate(
  cfg: ApiConfig,
  userInput: string,
  jsonSchema?: { name: string; value: Record<string, any> },
  用途: string = 'AI',
  选项?: { 超时?: number },
): Promise<string> {
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置');
  if (typeof generateRaw !== 'function') throw new Error('generateRaw 不可用');

  // 超时允许被调用方放大：翻译这种大批量输出，30s 根本生成不完（实战反馈）——
  // 调用方按条目数估一个更长的超时，用 cfg.timeout 兜底。
  const 超时 = 选项?.超时 ?? cfg.timeout;

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

      // 每发一次真实请求就打印：第几次、干什么、多大。控制台一眼能看出"是不是还在分效果并发"
      AI调用计数++;
      console.log(
        `[wxhl-combat] AI 请求 #${AI调用计数}（${用途}）· 输入 ${Math.round(prompt.length / 1024)}KB · 尝试 ${attempt + 1}/3`,
      );

      const result = await 带超时(generateRaw(config) as Promise<any>, 超时);
      const text = typeof result === 'string' ? result : (result as any).content || '';

      // 空正文要**点名**：推理模型（deepseek-reasoner 之类）把内容全放在思考(reasoning)里、
      // 正文是空的，我们只会拿到空串 —— 再往下走就是一句含糊的"非法 JSON"，玩家只会以为是我们坏了。
      if (!String(text).trim()) {
        lastErr =
          `模型返回了空正文（${用途}）—— 推理模型（如 deepseek-reasoner）会把内容放在思考(reasoning)里、` +
          `正文为空。换一个非推理模型，或在酒馆预设/API 侧关掉思考模式再试。`;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        break; // 落到循环末尾的统一抛错（带上面这条说明）
      }

      if (!jsonSchema) return text;

      try {
        // 截断也算「能用」：抢救出来的部分照样有价值（缺的条目会进复核），
        // 只留一条日志说明为什么少了几条 —— 以前截断会触发 3 次重试、每次都再截断。
        const 宽容 = 提取JSON宽容(text);
        if (宽容.截断) {
          console.warn(`[wxhl-combat] 「${用途}」的 AI 回复被截断，已抢救出可用部分（缺的条目会进复核）`);
        }
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
      // 限流（429 / Too Many Requests）要**长间隔退避**，不能像普通失败那样 1.5s 就重发 ——
      // 越退越短的猛发正是把一次失败放大成一串请求、撞死限流的原因。
      const 限流 = /429|too\s*many|rate.?limit/i.test(lastErr);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 限流 ? 8000 + attempt * 7000 : jsonSchema ? 1500 : 2000));
        continue;
      }
    }
  }
  throw new Error(lastErr || '生成失败');
}

/** 翻译失败的条目 —— 带**原因**（给玩家看）与**来源**（勾选后重试时无需回查） */
export interface 翻译失败项 {
  单位: string;
  名称: string;
  原因: string;
  来源: 单位效果源;
}

export interface 翻译批量结果 {
  /** 单位 id → (效果名 → 战斗解释) */
  表: Record<string, Record<string, 战斗解释>>;
  /** 没翻出来的条目，供复核界面勾选重试 */
  失败: 翻译失败项[];
  /** 缓存统计（给玩家看：这次到底省了多少） */
  缓存: 翻译缓存统计;
  /**
   * **跨条目重名**被改名保命的记录（"「X」的「八咫镜·光行」与另一个卡面条目撞名，已改名为…"）。
   *
   * 为什么要有：技能表是 `Record<技能名, 解释>`，两条不同条目翻出同名子技能时直接赋值
   * 会**互相覆盖、安静地少一招** —— 这正是本轮最想消灭的那种坏。组内重名已在
   * `解析批量翻译结果` 判失败；这里是单位级的兜底（改名保命 + 记账，交给界面说一声）。
   */
  冲突: string[];
}

export interface 翻译缓存统计 {
  /** 直接命中缓存的条目数（没花 AI） */
  命中: number;
  /** 真正发给 AI 的条目数 */
  待翻: number;
}

// ==================== 翻译缓存（跨战斗复用，存脚本变量） ====================

/**
 * 读翻译缓存（指纹 → **该效果翻出来的全部子技能**）。
 *
 * 为什么是**列表**：卡面一格可以塞好几招（§1.1），一个指纹翻出两三条是常态 ——
 * 只存一条的话，第二场战斗会安静地少掉几招（玩家最难发现的那种坏）。
 *
 * 版本不符（`翻译缓存版本` 变过）/ 结构不认识 → 一律视为空缓存：宁可重翻，不可喂旧口径。
 * **本批改了口径（多属性加权 / 领域 / AoE / 一格多招），版本已撞到 2** —— 老缓存自动作废、重翻一次。
 */
function 读翻译缓存(): Record<string, 战斗解释[]> {
  const v = getVariables({ type: 'script', script_id: getScriptId() }) as any;
  const 存 = v?.翻译缓存;
  if (!存 || 存.版本 !== 翻译缓存版本 || !存.条目 || typeof 存.条目 !== 'object') return {};
  const 出: Record<string, 战斗解释[]> = {};
  for (const [指纹, 值] of Object.entries(存.条目 as Record<string, unknown>)) {
    // 单条（老形状 / 手改）也认 —— 包成单元素列表
    if (Array.isArray(值)) 出[指纹] = 值 as 战斗解释[];
    else if (值 && typeof 值 === 'object') 出[指纹] = [值 as 战斗解释];
  }
  return 出;
}

/**
 * 写翻译缓存。
 * `replaceVariables` 是**整表替换**语义，必须先取回现有脚本变量再合并 ——
 * 否则会把 `战斗`（进行中的战斗状态）一起抹掉。
 */
function 写翻译缓存(条目: Record<string, 战斗解释[]>): void {
  const scriptId = getScriptId();
  const v = (getVariables({ type: 'script', script_id: scriptId }) as any) ?? {};
  replaceVariables({ ...v, 翻译缓存: { 版本: 翻译缓存版本, 条目 } }, { type: 'script', script_id: scriptId });
}

/**
 * 进战斗时整理缓存：**只保留本次参战单位里出现过的效果**（指纹在本次名单中的即保留）。
 *
 * 这就是「遍历一次，看有哪些新增的、有哪些不在的，不在的就删去」——
 * 技能被删、改名、换装备、升过级之后，旧翻译的指纹不再出现，随之被清掉。
 * 新增的**不用在这里登记**：它们只是「缓存里没有」，等 `翻译战斗解释` 去翻、翻完自动写入。
 *
 * 名单取**本次全部参战单位**（不只玩家）：玩家的技能装备是跨战斗稳定的、能持续命中缓存；
 * 而副本敌人的技能是每个副本现生成的，留下来的话下一次（不同敌人）也不会被命中，
 * 只会白占空间、还有机会喂到过期内容。
 *
 * @returns 统计（保留/清理各几项），供界面写进战斗日志
 */
export async function 整理翻译缓存(
  单位列表: Array<{ id: string; 效果源: 单位效果源[] }>,
): Promise<{ 保留: number; 清理: number }> {
  const 旧 = 读翻译缓存();

  const 在用 = new Set<string>();
  for (const u of 单位列表) for (const s of u.效果源 ?? []) 在用.add(效果指纹(s));

  const 条目: Record<string, 战斗解释[]> = {};
  let 清理 = 0;
  for (const [指纹, 解释列表] of Object.entries(旧)) {
    if (在用.has(指纹)) 条目[指纹] = 解释列表;
    else 清理++;
  }

  // 只在真有清理时写，避免每次开战都无谓改写脚本变量
  if (清理 > 0) 写翻译缓存(条目);

  return { 保留: Object.keys(条目).length, 清理 };
}

/**
 * 每批最多翻译的条目数。
 *
 * 为什么不能一次全发：一条回复要装下每条一个完整的 `战斗解释` 对象。卡上**一个 boss 就有
 * 15 个效果**，一次回复根本装不下 —— 装不下的三种死法（实战反馈）：超时（生成不完）、
 * 截断（输出 token 上限，漏条目）、漏字段。所以必须切块，每批小到一个模型真的能一次回完。
 *
 * 这不是"分效果"：每批最多 N 项，**尽量整个角色一批**，只有单个角色自己超过上限才拆。
 */
const 翻译每批上限 = 10;

/**
 * 把待翻条目打包成若干批（保持输入顺序）。尽量整个单位装进一批；一个单位自己超过上限
 * 才拆成上限大小的小批。批间不重叠、不丢项、不漏项。
 */
function 打包翻译批次(待翻: 翻译条目[]): 翻译条目[][] {
  // 先按单位切成连续段（保持出现顺序，不切散同一个单位）
  const 段列表: 翻译条目[][] = [];
  for (let i = 0; i < 待翻.length; ) {
    let j = i;
    while (j < 待翻.length && 待翻[j].单位 === 待翻[i].单位) j++;
    段列表.push(待翻.slice(i, j));
    i = j;
  }

  const 批: 翻译条目[][] = [];
  let 当前: 翻译条目[] = [];
  for (const 段 of 段列表) {
    if (段.length <= 翻译每批上限 && 当前.length + 段.length <= 翻译每批上限) {
      当前.push(...段); // 整个单位装进当前批
    } else if (段.length <= 翻译每批上限) {
      if (当前.length) 批.push(当前);
      当前 = [...段]; // 这个单位开新批
    } else {
      // 这个单位自己超过上限 → 先把当前批收尾，再把它拆成上限大小的小批
      if (当前.length) 批.push(当前);
      当前 = [];
      for (let k = 0; k < 段.length; k += 翻译每批上限) 批.push(段.slice(k, k + 翻译每批上限));
    }
  }
  if (当前.length) 批.push(当前);
  return 批;
}

/** 翻译超时按条目数自适应：大批量输出 30s 根本生成不完。基础 60s + 每项 3s，封顶 150s。 */
function 翻译超时(条目数: number, 基础: number): number {
  return Math.min(Math.max(基础 || 0, 60000 + 条目数 * 3000), 150000);
}

/** 待翻译条目（内部形状：带归属单位与内容指纹） */
type 翻译条目 = {
  单位: string;
  名称: string;
  来源: Record<string, any>;
  原始: 单位效果源;
  指纹: string;
};

/**
 * 一次性翻译**全部参战单位的效果**。
 *
 * 1. **跨战斗缓存**（spec §10.2）：已经翻过的条目按内容指纹直接命中，不进请求；
 *    全命中时**一次 AI 都不调**。技能升级 / 换装备会改指纹，自动重翻。
 * 2. **按批量大小切块、顺序发送（不并发）**：小场面（≤ `翻译每批上限` 项）是一次调用；
 *    一个 boss 就有十几个效果时，一条回复装不下（超时 / 截断 / 漏字段），所以按批切块。
 *    切块不是"分效果"：每批最多 N 项、尽量整个角色一批。绝不并发 —— 「并发上限 /
 *    too many request」就是被并发打出来的（实战反馈）。
 *
 * 失败**不抛错也不静默**：整批失败（三次都吐不出合法 JSON）会把每条都标成失败并带上原因，
 * 逐条失败带各自的字段错误 —— 一律交给调用方在复核界面显示并支持勾选重试。
 * 失败项**不入缓存**（否则下次会拿着一个空的翻译当命中）。
 *
 * @returns `表`：单位 id → (效果名 → 战斗解释)；`失败`：带原因与来源的失败清单；`缓存`：命中统计
 */
export async function 翻译战斗解释(
  单位列表: Array<{ id: string; 效果源: 单位效果源[] }>,
): Promise<翻译批量结果> {
  const 表: Record<string, Record<string, 战斗解释>> = {};
  for (const u of 单位列表) if (!表[u.id]) 表[u.id] = {};
  const 失败: 翻译失败项[] = [];

  // 拍平成带编号的一维清单；来源原样留一份，失败时直接挂上去供复核界面重试
  const 条目: 翻译条目[] = [];
  for (const u of 单位列表) {
    for (const s of u.效果源 ?? []) {
      条目.push({ 单位: u.id, 名称: s.名称, 来源: s as any, 原始: s, 指纹: 效果指纹(s) });
    }
  }
  if (条目.length === 0) return { 表, 失败, 缓存: { 命中: 0, 待翻: 0 }, 冲突: [] };

  /** 跨条目重名检测：`单位\u0000技能名` → 来源指纹 */
  const 已写来源 = new Map<string, string>();
  /** 重名被迫改名的记录（交给界面说一声 —— 绝不安静地覆盖） */
  const 冲突: string[] = [];

  /**
   * 把一个条目翻出来的子技能落进技能表。
   *
   * **跨条目重名**（另一个卡面条目也翻出了同名的一招）直接赋值会互相覆盖 → **安静地少一招**。
   * 组内重名已经在 `解析批量翻译结果` 里判失败了，这里是**单位级**的兜底：
   * 改名保命 + 记一条账。（缓存里仍按指纹存原名的解释，所以下一场重算的结果是确定的。）
   */
  const 落技能 = (单位: string, 指纹: string, 子技能: Array<{ 名称: string; 解释: 战斗解释 }>) => {
    for (const 技 of 子技能) {
      const 原名 = 技.名称;
      let 名 = 原名;
      const 占位 = 已写来源.get(`${单位}\u0000${名}`);
      if (占位 !== undefined && 占位 !== 指纹) {
        let n = 2;
        while (已写来源.has(`${单位}\u0000${原名}（${n}）`)) n++;
        名 = `${原名}（${n}）`;
        冲突.push(`「${单位}」的「${原名}」与另一个卡面条目撞名，已改名为「${名}」`);
      }
      已写来源.set(`${单位}\u0000${名}`, 指纹);
      表[单位][名] = 名 === 原名 ? 技.解释 : { ...技.解释, 名称: 名 };
    }
  };

  // 命中缓存的先落表；只把没命中的送去翻译。
  // 缓存命中是**一整个列表**（一个卡面条目可能翻出好几招）—— 每条按自己的名字落表。
  const 缓存 = 读翻译缓存();
  const 待翻: 翻译条目[] = [];
  for (const e of 条目) {
    const 已有 = 缓存[e.指纹];
    if (已有?.length) 落技能(e.单位, e.指纹, 已有.map(解 => ({ 名称: 解.名称 || e.名称, 解释: 解 })));
    else 待翻.push(e);
  }
  const 统计: 翻译缓存统计 = { 命中: 条目.length - 待翻.length, 待翻: 待翻.length };

  // 全命中 → 根本不需要 API（也就不该因为「API 未配置」把开战拦下来）
  if (待翻.length === 0) return { 表, 失败, 缓存: 统计, 冲突: [] };

  const cfg = 读设置().快路;
  if (!cfg.url || !cfg.apiKey) {
    throw new Error('API 未配置：请先在设置里配置 API');
  }

  // 新翻出来的并回缓存（成功的才写）；缓存里已有的条目原样保留，
  // **不在这里裁剪** —— 裁剪是 `整理翻译缓存` 的职责（复核界面重试时只带失败项，
  // 若在这里按「本次条目」裁剪，会把整场其余缓存全删掉）。
  const 新缓存 = { ...缓存 };
  let 有新增 = false;

  /** 一批条目的结果按输入同序落表 / 入缓存 / 记失败（**一个条目的全部子技能都落**） */
  const 落一批 = (批次: typeof 待翻, 逐条: 条目解析结果[]) => {
    逐条.forEach((r, i) => {
      const 归属 = 批次[i];
      if (r.成功) {
        落技能(归属.单位, 归属.指纹, r.技能);
        新缓存[归属.指纹] = r.技能.map(技 => 技.解释);
        有新增 = true;
      } else {
        失败.push({ 单位: 归属.单位, 名称: 归属.名称, 原因: r.原因, 来源: 归属.原始 });
      }
    });
  };

  /** 一次 AI 调用翻译一批（调用方保证批内与输入同序）；超时按条目数自适应放大 */
  const 翻一批 = async (批次: 翻译条目[]): Promise<条目解析结果[]> => {
    const raw = await aiGenerate(
      cfg,
      构建批量翻译提示词(批次),
      批量战斗解释_SCHEMA,
      `技能翻译（共 ${批次.length} 项）`,
      { 超时: 翻译超时(批次.length, cfg.timeout) },
    );
    return 解析批量翻译结果(raw, 批次.map(b => b.名称));
  };

  // 按批量大小切块、**顺序**发送（不并发）。
  // 一次要翻的效果太多时，模型一条回复装不下 —— 装不下的三种死法（实战反馈）：
  // 超时（生成不完）/ 截断（输出 token 上限，漏条目）/ 漏字段。所以每批压到能一次回完的大小。
  // 切块不是"分效果"：每批最多 N 项、尽量整个角色一批。批间留间隔，别把限流打出来。
  const 批列表 = 打包翻译批次(待翻);
  for (let i = 0; i < 批列表.length; i++) {
    const 一批 = 批列表[i];
    try {
      落一批(一批, await 翻一批(一批));
    } catch (e: any) {
      const 原因 = `整批请求失败：${e?.message ?? e}`;
      一批.forEach(b => 失败.push({ 单位: b.单位, 名称: b.名称, 原因, 来源: b.原始 }));
    }
    if (i < 批列表.length - 1) await new Promise(r => setTimeout(r, 800)); // 顺序，不并发
  }

  if (有新增) 写翻译缓存(新缓存);

  return { 表, 失败, 缓存: 统计, 冲突 };
}

/**
 * 调快路 AI 为敌方单位生成行动意图（每回合一次）。
 * API 未配置时抛错；AI 回复不是合法 JSON / 找不到意图数组时由 `解析敌方意图` 抛错。
 *
 * **传 jsonSchema**：与技能翻译走同一条「净化 → 非法 JSON 自动重试 → 400 降级」通道。
 * 早先这里不传 schema，`aiGenerate` 会走「无 schema 直返首答」路径 —— 零校验、零重试，
 * 模型回一次 ```json 围栏就让**整个敌方回合凭空消失**（表现为敌人不出招）。
 */
export async function 生成敌方意图(状态: 战斗状态): Promise<敌方意图[]> {
  const cfg = 读设置().快路;
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置：请先在设置里配置 API');
  const raw = await aiGenerate(cfg, 构建敌方意图提示词(状态), 敌方意图_SCHEMA, `敌方意图（第 ${状态.回合} 回合）`);
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

/**
 * 开战时读一次「**上一楼正文**」（模型当时的输入）—— 收尾正文写"环境"的唯一天然来源。
 *
 * 玩家口径：「把模型输入的开战前的上一楼正文发过来呗」。
 * 取法：从最新一楼往前找最多 3 楼，取**最后一条 assistant 消息**（若最后是玩家自己的发言就往前找）；
 * 顺手剥掉 MVU 变量块（那是引擎的账本，不是场景），并截断防撑爆提示词。
 * 任何异常都返回空串 —— 收尾提示词会明确写「（无）」。
 */
export async function 读上一楼正文(): Promise<string> {
  for (const 深度 of [-1, -2, -3]) {
    try {
      const 楼层 = getChatMessages(深度) as any[];
      const 条 = Array.isArray(楼层) ? 楼层[0] : undefined;
      if (!条 || 条.role !== 'assistant') continue;
      const 净 = 剥掉变量块(String(条.message ?? '')).trim();
      if (净) return 净.slice(0, 3000);
    } catch {
      // 楼层不存在 / API 不可用 → 继续往前找
    }
  }
  return '';
}

/** 剥掉 MVU 变量块与思考块（它们不是场景，进提示词只会浪费 token 与干扰模型） */
function 剥掉变量块(文: string): string {
  return 文
    .replace(/<status_current_variable>[\s\S]*?<\/status_current_variable>/g, '')
    .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/g, '')
    .replace(/<Analysis>[\s\S]*?<\/Analysis>/g, '')
    .replace(/```yaml[\s\S]*?```/g, '');
}

/** 战斗结束：生成收尾正文 → 写入一条 assistant 楼层。
 * 状态也一并带上：收尾要**按击杀发放钥匙**（杂兵白/精英白银/BOSS黄金/隐藏BOSS钻石/契约者血腥）
 * 与主角真名，这两样都得从战斗状态里取。
 */
export async function 写收尾楼层(
  步骤: 结算步骤[],
  状态: 战斗状态,
  额外: { 开战前上下文?: string; 开场模式?: string } = {},
): Promise<void> {
  const cfg = 读设置().强路;
  if (!cfg.url || !cfg.apiKey) {
    console.warn('[wxhl-combat] 强路 API 未配置，跳过收尾正文');
    return;
  }
  // 收尾正文**不限字数**（要写完整场战斗），默认 30s 根本生成不完 —— 给一个更宽的超时
  const 正文 = await aiGenerate(cfg, 构建收尾提示词(步骤, 状态, 额外), undefined, '收尾正文', {
    超时: Math.max(cfg.timeout || 0, 180000),
  });
  await createChatMessages([{ role: 'assistant', message: 正文 }]);
}

/**
 * 读战斗快照（脚本变量）。没有则返回 null。
 * 快照除了战斗状态，还带**意图模式与战斗日志** —— 切页签/重开面板恢复后仍是当初的模式、日志还在
 * （玩家反馈：切到设置再切回来日志就没了；选了掷骰却还在调 AI）。
 */
export async function 读战斗状态(): Promise<战斗快照 | null> {
  const v = getVariables({ type: 'script', script_id: getScriptId() }) as any;
  return 恢复战斗状态(v?.战斗);
}

/** 写战斗快照（脚本变量）。null = 清除。 */
export async function 写战斗状态(
  状态: 战斗状态 | null,
  额外: { 意图模式?: 意图模式; 日志?: string[] } = {},
): Promise<void> {
  const scriptId = getScriptId();
  const v = getVariables({ type: 'script', script_id: scriptId }) as any;
  const 新变量 = { ...v, 战斗: 状态 ? 构建战斗状态快照(状态, 额外) : undefined };
  if (!状态) delete 新变量.战斗;
  replaceVariables(新变量, { type: 'script', script_id: scriptId });
}

// ================================================================
// 设置页：翻译缓存
// ================================================================

/** 当前翻译缓存里的条目数（设置页显示用） */
export function 翻译缓存条目数(): number {
  return Object.keys(读翻译缓存()).length;
}

/**
 * 清空翻译缓存 —— 设置页的出口。
 *
 * 为什么需要有：缓存只认**内容指纹**，所以一条「JSON 合法但译得很糟」的解释会被永久命中；
 * 而复核界面只列翻译**失败**的条目，玩家没有别的办法让它重翻。
 */
export async function 清空翻译缓存(): Promise<void> {
  写翻译缓存({});
}

// ================================================================
// 设置页的「拉取模型 / 测试连接」
// 与 wxhl-003 小手机同一套做法：拉模型走酒馆助手的 getModelList，
// 测试连接走与正式调用**完全相同**的 aiGenerate 通道（这样测通了才代表真能用）。
// ================================================================

/** 从该 API 拉取可用模型列表（酒馆助手的 getModelList）。失败抛错，由调用方展示。 */
export async function 拉取模型(cfg: ApiConfig): Promise<string[]> {
  if (!cfg.url) throw new Error('请先填写 API URL');
  if (typeof getModelList !== 'function') throw new Error('getModelList 不可用（酒馆助手版本过旧？）');
  const list = await getModelList({ apiurl: cfg.url, key: cfg.apiKey });
  return Array.isArray(list) ? list : [];
}

/**
 * 发一条最小请求验证连接 —— 走 `aiGenerate`（与正式调用同一条通道），
 * 所以「测通」等价于「技能翻译/敌方意图/收尾正文都能发出去」。
 * @returns AI 的回复片段（供界面展示，证明真的收到了内容）
 */
export async function 测试连接(cfg: ApiConfig): Promise<string> {
  const 回复 = await aiGenerate(cfg, '请回复"连接成功"这四个字，不要任何其他内容。', undefined, '测试连接');
  return String(回复 ?? '').trim().slice(0, 80);
}
