import {
  type ForumThread,
  type ForumPost,
  INITIAL_THREADS,
  RANK_BOARDS,
  type CareerPlan,
  type CareerRoadmap,
  type PlanType,
  type DungeonStrategy,
  type Faction,
  type DungeonMode,
  CAREER_SYSTEM_RULES,
  CORE_WORLD,
} from './data';
import { buildRefreshPrompt, buildRepliesPrompt, buildThreadDetailPrompt, type ForumSectionKey } from './forumPrompts';
import { WORKSHOP_WORLDBOOK_NAME, PvPSaveSchema, type WorkshopCard, type PvPSave } from './data';
import {
  extractContractSave,
  buildIntroPrompt,
  tierOf,
  generateDefaultAppearance,
  buildBattleIntroMessage,
} from './workshop';
import {
  rollBuild,
  rollRewards,
  rollDie,
  归一位阶,
  applyBuildOverrides,
  type BuildOverrides,
  type BuildRoll,
  type RewardSet,
  type RollRecord,
} from './dice';
import { 基准等级, 生机评估 } from './crTable';
import {
  DungeonGenResultSchema,
  assemblePanelText,
  mapToVariables,
  点名缺席者,
  type DungeonGenResult,
  type PlayerBrief,
} from './dungeonRules';
import { buildDungeonPrompt, buildEnterPrompt, buildEnemyPrompt } from './dungeonGen';
import { buildEventSection } from './dungeonEvents';
import {
  EnemyGenResultSchema,
  mapEnemyToVariables,
  assembleEnemyPanelFromEntity,
  前端已代算,
  type GeneratedEnemy,
} from './enemyRules';
import {
  SettlementGenResultSchema,
  computeSettlement,
  汇总基础奖励,
  assembleSettlementPanel,
  buildSettlementWrites,
  成就星数,
  存在条目数,
  type SettlementGenResult,
  type SettlementSnapshot,
  type SettlementComputed,
} from './settlementRules';
import { buildSettlementPrompt, buildSettlementEnterPrompt } from './settlementGen';
import { sanitizeJsonSchema } from './schemaSanitize';
import { pushSyslog } from './syslog';

const SK = 'wxhl003_settings';

export interface ApiConfig {
  url: string;
  apiKey: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

/** 具名方案: 一个名字 + 一份快照值 */
export interface Profile<T> {
  name: string;
  value: T;
}

export interface Settings {
  apiMode: 'single' | 'multi';
  primary: ApiConfig;
  secondary: ApiConfig;
  /** API 方案（快照 = apiMode + primary + secondary） */
  apiProfiles: Profile<{ apiMode: 'single' | 'multi'; primary: ApiConfig; secondary: ApiConfig }>[];
  activeApiProfile: string; // 方案名; '' = 未使用方案
  selectedWorldbooks: string[];
  /** 世界书条目级筛选: 世界书名 -> 条目名数组; null/缺省 = 整本全取, [] = 一条不取 */
  worldbookEntryFilter: Record<string, string[] | null>;
  /** 世界书方案（快照 = selectedWorldbooks + worldbookEntryFilter） */
  worldbookProfiles: Profile<{ selectedWorldbooks: string[]; worldbookEntryFilter: Record<string, string[] | null> }>[];
  activeWorldbookProfile: string; // 方案名; '' = 未使用方案
  wallpaper: string;
  /** 手机界面字体（CSS font-family 串；'' = 用默认黑体栈）。只影响小手机内部，与酒馆页面隔离 */
  fontFamily: string;
  /** 手机框尺寸缩放（0.8 ~ 1.5，1 = 默认 320×640） */
  phoneScale: number;
  /** 字体缩放（0.85 ~ 1.4，1 = 默认）——只缩放手机内文字，不改手机框尺寸 */
  fontScale: number;
}

/**
 * 按条目筛选世界书内容。
 * @param filter null / undefined = 整本全取; 数组 = 只取这些条目名（空数组 = 一条不取）
 */
export function filterWorldbookEntries(
  entries: { name: string; content: string; enabled?: boolean }[],
  filter: string[] | null | undefined,
): { name: string; content: string }[] {
  return entries
    .filter(e => e.enabled !== false)
    .filter(e => !filter || filter.includes(e.name))
    .map(e => ({ name: e.name, content: e.content }))
    .filter(e => Boolean(e.content));
}

function defApi(): ApiConfig {
  return { url: '', apiKey: '', model: '', timeout: 30000, maxRetries: 3 };
}

function load(): Settings {
  try {
    const r = localStorage.getItem(SK);
    if (r) {
      const p = JSON.parse(r);
      return {
        apiMode: p.apiMode || 'single',
        primary: { ...defApi(), ...p.primary },
        secondary: { ...defApi(), ...p.secondary },
        apiProfiles: p.apiProfiles || [],
        activeApiProfile: p.activeApiProfile || '',
        selectedWorldbooks: p.selectedWorldbooks || [],
        worldbookEntryFilter: p.worldbookEntryFilter || {},
        worldbookProfiles: p.worldbookProfiles || [],
        activeWorldbookProfile: p.activeWorldbookProfile || '',
        wallpaper: p.wallpaper || '',
        fontFamily: typeof p.fontFamily === 'string' ? p.fontFamily : '',
        phoneScale: typeof p.phoneScale === 'number' && p.phoneScale > 0 ? p.phoneScale : 1,
        fontScale: typeof p.fontScale === 'number' && p.fontScale > 0 ? p.fontScale : 1,
      };
    }
  } catch (_) {}
  return {
    apiMode: 'single',
    primary: defApi(),
    secondary: defApi(),
    apiProfiles: [],
    activeApiProfile: '',
    selectedWorldbooks: [],
    worldbookEntryFilter: {},
    worldbookProfiles: [],
    activeWorldbookProfile: '',
    wallpaper: '',
    fontFamily: '',
    phoneScale: 1,
    fontScale: 1,
  };
}

function save(s: Settings) {
  try {
    localStorage.setItem(SK, JSON.stringify(s));
  } catch (_) {}
}

/** 当前生效的 API 配置（多路模式且副路已配 → 副路，否则主路）。市场 AI 审核等跨模块复用 */
export function getActiveCfg(s: Settings): ApiConfig {
  return s.apiMode === 'multi' && s.secondary.url ? s.secondary : s.primary;
}

// ================================================================
// JSON Schema 定义
// ================================================================
const THREAD_LIST_SCHEMA = {
  name: 'forum_threads',
  value: {
    type: 'object',
    properties: {
      threads: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            preview: { type: 'string' },
            author: { type: 'string' },
            hotComment: { type: 'string' },
            hotAuthor: { type: 'string' },
            hotLikes: { type: 'number' },
          },
          required: ['title', 'preview', 'author', 'hotComment', 'hotAuthor', 'hotLikes'],
        },
      },
    },
    required: ['threads'],
  },
};

const THREAD_DETAIL_SCHEMA = {
  name: 'thread_detail',
  value: {
    type: 'object',
    properties: {
      fullContent: { type: 'string' },
      comments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            author: { type: 'string' },
            content: { type: 'string' },
            replies: {
              type: 'array',
              items: {
                type: 'object',
                properties: { author: { type: 'string' }, content: { type: 'string' } },
                required: ['author', 'content'],
              },
            },
          },
          required: ['author', 'content'],
        },
      },
    },
    required: ['fullContent', 'comments'],
  },
};

const REPLY_LIST_SCHEMA = {
  name: 'thread_replies',
  value: {
    type: 'object',
    properties: {
      replies: {
        type: 'array',
        items: {
          type: 'object',
          properties: { author: { type: 'string' }, content: { type: 'string' } },
          required: ['author', 'content'],
        },
      },
    },
    required: ['replies'],
  },
};

// 玩家影响事件筛选
const INFLUENCE_SCHEMA = {
  name: 'player_influence',
  value: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            event: { type: 'string' }, // 事件一句话描述
            impact: { type: 'string' }, // 影响力评估
            section: { type: 'string' }, // 建议影响的论坛分区
            nickname: { type: 'string' }, // 其他契约者对该玩家的称呼/称号
          },
          required: ['event', 'impact', 'section'],
        },
      },
    },
    required: ['events'],
  },
};

// ================================================================
// JSON 提取：支持直接、markdown 代码块、裸 JSON
// ================================================================
/** 从 AI 回复文本中抠出 JSON（直接 parse → 代码围栏 → 首个平衡括号段）。市场 AI 审核等跨模块复用 */
export function extractJSON(text: string): any {
  try {
    return JSON.parse(text.trim());
  } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch (_) {}
  }
  const first = text.search(/[\{\[]/);
  if (first >= 0) {
    const chars = [...text.slice(first)];
    let d = 0,
      inS = false,
      esc = false,
      end = -1;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inS = !inS;
        continue;
      }
      if (inS) continue;
      if (ch === '{' || ch === '[') d++;
      else if (ch === '}' || ch === ']') {
        d--;
        if (d === 0) {
          end = i;
          break;
        }
      }
    }
    if (end > 0) {
      try {
        return JSON.parse(text.slice(first, first + end + 1));
      } catch (_) {}
    }
  }
  throw new Error('AI 回复中未找到有效 JSON，原始回复: ' + text.slice(0, 300));
}

// ================================================================
// AI 生成（内置 JSON 验证 + 格式重试）。市场 AI 审核等跨模块复用
// - 请求侧 schema 先经 sanitizeJsonSchema 净化（zod 的 record/prefault/min 产物 Gemini 不收）
// - API 以 400 拒收 schema 时自动降级为纯提示词重试（部分模型/中转不支持结构化输出）
// ================================================================
export async function aiGenerate(
  cfg: ApiConfig,
  userInput: string,
  jsonSchema?: { name: string; value: Record<string, any> },
): Promise<string> {
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置');
  if (typeof generateRaw !== 'function') throw new Error('generateRaw 不可用');

  // 如果要求JSON，prompt前缀加死命令
  let prompt = userInput;
  if (jsonSchema) {
    prompt = `【死命令】你只能返回一个合法的 JSON，不能包含任何 markdown、标题、解释性文字。直接输出 JSON。\n\n${userInput}`;
  }

  let lastErr = '';
  // 降级标记: API 拒收结构化 schema 后, 后续尝试一律不再携带 json_schema
  let schema已降级 = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.info('[wxhl003] 第' + (attempt + 1) + '次调用 model:', cfg.model);
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
      console.info('[wxhl003] 返回长度:', text.length);

      // 无JSON要求，直接返回
      if (!jsonSchema) return text;

      // 有JSON要求：验证格式
      try {
        extractJSON(text);
        return text;
      } catch (_) {
        console.warn('[wxhl003] JSON格式错误，重试...');
        if (attempt < 2) {
          // 越来越严厉的指令
          const warnings = [
            '【第一次警告】上次返回不是合法JSON。这次必须只输出JSON，不要任何其他内容。',
            '【最后一次警告】绝对只输出 {} 或 [] 包裹的 JSON。不要 markdown。不要解释。不要标题。只要 JSON。',
          ];
          prompt = warnings[attempt] + '\n\n' + userInput;
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw new Error('AI 连续3次返回了非 JSON 格式。可能此 API 不支持 json_schema。原始回复: ' + text.slice(0, 300));
      }
    } catch (e: any) {
      lastErr = e.message || String(e);
      // 400/参数类错误大概率是 API 不认结构化输出（如 Gemini 拒收 response_format）,
      // 去掉 schema 立刻重试 —— 死命令 prompt 与 JSON 提取/校验链路依然兜底
      if (jsonSchema && !schema已降级 && /\b400\b|bad\s*request|invalid/i.test(lastErr)) {
        console.warn('[wxhl003] API 拒收结构化 schema, 降级为纯提示词重试');
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

// ================================================================
// PINIA STORE
// ================================================================
export const useForumStore = defineStore('forum', () => {
  const settings = reactive<Settings>(load());
  watchEffect(() => save({ ...settings }));

  const activeSection = ref('complaints');
  const threads = ref<ForumThread[]>([...INITIAL_THREADS]);
  const rankIndex = ref(0);
  const playerRank = ref<{ rank: number; name: string; lv: string; team: string } | null>(null);
  const rankRefreshing = ref(false);
  const refreshing = ref(false);
  const generating = ref(false);
  const replying = ref(false);
  const lastError = ref('');
  const testing = ref(false);
  const testResult = ref('');
  const models = ref<string[]>([]);
  const loadingModels = ref(false);
  const allWorldbookNames = ref<string[]>([]);
  const worldbookLoaded = ref(false);
  const influenceEvents = ref<{ event: string; impact: string; section: string; nickname?: string }[]>([]);
  const influenceAnalyzing = ref(false);
  const influenceError = ref('');

  // ---- Models & Test ----
  async function fetchModels(cfg: ApiConfig) {
    if (!cfg.url || !cfg.apiKey) {
      testResult.value = '请先填写 API URL 和 Key';
      return;
    }
    if (typeof getModelList !== 'function') {
      testResult.value = 'getModelList 不可用';
      return;
    }
    loadingModels.value = true;
    try {
      const list = await getModelList({ apiurl: cfg.url, key: cfg.apiKey });
      models.value = list.length > 0 ? list : cfg.model ? [cfg.model] : [];
      testResult.value = '成功获取 ' + models.value.length + ' 个模型';
    } catch (e: any) {
      if (cfg.model) models.value = [cfg.model];
      testResult.value = '(使用手动输入的模型名) ' + (e.message || e);
    } finally {
      loadingModels.value = false;
    }
  }

  async function testConnection(cfg: ApiConfig) {
    if (!cfg.url || !cfg.apiKey) {
      testResult.value = '请先填写 API URL 和 Key';
      return;
    }
    testing.value = true;
    testResult.value = '';
    try {
      const content = await aiGenerate(cfg, '请回复"连接成功"这四个字，不要任何其他内容。');
      testResult.value = '连接成功 -> "' + content.slice(0, 80) + '"';
    } catch (e: any) {
      testResult.value = '失败: ' + (e.message || e);
    } finally {
      testing.value = false;
    }
  }

  // ---- World book ----
  function loadWorldbookList() {
    try {
      allWorldbookNames.value = getWorldbookNames?.() ?? [];
      worldbookLoaded.value = true;
    } catch (_) {
      allWorldbookNames.value = [];
    }
  }

  async function getWorldbookContent(): Promise<string> {
    const sel = settings.selectedWorldbooks;
    if (sel.length === 0) return '';
    const parts: string[] = [];
    for (const name of sel) {
      try {
        const entries = await getWorldbook(name);
        if (entries && entries.length > 0) {
          const picked = filterWorldbookEntries(
            entries as { name: string; content: string; enabled?: boolean }[],
            settings.worldbookEntryFilter?.[name],
          );
          const text = picked.map(e => e.content).join('\n\n');
          if (text) parts.push('【' + name + '】\n' + text);
        }
      } catch (_) {}
    }
    return parts.join('\n\n');
  }

  /**
   * 读**卡绑定 + 全局开启**的世界书条目（只读, 不筛条目级 filter）。
   *
   * 专供 EJS 控制器用: 控制器与事件条目在卡绑定世界书里, 而玩家的「设置 → 世界书」
   * 勾选是另一回事（spec §一 要求「不管有没有勾选都要能读」）。
   * **只读这几本** —— 用户卡上有 91 本世界书, 全量扫描太慢。
   */
  async function getCardWorldbookEntries(): Promise<{ 名称: string; 正文: string }[]> {
    const 名单 = new Set<string>();
    try {
      const cb = getCharWorldbookNames('current');
      if (cb.primary) 名单.add(cb.primary);
      for (const w of cb.additional ?? []) 名单.add(w);
    } catch (_) {}
    try {
      for (const w of getGlobalWorldbookNames?.() ?? []) 名单.add(w);
    } catch (_) {}

    const 出: { 名称: string; 正文: string }[] = [];
    const 已见 = new Set<string>();
    for (const 名 of 名单) {
      try {
        const entries = await getWorldbook(名);
        for (const e of entries) {
          if (已见.has(e.name)) continue; // 同名的取先出现的
          已见.add(e.name);
          出.push({ 名称: e.name, 正文: e.content ?? '' });
        }
      } catch (_) {}
    }
    return 出;
  }

  // ---- 读取玩家变量 ----
  function readPlayerData(): string {
    try {
      let vars: any = {};
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
      } catch (_) {}
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
        } catch (_) {}
      }
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'chat' }) ?? {};
        } catch (_) {}
      }
      const character = vars?.stat_data?.契约者;
      if (!character) return '';

      const parts: string[] = [];
      const h = character?.头部;
      if (h?.姓名) parts.push('契约者: ' + h.姓名);
      if (h?.等级) parts.push('等级: Lv.' + h.等级);
      if (h?.阶位) parts.push('阶位: ' + h.阶位);
      if (h?.所属势力) parts.push('势力: ' + h.所属势力);
      if (character?.职业?.名称)
        parts.push('职业: ' + character.职业.名称 + (character.职业.稀有度 ? '(' + character.职业.稀有度 + ')' : ''));
      if (character?.属性) parts.push('属性: ' + JSON.stringify(character.属性));
      if (character?.称号) parts.push('称号: ' + JSON.stringify(character.称号));
      return parts.join('\n');
    } catch (_) {
      return '';
    }
  }

  // ---- 读取最近聊天记录 ----
  function readRecentChat(count = 20): string {
    try {
      if (typeof getChatMessages !== 'function') return '';
      const msgs = getChatMessages(-count);
      if (!msgs || msgs.length === 0) return '';
      const lines = msgs.map(m => {
        const role = m.role === 'user' ? '玩家' : m.role === 'system' ? '系统' : m.name || 'AI';
        const text = (m.message || '').replace(/<[^>]*>/g, '').slice(0, 500);
        return '[' + role + ']: ' + text;
      });
      return lines.join('\n');
    } catch (_) {
      return '';
    }
  }

  // ---- 提取玩家影响事件 ----
  async function extractInfluence() {
    const cfg = getActiveCfg(settings);
    if (!cfg.url || !cfg.apiKey) {
      influenceError.value = '请先在设置中配置API';
      return;
    }
    influenceAnalyzing.value = true;
    influenceError.value = '';
    try {
      const playerData = readPlayerData();
      const chat = readRecentChat(20);
      const wb = await getWorldbookContent();
      const prompt = `你是无限回廊论坛的情报分析师。契约者最近在回廊中经历了一些事件，你需要判断哪些事件值得在论坛上被其他契约者讨论。

【玩家当前状态】
${playerData || '（未检测到）'}

【最近剧情记录】
${chat || '（未检测到）'}

【世界观参考】
${wb || CORE_WORLD}

【判断标准】
- 只提取"够格上论坛"的事件：重大战绩/惨败、影响势力格局、稀有掉落、隐藏任务突破、晋升阶位、获得稀有职业、出名或丢人的事迹等
- 排除日常琐事：买了个普通装备、吃了顿饭、普通对话、日常练级等鸡毛蒜皮的事
- 如果最近没有值得讨论的事件，返回空数组 events

【任务要求】
返回JSON，events数组，每个元素包含：
- event: 事件一句话描述（第三人称，站在其他契约者视角）
- impact: 影响力评估（大/中/小 + 一句话理由）
- section: 最适合讨论该事件的分区（complaints/intel/dungeon/build/trade 之一）
- nickname: 其他契约者可能因此给该玩家起的称呼或称号（可选）`;
      const raw = await aiGenerate(cfg, prompt, INFLUENCE_SCHEMA);
      const data = extractJSON(raw);
      const events: any[] = Array.isArray(data) ? data : data.events || [];
      influenceEvents.value = events.filter(e => e && e.event && e.section);
    } catch (e: any) {
      influenceError.value = e.message || '分析失败';
    } finally {
      influenceAnalyzing.value = false;
    }
  }

  function clearInfluence() {
    influenceEvents.value = [];
    influenceError.value = '';
  }

  // ---- Section refresh ----
  async function refreshSection(sectionKey: string) {
    const cfg = getActiveCfg(settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在设置中配置API';
      return;
    }
    refreshing.value = true;
    lastError.value = '';
    try {
      const wb = await getWorldbookContent();
      // 按分区过滤玩家影响事件, 组装成一段上下文字符串
      let influenceCtx = '';
      if (influenceEvents.value.length > 0) {
        const relevant = influenceEvents.value.filter(e => !e.section || e.section === sectionKey);
        if (relevant.length > 0) {
          influenceCtx =
            '\n【最近圈内大事】\n' +
            relevant
              .map(
                e =>
                  '- ' +
                  e.event +
                  (e.impact ? '（影响力：' + e.impact + '）' : '') +
                  (e.nickname ? '——契约者被称作「' + e.nickname + '」' : ''),
              )
              .join('\n') +
            '\n请让生成的帖子自然地讨论这些事件，可以有部分帖子围绕这些大事展开。';
        }
      }
      const prompt = buildRefreshPrompt(sectionKey as ForumSectionKey, wb, influenceCtx);
      const raw = await aiGenerate(cfg, prompt, THREAD_LIST_SCHEMA);
      const data = extractJSON(raw);
      const posts: any[] = Array.isArray(data) ? data : data.threads || [];
      if (posts.length === 0) throw new Error('生成的帖子为空');
      threads.value = threads.value.filter(t => t.section !== sectionKey);
      const maxId = Math.max(...threads.value.map(t => t.id), 0);
      threads.value.push(
        ...posts.map((p, i) => ({
          id: maxId + i + 1,
          section: sectionKey,
          title: p.title || '无标题',
          preview: p.preview || '',
          author: p.author || '匿名',
          replies: Math.floor(Math.random() * 80) + 10,
          time: '刚刚',
          hotComment: p.hotComment || '',
          hotAuthor: p.hotAuthor || '匿名',
          hotLikes: p.hotLikes || 0,
        })),
      );
    } catch (e: any) {
      lastError.value = e.message || '刷新失败';
    } finally {
      refreshing.value = false;
    }
  }

  async function generateThreadDetail(thread: ForumThread) {
    const cfg = getActiveCfg(settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在设置中配置API';
      return;
    }
    generating.value = true;
    lastError.value = '';
    try {
      const wb = await getWorldbookContent();
      const raw = await aiGenerate(
        cfg,
        buildThreadDetailPrompt(thread.section as ForumSectionKey, thread, wb),
        THREAD_DETAIL_SCHEMA,
      );
      const data = extractJSON(raw);
      const posts: ForumPost[] = [];
      let floor = 1;
      const now = Date.now();
      const ts = (off = 0) => {
        const d = new Date(now - off * 60000);
        return (
          d.getMonth() +
          1 +
          '月' +
          d.getDate() +
          '日 ' +
          String(d.getHours()).padStart(2, '0') +
          ':' +
          String(d.getMinutes()).padStart(2, '0')
        );
      };
      posts.push({
        id: now,
        floor: floor++,
        author: thread.author,
        time: ts(0),
        content: data.fullContent || thread.preview,
        depth: 0,
      });
      for (const c of data.comments || []) {
        posts.push({
          id: now + floor,
          floor: floor++,
          author: c.author || '匿名',
          time: ts(3 * floor),
          content: c.content || '',
          depth: 1,
        });
        for (const r of c.replies || []) {
          posts.push({
            id: now + floor,
            floor: floor++,
            author: r.author || '匿名',
            time: ts(3 * floor),
            content: r.content || '',
            depth: 2,
          });
        }
      }
      thread.posts = posts;
      thread.replies = posts.length - 1;
    } catch (e: any) {
      lastError.value = e.message || '生成失败';
    } finally {
      generating.value = false;
    }
  }

  async function generateReplies(thread: ForumThread) {
    const cfg = getActiveCfg(settings);
    if (!cfg.url || !cfg.apiKey || !thread.posts || thread.posts.length === 0) return;
    replying.value = true;
    lastError.value = '';
    try {
      const context = thread.posts
        .map(
          p =>
            '[#' +
            p.floor +
            ' ' +
            p.author +
            (p.depth && p.depth > 0 ? '(回复)' : '(楼主)') +
            ']: ' +
            p.content.slice(0, 300),
        )
        .join('\n');
      const wb = await getWorldbookContent();
      const raw = await aiGenerate(
        cfg,
        buildRepliesPrompt(thread.section as ForumSectionKey, thread, context, wb),
        REPLY_LIST_SCHEMA,
      );
      const data = extractJSON(raw);
      const replies: any[] = Array.isArray(data) ? data : data.replies || [];
      const now = Date.now();
      const ts = (off = 0) => {
        const d = new Date(now - off * 60000);
        return (
          d.getMonth() +
          1 +
          '月' +
          d.getDate() +
          '日 ' +
          String(d.getHours()).padStart(2, '0') +
          ':' +
          String(d.getMinutes()).padStart(2, '0')
        );
      };
      let floor = thread.posts.length + 1;
      for (const r of replies) {
        thread.posts!.push({
          id: now + floor,
          floor: floor++,
          author: r.author || '匿名',
          time: ts(2 * floor),
          content: r.content || '',
          depth: 1,
        });
      }
      thread.replies = thread.posts.length - 1;
    } catch (_) {
    } finally {
      replying.value = false;
    }
  }

  // ---- 排行榜刷新 ----
  function refreshRankings() {
    rankRefreshing.value = true;
    try {
      let vars: any = {};
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
      } catch (_) {}
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
        } catch (_) {}
      }
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'chat' }) ?? {};
        } catch (_) {}
      }
      let pd: any = vars?.stat_data?.契约者;
      if (!pd && vars?.stat_data) {
        for (const k of Object.keys(vars.stat_data)) {
          const v = vars.stat_data[k];
          if (v && typeof v === 'object' && (v.头部 || v.姓名 || v.等级)) {
            pd = v;
            break;
          }
        }
      }
      if (!pd) {
        playerRank.value = null;
        lastError.value = '未找到角色数据';
        return;
      }
      const name = pd?.头部?.姓名 || pd?.姓名 || '';
      const lv = Number(pd?.头部?.等级 || pd?.等级 || 0);
      const team = pd?.头部?.所属势力 || pd?.所属势力 || pd?.势力 || '独立散人';
      if (!name || lv <= 0) {
        playerRank.value = null;
        lastError.value = '未找到角色名或等级';
        return;
      }
      let tier = 0;
      if (lv <= 20) tier = 0;
      else if (lv <= 40) tier = 1;
      else if (lv <= 60) tier = 2;
      else if (lv <= 80) tier = 3;
      else tier = 4;
      const board = RANK_BOARDS[tier];
      let insertRank = board.items.length;
      for (let i = 0; i < board.items.length; i++) {
        if (lv >= Number(board.items[i].lv)) {
          insertRank = i;
          break;
        }
      }
      if (insertRank < 10) {
        playerRank.value = { rank: insertRank + 1, name: '「' + name + '」', lv: String(lv), team };
        rankIndex.value = tier;
        lastError.value = '';
      } else {
        playerRank.value = null;
        lastError.value = '当前等级 Lv' + lv + ' 未进入' + board.key + '前十';
      }
    } catch (e: any) {
      playerRank.value = null;
    } finally {
      rankRefreshing.value = false;
    }
  }

  // ---- 玩家发帖 ----
  function createThread(sectionKey: string, title: string, content: string) {
    const now = Date.now();
    const d = new Date(now);
    const time =
      d.getMonth() +
      1 +
      '月' +
      d.getDate() +
      '日 ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0');
    const thread: ForumThread = {
      id: now,
      section: sectionKey,
      title: title.trim(),
      preview: content.trim().slice(0, 80),
      author: '我',
      replies: 0,
      time,
      hotComment: '',
      hotAuthor: '',
      hotLikes: 0,
      posts: [{ id: now + 1, floor: 1, author: '我', time, content: content.trim(), depth: 0 }],
    };
    // 插入到该分区列表顶部
    threads.value = [thread, ...threads.value];
    return thread;
  }

  function init() {
    loadWorldbookList();
  }

  return {
    settings,
    activeSection,
    threads,
    rankIndex,
    playerRank,
    rankRefreshing,
    refreshing,
    generating,
    replying,
    lastError,
    testing,
    testResult,
    models,
    loadingModels,
    allWorldbookNames,
    worldbookLoaded,
    influenceEvents,
    influenceAnalyzing,
    influenceError,
    init,
    loadWorldbookList,
    fetchModels,
    testConnection,
    refreshSection,
    refreshRankings,
    generateThreadDetail,
    generateReplies,
    getWorldbookContent,
    getCardWorldbookEntries,
    extractInfluence,
    clearInfluence,
    createThread,
    readRecentChat,
  };
});

// ================================================================
// 职业规划 Store
// ================================================================

const CP_SK = 'wxhl003_career_plans';

function loadCareerPlans(): CareerPlan[] {
  try {
    const r = localStorage.getItem(CP_SK);
    if (r) return JSON.parse(r);
  } catch (_) {}
  return [];
}

function saveCareerPlans(plans: CareerPlan[]) {
  try {
    localStorage.setItem(CP_SK, JSON.stringify(plans));
  } catch (_) {}
}

const RD_SK = 'wxhl003_career_roadmaps';

function loadRoadmaps(): CareerRoadmap[] {
  try {
    const r = localStorage.getItem(RD_SK);
    if (r) return JSON.parse(r);
  } catch (_) {}
  return [];
}

function saveRoadmaps(roadmaps: CareerRoadmap[]) {
  try {
    localStorage.setItem(RD_SK, JSON.stringify(roadmaps));
  } catch (_) {}
}

// ============ JSON Schema: 第一轮 ============
const CAREER_V1_SCHEMA = {
  name: 'career_plan_v1',
  value: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      rarity: { type: 'string' },
      coreConcept: { type: 'string' },
      mainJob: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rarity: { type: 'string' },
          acquisition: { type: 'string' },
          classTree: { type: 'string' },
          attributeTendency: { type: 'string' },
        },
        required: ['name', 'rarity', 'acquisition', 'classTree', 'attributeTendency'],
      },
      subJob: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rarity: { type: 'string' },
          world: { type: 'string' },
          acquisition: { type: 'string' },
          classTree: { type: 'string' },
          attributeTendency: { type: 'string' },
        },
        required: ['name', 'rarity', 'world', 'acquisition', 'classTree', 'attributeTendency'],
      },
      affinity: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          reasons: { type: 'string' },
        },
        required: ['result', 'reasons'],
      },
      evolution: {
        type: 'object',
        properties: {
          firstClass: { type: 'string' },
          secondClass: { type: 'string' },
          thirdClass: { type: 'string' },
        },
        required: ['firstClass', 'secondClass', 'thirdClass'],
      },
    },
    required: ['name', 'rarity', 'coreConcept', 'mainJob', 'subJob', 'affinity', 'evolution'],
  },
};

// ============ JSON Schema: 第二轮 ============
const CAREER_V2_SCHEMA = {
  name: 'career_plan_v2',
  value: {
    type: 'object',
    properties: {
      mainSkillTree: { type: 'string' },
      subSkillTree: { type: 'string' },
      mainPassives: { type: 'string' },
      subPassives: { type: 'string' },
      combinedAttributes: { type: 'string' },
      equipmentFit: { type: 'string' },
      stepGuide: { type: 'array', items: { type: 'string' } },
      risks: { type: 'string' },
    },
    required: [
      'mainSkillTree',
      'subSkillTree',
      'mainPassives',
      'subPassives',
      'combinedAttributes',
      'equipmentFit',
      'stepGuide',
      'risks',
    ],
  },
};

// ============ 生成 Prompt 构建 ============
function buildCareerV1Prompt(keywords: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的职业规划AI。请根据以下规则，为契约者设计一个融合职业方案。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【世界观模块摘要】
${CORE_WORLD}

【契约者的想法】
${keywords}

【任务要求】
请根据契约者输入的关键词或混乱想法，理解其意图并梳理出清晰的方向，然后设计一个融合职业方案。方案必须包含以下所有字段：

1. **name**: 融合职业名称（如"写轮眼刺客"、"恶魔猎手·炎拳"、"风遁剑圣"等），要体现主副职业融合的特色
2. **rarity**: 主职业稀有度（白色/蓝色/金色/紫色/银色），并提供稀有度判定理由
3. **coreConcept**: 一句话核心定位，概括这个融合职业的战斗风格和核心特色
4. **mainJob**: 回廊原生主职业
   - name: 职业名称
   - rarity: 稀有度
   - acquisition: 获取方式和大致花费UP
   - classTree: 完整转职路线（从基础到三转的每个分支名称和核心能力）
   - attributeTendency: 属性倾向（如"主STR副CON"）
5. **subJob**: 副本副职业
   - name: 职业名称
   - rarity: 稀有度，并给出稀有度判定依据
   - world: 来自哪个副本世界（具体作品名）
   - acquisition: 在该世界中如何获取（具体步骤和条件）
   - classTree: 转职路线（最高到二转）
   - attributeTendency: 属性倾向
6. **affinity**: 相性分析
   - result: 判定结果（必须是"高相性"）
   - reasons: 详细判定理由（属性重叠度、战斗方式契合度、主题逻辑）
7. **evolution**: 进化路线图
   - firstClass: 一转的名称、达成条件、核心变化
   - secondClass: 二转的名称、达成条件、核心变化
   - thirdClass: 三转的名称、达成条件、核心变化（副职业二转后停止进化）`;
}

function buildCareerV2Prompt(plan: CareerPlan, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的职业规划AI。你已经为契约者设计了一个融合职业方案的框架，现在需要补充方案的具体细节。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【已确认的职业方案框架】
- 融合职业名称: ${plan.name}
- 稀有度: ${plan.rarity}
- 核心定位: ${plan.coreConcept}
- 主职业: ${plan.mainJob.name}（${plan.mainJob.rarity}）— 属性倾向: ${plan.mainJob.attributeTendency}
- 主职业转职: ${plan.mainJob.classTree}
- 副职业: ${plan.subJob.name}（${plan.subJob.rarity}）— 来自《${plan.subJob.world}》— 属性倾向: ${plan.subJob.attributeTendency}
- 副职业转职: ${plan.subJob.classTree}
- 相性: ${plan.affinity.result} — ${plan.affinity.reasons}
- 一转: ${plan.evolution.firstClass}
- 二转: ${plan.evolution.secondClass}
- 三转: ${plan.evolution.thirdClass}

【任务要求】
请在以上框架的基础上，生成以下具体细节（每个字段都要详细填充）：

1. **mainSkillTree**: 主职业技能树。从Lv.1到Lv.9，奇数级各解锁什么技能，技能名称+简要效果。稀有度越高技能越丰富。
2. **subSkillTree**: 副职业保留的3个核心技能。技能名称+效果，说明为何选中这3个作为核心。随副职业转职，这3个技能如何升级进化。
3. **mainPassives**: 主职业偶数级（Lv.2/4/6/8/10）获得的被动特性，每个特性的名称和效果。
4. **subPassives**: 副职业偶数级获得的被动特性。
5. **combinedAttributes**: 融合后属性加成合计值。主职业完整+副职业减半（向下取整）。按Lv.1~3/4~6/7~9/10四个阶段展示主副属性数值变化。
6. **equipmentFit**: 装备适性建议。适合哪些类型的装备，可能触发隐藏词条的装备类型。
7. **stepGuide**: 分步获取指南。从零开始的完整步骤，每一步具体要做什么：
   - Step 1: 在回廊做什么准备
   - Step 2: 获取主职业书
   - Step 3: 进入副本世界获取副本职业
   - Step 4: 进行融合
   - 后续步骤: 练级转职的方向建议
8. **risks**: 风险提示。必须包含：融合终身仅一次不可逆、PEXP升级阈值翻倍、转职考核难度翻倍，以及该具体方案的特殊风险。`;
}

// ================================================================
// 修改方案 Prompt
// ================================================================
function buildModifyPlanPrompt(plan: CareerPlan, feedback: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的职业规划AI。契约者对已生成的融合职业方案提出了修改意见，请根据意见重新生成方案框架。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【当前方案框架】
- 融合职业名称: ${plan.name}
- 稀有度: ${plan.rarity}
- 核心定位: ${plan.coreConcept}
- 主职业: ${plan.mainJob.name}（${plan.mainJob.rarity}）— ${plan.mainJob.attributeTendency}
- 副职业: ${plan.subJob.name}（${plan.subJob.rarity}）— 来自《${plan.subJob.world}》
- 主职业转职: ${plan.mainJob.classTree}
- 副职业转职: ${plan.subJob.classTree}
- 相性: ${plan.affinity.result} — ${plan.affinity.reasons}
- 一转: ${plan.evolution.firstClass}
- 二转: ${plan.evolution.secondClass}
- 三转: ${plan.evolution.thirdClass}

【修改意见】
${feedback}

【任务要求】
根据修改意见，重新设计方案框架。保留修改意见认可的部分，只改动需要调整的地方。必须返回完整的方案框架JSON（所有字段）。`;
}

function buildModifyRoadmapPrompt(roadmap: CareerRoadmap, feedback: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的职业规划AI。契约者对已生成的生涯规划提出了修改意见，请根据意见重新生成规划框架。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【当前规划框架】
- 路线标题: ${roadmap.title}
- 当前状况: ${roadmap.currentState}
- 推荐方向: ${roadmap.recommendedDirection}
- 目标世界: ${roadmap.targetWorlds.join('、')}
- 融合建议: ${roadmap.fusionAdvice}
- 转职路线: ${roadmap.evolutionPath}

【修改意见】
${feedback}

【任务要求】
根据修改意见，重新生成生涯规划框架。保留修改意见认可的部分，只改动需要调整的地方。必须返回完整的规划框架JSON（所有字段）。`;
}

// ================================================================
// 生涯规划 JSON Schemas & Prompts
// ================================================================
const ROADMAP_V1_SCHEMA = {
  name: 'career_roadmap_v1',
  value: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      currentState: { type: 'string' },
      recommendedDirection: { type: 'string' },
      targetWorlds: { type: 'array', items: { type: 'string' } },
      fusionAdvice: { type: 'string' },
      evolutionPath: { type: 'string' },
    },
    required: ['title', 'currentState', 'recommendedDirection', 'targetWorlds', 'fusionAdvice', 'evolutionPath'],
  },
};

const ROADMAP_V2_SCHEMA = {
  name: 'career_roadmap_v2',
  value: {
    type: 'object',
    properties: {
      stepPlan: { type: 'array', items: { type: 'string' } },
      skillAdvice: { type: 'string' },
      equipmentAdvice: { type: 'string' },
      risks: { type: 'string' },
    },
    required: ['stepPlan', 'skillAdvice', 'equipmentAdvice', 'risks'],
  },
};

function buildRoadmapV1Prompt(keywords: string, playerCareer: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的职业规划AI。契约者希望基于自己当前的职业状况，制定一份职业生涯规划。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【契约者当前职业状况】
${playerCareer || '（未检测到当前职业数据）'}

【契约者期望的发展方向】
${keywords}

【任务要求】
根据契约者当前职业状况和期望方向，生成职业生涯规划框架：

1. title: 路线标题，如"剑士→暗杀特化发展路线"
2. currentState: 分析当前职业的优势和不足
3. recommendedDirection: 推荐发展方向（具体说明理由）
4. targetWorlds: 建议进入的副本世界列表（至少2-3个），并简要说明每个世界的目标
5. fusionAdvice: 是否建议进行职业融合，如果建议则推荐具体的目标融合职业
6. evolutionPath: 推荐的转职路线（考虑主副职业的转职路径）`;
}

function buildRoadmapV2Prompt(roadmap: CareerRoadmap, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的职业规划AI。你已为契约者制定了职业生涯规划框架，现在需要补充具体执行细节。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【已确认的规划框架】
- 路线标题: ${roadmap.title}
- 当前状况: ${roadmap.currentState}
- 推荐方向: ${roadmap.recommendedDirection}
- 目标世界: ${roadmap.targetWorlds.join('、')}
- 融合建议: ${roadmap.fusionAdvice}
- 转职路线: ${roadmap.evolutionPath}

【任务要求】
请在以上框架的基础上，生成以下具体细节：

1. stepPlan: 分步执行计划（每一步具体要做什么，从当前状态到达成目标）
2. skillAdvice: 技能构筑建议。生成3-5个具有联动效果的示例技能组合，每个技能说明其构筑定位和与其他技能的联动方式。格式示例：
\`\`\`
核心技能【暗影突刺】：瞬移至目标背后造成暴击 → 触发被动【暗杀者本能】：背刺后3秒内下次攻击必暴击 → 衔接【连环刺】：连续3次攻击每次递增20%伤害 → 收尾【消失】：击杀后进入潜行重置循环
\`\`\`
3. equipmentAdvice: 装备构筑建议。按部位给出关键词方向的装备建议，并说明组合成的构筑效果。格式示例：
\`\`\`
躯体 — 【潜行】【轻装】
头部 — 【夜视】【感知】
...
组合效果：潜行入场→背刺暴击→击杀刷新→消失→重复
\`\`\`
4. risks: 风险提示和执行注意事项`;
}

// ================================================================
// 读取玩家职业数据
// ================================================================
function readPlayerCareer(): string {
  try {
    let vars: any = {};
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
    } catch (_) {}
    if (!vars?.stat_data?.契约者) {
      try {
        vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
      } catch (_) {}
    }
    if (!vars?.stat_data?.契约者) {
      try {
        vars = getVariables?.({ type: 'chat' }) ?? {};
      } catch (_) {}
    }
    const character = vars?.stat_data?.契约者;
    if (!character) return '（未找到角色数据）';

    const career = character?.职业;
    if (!career) return '（角色当前未持有职业）';

    // 提取关键职业字段
    const parts: string[] = [];
    if (career.名称) parts.push('职业名称: ' + career.名称);
    if (career.稀有度) parts.push('稀有度: ' + career.稀有度);
    if (career.转职阶段) parts.push('转职阶段: ' + career.转职阶段);
    if (career.职业等级) parts.push('职业等级: Lv.' + career.职业等级);
    if (career.主属性加成) parts.push('主属性加成: ' + JSON.stringify(career.主属性加成));
    if (career.副属性加成) parts.push('副属性加成: ' + JSON.stringify(career.副属性加成));
    if (career.职业技能 && Object.keys(career.职业技能).length > 0)
      parts.push('职业技能: ' + JSON.stringify(career.职业技能));
    if (career.职业特性 && Object.keys(career.职业特性).length > 0)
      parts.push('职业特性: ' + JSON.stringify(career.职业特性));
    if (career.传承技能 && Object.keys(career.传承技能).length > 0)
      parts.push('传承技能: ' + JSON.stringify(career.传承技能));
    if (career.转职树) parts.push('转职树: ' + JSON.stringify(career.转职树));

    // 同时也读取角色基础信息
    if (character?.头部) {
      const h = character.头部;
      if (h.姓名) parts.push('契约者: ' + h.姓名);
      if (h.等级) parts.push('等级: Lv.' + h.等级);
      if (h.阶位) parts.push('阶位: ' + h.阶位);
      if (h.所属势力) parts.push('势力: ' + h.所属势力);
    }

    return parts.join('\n');
  } catch (_) {
    return '（读取职业数据时出错）';
  }
}

// ================================================================
// PINIA STORE: useCareerStore
// ================================================================
export const useCareerStore = defineStore('career', () => {
  const plans = ref<CareerPlan[]>(loadCareerPlans());
  const roadmaps = ref<CareerRoadmap[]>(loadRoadmaps());
  const activePlanType = ref<PlanType>('fusion');
  const generatingV1 = ref(false);
  const generatingV2 = ref(false);
  const lastError = ref('');

  // 自动同步 localStorage
  watchEffect(() => saveCareerPlans(plans.value));
  watchEffect(() => saveRoadmaps(roadmaps.value));

  function getForumStore() {
    return useForumStore();
  }

  // ============ 融合方案 ============

  async function createPlan(keywords: string) {
    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV1.value = true;
    lastError.value = '';
    try {
      const wb = await forumStore.getWorldbookContent();
      const prompt = buildCareerV1Prompt(keywords, wb);
      const raw = await aiGenerate(cfg, prompt, CAREER_V1_SCHEMA);
      const data = extractJSON(raw);

      const now = new Date();
      const ts =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0') +
        ' ' +
        String(now.getHours()).padStart(2, '0') +
        ':' +
        String(now.getMinutes()).padStart(2, '0');

      const maxId = plans.value.reduce((m, p) => Math.max(m, p.id), 0);
      const plan: CareerPlan = {
        id: maxId + 1,
        createdAt: ts,
        keywords,
        phase: 'v1',
        name: data.name || '未命名',
        rarity: data.rarity || '白色',
        coreConcept: data.coreConcept || '',
        mainJob: data.mainJob || { name: '', rarity: '', acquisition: '', classTree: '', attributeTendency: '' },
        subJob: data.subJob || {
          name: '',
          rarity: '',
          world: '',
          acquisition: '',
          classTree: '',
          attributeTendency: '',
        },
        affinity: data.affinity || { result: '', reasons: '' },
        evolution: data.evolution || { firstClass: '', secondClass: '', thirdClass: '' },
      };
      plans.value.unshift(plan);
    } catch (e: any) {
      lastError.value = e.message || '生成失败';
    } finally {
      generatingV1.value = false;
    }
  }

  /** 修改 V1 方案（根据反馈重新生成框架） */
  async function modifyPlan(id: number, feedback: string) {
    if (generatingV1.value) return;
    const idx = plans.value.findIndex(p => p.id === id);
    if (idx < 0) return;

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV1.value = true;
    lastError.value = '';
    try {
      const plan = plans.value[idx];
      const wb = await forumStore.getWorldbookContent();
      const prompt = buildModifyPlanPrompt(plan, feedback, wb);
      const raw = await aiGenerate(cfg, prompt, CAREER_V1_SCHEMA);
      const data = extractJSON(raw);

      // 原地替换 V1 字段
      const latestIdx = plans.value.findIndex(p => p.id === id);
      if (latestIdx < 0) return;
      plans.value[latestIdx] = {
        ...plans.value[latestIdx],
        name: data.name || plans.value[latestIdx].name,
        rarity: data.rarity || plans.value[latestIdx].rarity,
        coreConcept: data.coreConcept || plans.value[latestIdx].coreConcept,
        mainJob: data.mainJob || plans.value[latestIdx].mainJob,
        subJob: data.subJob || plans.value[latestIdx].subJob,
        affinity: data.affinity || plans.value[latestIdx].affinity,
        evolution: data.evolution || plans.value[latestIdx].evolution,
      };
    } catch (e: any) {
      lastError.value = e.message || '修改失败';
    } finally {
      generatingV1.value = false;
    }
  }

  async function confirmPlan(id: number) {
    if (generatingV2.value) return;
    const idx = plans.value.findIndex(p => p.id === id);
    if (idx < 0) return;

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV2.value = true;
    lastError.value = '';
    try {
      const plan = plans.value[idx];
      const wb = await forumStore.getWorldbookContent();
      const prompt = buildCareerV2Prompt(plan, wb);
      const raw = await aiGenerate(cfg, prompt, CAREER_V2_SCHEMA);
      const data = extractJSON(raw);

      const latestIdx = plans.value.findIndex(p => p.id === id);
      if (latestIdx < 0) return;
      plans.value[latestIdx] = {
        ...plans.value[latestIdx],
        phase: 'complete',
        mainSkillTree: data.mainSkillTree || '',
        subSkillTree: data.subSkillTree || '',
        mainPassives: data.mainPassives || '',
        subPassives: data.subPassives || '',
        combinedAttributes: data.combinedAttributes || '',
        equipmentFit: data.equipmentFit || '',
        stepGuide: Array.isArray(data.stepGuide) ? data.stepGuide : [],
        risks: data.risks || '',
      };
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败';
    } finally {
      generatingV2.value = false;
    }
  }

  function deletePlan(id: number) {
    plans.value = plans.value.filter(p => p.id !== id);
  }

  // ============ 生涯规划 ============

  async function createRoadmap(keywords: string) {
    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    const career = readPlayerCareer();
    generatingV1.value = true;
    lastError.value = '';
    try {
      const wb = await forumStore.getWorldbookContent();
      const prompt = buildRoadmapV1Prompt(keywords, career, wb);
      const raw = await aiGenerate(cfg, prompt, ROADMAP_V1_SCHEMA);
      const data = extractJSON(raw);

      const now = new Date();
      const ts =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0') +
        ' ' +
        String(now.getHours()).padStart(2, '0') +
        ':' +
        String(now.getMinutes()).padStart(2, '0');

      const maxId = roadmaps.value.reduce((m, r) => Math.max(m, r.id), 0);
      const roadmap: CareerRoadmap = {
        id: maxId + 1,
        createdAt: ts,
        keywords,
        phase: 'v1',
        planType: 'roadmap',
        title: data.title || '未命名路线',
        currentState: data.currentState || '',
        recommendedDirection: data.recommendedDirection || '',
        targetWorlds: Array.isArray(data.targetWorlds) ? data.targetWorlds : [],
        fusionAdvice: data.fusionAdvice || '',
        evolutionPath: data.evolutionPath || '',
      };
      roadmaps.value.unshift(roadmap);
    } catch (e: any) {
      lastError.value = e.message || '生成失败';
    } finally {
      generatingV1.value = false;
    }
  }

  async function confirmRoadmap(id: number) {
    if (generatingV2.value) return;
    const idx = roadmaps.value.findIndex(r => r.id === id);
    if (idx < 0) return;

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV2.value = true;
    lastError.value = '';
    try {
      const roadmap = roadmaps.value[idx];
      const wb = await forumStore.getWorldbookContent();
      const prompt = buildRoadmapV2Prompt(roadmap, wb);
      const raw = await aiGenerate(cfg, prompt, ROADMAP_V2_SCHEMA);
      const data = extractJSON(raw);

      const latestIdx = roadmaps.value.findIndex(r => r.id === id);
      if (latestIdx < 0) return;
      roadmaps.value[latestIdx] = {
        ...roadmaps.value[latestIdx],
        phase: 'complete',
        stepPlan: Array.isArray(data.stepPlan) ? data.stepPlan : [],
        skillAdvice: data.skillAdvice || '',
        equipmentAdvice: data.equipmentAdvice || '',
        risks: data.risks || '',
      };
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败';
    } finally {
      generatingV2.value = false;
    }
  }

  async function modifyRoadmap(id: number, feedback: string) {
    if (generatingV1.value) return;
    const idx = roadmaps.value.findIndex(r => r.id === id);
    if (idx < 0) return;

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV1.value = true;
    lastError.value = '';
    try {
      const roadmap = roadmaps.value[idx];
      const wb = await forumStore.getWorldbookContent();
      const prompt = buildModifyRoadmapPrompt(roadmap, feedback, wb);
      const raw = await aiGenerate(cfg, prompt, ROADMAP_V1_SCHEMA);
      const data = extractJSON(raw);

      const latestIdx = roadmaps.value.findIndex(r => r.id === id);
      if (latestIdx < 0) return;
      roadmaps.value[latestIdx] = {
        ...roadmaps.value[latestIdx],
        title: data.title || roadmaps.value[latestIdx].title,
        currentState: data.currentState || roadmaps.value[latestIdx].currentState,
        recommendedDirection: data.recommendedDirection || roadmaps.value[latestIdx].recommendedDirection,
        targetWorlds: Array.isArray(data.targetWorlds) ? data.targetWorlds : roadmaps.value[latestIdx].targetWorlds,
        fusionAdvice: data.fusionAdvice || roadmaps.value[latestIdx].fusionAdvice,
        evolutionPath: data.evolutionPath || roadmaps.value[latestIdx].evolutionPath,
      };
    } catch (e: any) {
      lastError.value = e.message || '修改失败';
    } finally {
      generatingV1.value = false;
    }
  }

  function deleteRoadmap(id: number) {
    roadmaps.value = roadmaps.value.filter(r => r.id !== id);
  }

  return {
    plans,
    roadmaps,
    activePlanType,
    generatingV1,
    generatingV2,
    lastError,
    createPlan,
    modifyPlan,
    confirmPlan,
    deletePlan,
    createRoadmap,
    modifyRoadmap,
    confirmRoadmap,
    deleteRoadmap,
  };
});

// ================================================================
// 副本攻略
// ================================================================
const DG_SK = 'wxhl003_dungeon_strategies';

function loadDungeons(): DungeonStrategy[] {
  try {
    const r = localStorage.getItem(DG_SK);
    if (r) return JSON.parse(r);
  } catch (_) {}
  return [];
}

function saveDungeons(dungeons: DungeonStrategy[]) {
  try {
    localStorage.setItem(DG_SK, JSON.stringify(dungeons));
  } catch (_) {}
}

const DUNGEON_V1_SCHEMA = {
  name: 'dungeon_strategy_v1',
  value: {
    type: 'object',
    properties: {
      dungeonName: { type: 'string' },
      routeOverview: { type: 'string' },
      questExecution: { type: 'string' },
      achievementPlan: { type: 'string' },
      hiddenQuestStrategy: { type: 'string' },
    },
    required: ['dungeonName', 'routeOverview', 'questExecution', 'achievementPlan', 'hiddenQuestStrategy'],
  },
};

const DUNGEON_V2_SCHEMA = {
  name: 'dungeon_strategy_v2',
  value: {
    type: 'object',
    properties: {
      stepPlan: { type: 'array', items: { type: 'string' } },
      combatAdvice: { type: 'string' },
      resourceAdvice: { type: 'string' },
      risks: { type: 'string' },
    },
    required: ['stepPlan', 'combatAdvice', 'resourceAdvice', 'risks'],
  },
};

function buildModeDesc(mode: DungeonMode): string {
  switch (mode) {
    case 'goal':
      return '以契约者输入的目标为首要目标，围绕它规划整趟副本';
    case 'speedrun':
      return '速通：最快通关主线和支线';
    case 'perfect':
      return '完美通关：完成主线、支线、隐藏任务和全部成就';
    case 'deep':
      return '深度挖掘：挖掘隐藏力量、道具，面对隐藏BOSS，主动介入世界事件';
    case 'fun':
      return '搞耍：乐子人玩法，怎么有趣怎么来';
  }
}

function buildDungeonV1Prompt(
  faction: Faction,
  mode: DungeonMode,
  playerGoal: string,
  statData: string,
  worldbookText: string,
): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  const goalCtx = mode === 'goal' ? `\n【契约者的目标】\n${playerGoal}\n` : '';
  return `你是无限回廊的副本攻略AI。请为契约者生成一份针对当前副本的完整攻略路线。

${worldCtx}

【副本与玩家数据】
${statData || '（未读取到数据）'}
${goalCtx}
【阵营偏向】
${faction}

【攻略模式】
${buildModeDesc(mode)}

【任务要求】
通读副本数据（含主线任务、支线任务、成就、隐藏任务线索）和玩家状态（职业、等级、技能、装备、属性），生成一份攻略框架：

1. dungeonName: 副本名称
2. routeOverview: 路线总览。一句话概括这条路线怎么走，能达成哪些目标
3. questExecution: 主线与支线任务执行计划。按照副本里的实际任务安排先后顺序，标注关键点
4. achievementPlan: 成就达成方案。副本里的成就逐个说明达成条件和方法
5. hiddenQuestStrategy: 隐藏任务攻略。副本开局会给一条隐藏任务的线索，结合这条线索推测隐藏任务的触发方式并给出执行方案`;
}

function buildDungeonV2Prompt(dungeon: DungeonStrategy, statData: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你是无限回廊的副本攻略AI。你已为契约者生成了副本攻略框架，现在需要补充具体执行细节。

${worldCtx}

【副本与玩家数据】
${statData || '（未读取到数据）'}

【已确认的攻略框架】
- 副本名称: ${dungeon.dungeonName}
- 阵营偏向: ${dungeon.faction}
- 路线总览: ${dungeon.routeOverview}
- 主线支线执行: ${dungeon.questExecution}
- 成就方案: ${dungeon.achievementPlan}
- 隐藏任务: ${dungeon.hiddenQuestStrategy}

【任务要求】
在框架基础上生成具体执行细节：

1. stepPlan: 分步执行路线。从副本开局到结束，每一步具体做什么，覆盖主线、支线、成就、隐藏任务
2. combatAdvice: 针对玩家当前职业和技能的战斗建议。针对副本中的关键战斗，说明怎么利用现有技能、装备、特性应对
3. resourceAdvice: 资源与道具优先级建议。副本中可能获得或消耗的道具、消耗品，哪些值得保留/使用
4. risks: 风险提示与翻车预案。这条路线容易翻车的环节，以及对应的应对预案`;
}

function readPlayerData(): string {
  try {
    let vars: any = {};
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
    } catch (_) {}
    if (!vars?.stat_data) {
      try {
        vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
      } catch (_) {}
    }
    if (!vars?.stat_data) {
      try {
        vars = getVariables?.({ type: 'chat' }) ?? {};
      } catch (_) {}
    }
    const stat = vars?.stat_data;
    if (!stat) return '（未找到角色数据）';
    return JSON.stringify(stat);
  } catch (_) {
    return '（读取角色数据时出错）';
  }
}

export const useDungeonStore = defineStore('dungeon', () => {
  const dungeons = ref<DungeonStrategy[]>(loadDungeons());
  const generatingV1 = ref(false);
  const generatingV2 = ref(false);
  const lastError = ref('');

  watchEffect(() => saveDungeons(dungeons.value));

  function getForumStore() {
    return useForumStore();
  }

  /** 第一轮生成：攻略框架 */
  async function createDungeon(faction: Faction, mode: DungeonMode, playerGoal: string) {
    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV1.value = true;
    lastError.value = '';
    try {
      const wb = await forumStore.getWorldbookContent();
      const statData = readPlayerData();
      const prompt = buildDungeonV1Prompt(faction, mode, playerGoal, statData, wb);
      const raw = await aiGenerate(cfg, prompt, DUNGEON_V1_SCHEMA);
      const data = extractJSON(raw);

      const now = new Date();
      const ts =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0') +
        ' ' +
        String(now.getHours()).padStart(2, '0') +
        ':' +
        String(now.getMinutes()).padStart(2, '0');

      const maxId = dungeons.value.reduce((m, d) => Math.max(m, d.id), 0);
      const dungeon: DungeonStrategy = {
        id: maxId + 1,
        createdAt: ts,
        phase: 'v1',
        faction,
        mode,
        playerGoal,
        dungeonName: data.dungeonName || '未命名副本',
        routeOverview: data.routeOverview || '',
        questExecution: data.questExecution || '',
        achievementPlan: data.achievementPlan || '',
        hiddenQuestStrategy: data.hiddenQuestStrategy || '',
      };
      dungeons.value.unshift(dungeon);
    } catch (e: any) {
      lastError.value = e.message || '生成失败';
    } finally {
      generatingV1.value = false;
    }
  }

  /** 修改 V1（按反馈重新生成） */
  async function modifyDungeon(id: number, feedback: string) {
    if (generatingV1.value) return;
    const idx = dungeons.value.findIndex(d => d.id === id);
    if (idx < 0) return;

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV1.value = true;
    lastError.value = '';
    try {
      const dungeon = dungeons.value[idx];
      const wb = await forumStore.getWorldbookContent();
      const statData = readPlayerData();
      const prompt = `你是无限回廊的副本攻略AI。契约者对已生成的副本攻略提出了修改意见，请根据意见重新生成攻略框架。

【副本与玩家数据】
${statData}

${wb ? '\n【世界观参考】\n' + wb : ''}

【当前攻略框架】
- 副本名称: ${dungeon.dungeonName}
- 阵营偏向: ${dungeon.faction}
- 路线总览: ${dungeon.routeOverview}
- 主线支线执行: ${dungeon.questExecution}
- 成就方案: ${dungeon.achievementPlan}
- 隐藏任务: ${dungeon.hiddenQuestStrategy}

【修改意见】
${feedback}

【任务要求】
根据修改意见重新生成完整攻略框架（所有字段）。保留修改意见认可的部分，只改动需要调整的地方。`;
      const raw = await aiGenerate(cfg, prompt, DUNGEON_V1_SCHEMA);
      const data = extractJSON(raw);

      const latestIdx = dungeons.value.findIndex(d => d.id === id);
      if (latestIdx < 0) return;
      dungeons.value[latestIdx] = {
        ...dungeons.value[latestIdx],
        dungeonName: data.dungeonName || dungeons.value[latestIdx].dungeonName,
        routeOverview: data.routeOverview || dungeons.value[latestIdx].routeOverview,
        questExecution: data.questExecution || dungeons.value[latestIdx].questExecution,
        achievementPlan: data.achievementPlan || dungeons.value[latestIdx].achievementPlan,
        hiddenQuestStrategy: data.hiddenQuestStrategy || dungeons.value[latestIdx].hiddenQuestStrategy,
      };
    } catch (e: any) {
      lastError.value = e.message || '修改失败';
    } finally {
      generatingV1.value = false;
    }
  }

  /** 重roll：用原条件重新生成 V1 */
  async function rerollDungeon(id: number) {
    if (generatingV1.value) return;
    const idx = dungeons.value.findIndex(d => d.id === id);
    if (idx < 0) return;
    const dungeon = dungeons.value[idx];
    await createDungeon(dungeon.faction, dungeon.mode, dungeon.playerGoal);
  }

  /** 第二轮生成：细节 */
  async function confirmDungeon(id: number) {
    if (generatingV2.value) return;
    const idx = dungeons.value.findIndex(d => d.id === id);
    if (idx < 0) return;

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingV2.value = true;
    lastError.value = '';
    try {
      const dungeon = dungeons.value[idx];
      const wb = await forumStore.getWorldbookContent();
      const statData = readPlayerData();
      const prompt = buildDungeonV2Prompt(dungeon, statData, wb);
      const raw = await aiGenerate(cfg, prompt, DUNGEON_V2_SCHEMA);
      const data = extractJSON(raw);

      const latestIdx = dungeons.value.findIndex(d => d.id === id);
      if (latestIdx < 0) return;
      dungeons.value[latestIdx] = {
        ...dungeons.value[latestIdx],
        phase: 'complete',
        stepPlan: Array.isArray(data.stepPlan) ? data.stepPlan : [],
        combatAdvice: data.combatAdvice || '',
        resourceAdvice: data.resourceAdvice || '',
        risks: data.risks || '',
      };
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败';
    } finally {
      generatingV2.value = false;
    }
  }

  function deleteDungeon(id: number) {
    dungeons.value = dungeons.value.filter(d => d.id !== id);
  }

  return {
    dungeons,
    generatingV1,
    generatingV2,
    lastError,
    createDungeon,
    modifyDungeon,
    rerollDungeon,
    confirmDungeon,
    deleteDungeon,
  };
});

// ================================================================
// PvP 竞技场 · 创意工坊
// ================================================================

export const useWorkshopStore = defineStore('workshop', () => {
  const contracts = ref<WorkshopCard[]>([]);
  const loadingContracts = ref(false);
  const worldbookError = ref('');
  const mySave = ref<PvPSave | null>(null);
  const extracting = ref(false);
  const aiIntroEnabled = ref(true);
  const introGenerating = ref(false);

  /** 读世界书「契约者角色库」→ 解析为卡片列表（按阶位分组、组内等级降序） */
  async function loadContracts() {
    loadingContracts.value = true;
    worldbookError.value = '';
    try {
      // 注意：条目 enabled 字段不影响读取——契约者库条目按设计均为 enabled:false（不进 AI 上下文），但 getWorldbook 会返回全部条目
      const entries = await getWorldbook(WORKSHOP_WORLDBOOK_NAME);
      const cards: WorkshopCard[] = [];
      let bad = 0;
      for (const e of entries) {
        try {
          const save = PvPSaveSchema.parse(JSON.parse(e.content));
          const h = save.契约者.头部;
          const 职 = save.契约者.职业;
          cards.push({
            name: h.姓名 || e.name || '未知契约者',
            阶位: h.阶位 || '一阶',
            等级: h.等级 || 1,
            军衔: h.军衔 || '列兵',
            职业: 职.名称 || '无',
            简介: save.简介 || '',
            上传者: save.上传者 || '',
            外貌: save.外貌 || '',
            save,
          });
        } catch (_) {
          bad++;
        }
      }
      if (bad > 0) toastr.warning(`契约者角色库有 ${bad} 条条目损坏，已跳过`);
      contracts.value = cards.sort((a, b) => {
        const t = tierOf(a.阶位) - tierOf(b.阶位);
        return t !== 0 ? t : b.等级 - a.等级;
      });
    } catch (e: any) {
      // 读取失败：保留空库并透出真实错误（世界书不存在 / API / 权限等），避免误判为「契约者角色库为空」
      contracts.value = [];
      worldbookError.value = e?.message || '读取世界书失败';
    } finally {
      loadingContracts.value = false;
    }
  }

  /** 读取当前玩家契约者 → 摘六字段为我的构筑 */
  async function extractMySave(): Promise<boolean> {
    extracting.value = true;
    try {
      let vars: any = {};
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
      } catch (_) {}
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
        } catch (_) {}
      }
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'chat' }) ?? {};
        } catch (_) {}
      }
      const character = vars?.stat_data?.契约者;
      if (!character) {
        toastr.warning('未检测到玩家契约者数据');
        return false;
      }
      // extractContractSave 返回顶层六字段 {头部,...}，需包进 {契约者:{...}} 才能被 PvPSaveSchema 解析
      const save = PvPSaveSchema.parse({ 契约者: extractContractSave(character) });
      mySave.value = save;
      return true;
    } catch (e: any) {
      toastr.error('提取构筑失败: ' + (e?.message || e));
      return false;
    } finally {
      extracting.value = false;
    }
  }

  /** AI 生成一句话简介写入 mySave.简介 */
  async function generateIntro() {
    const save = mySave.value;
    if (!save) return;
    const forumStore = useForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      toastr.warning('请先在终端设置中配置 API');
      return;
    }
    introGenerating.value = true;
    try {
      const raw = await aiGenerate(cfg, buildIntroPrompt(save));
      save.简介 = (typeof raw === 'string' ? raw : (raw as any).content || '').trim().slice(0, 60);
    } catch (e: any) {
      toastr.error('生成简介失败: ' + (e?.message || e));
    } finally {
      introGenerating.value = false;
    }
  }

  /** 校验后下载存档为 .json 文件 */
  function downloadMySave() {
    if (!mySave.value) return;
    try {
      const validated = PvPSaveSchema.parse(mySave.value);
      const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (validated.契约者.头部.姓名 || '契约者') + '_构筑存档.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toastr.success('构筑存档已下载');
    } catch (e: any) {
      toastr.error('存档校验失败: ' + (e?.message || e));
    }
  }

  // ---- 作者收录 ----
  const authorDraft = ref('');
  const previewSave = ref<PvPSave | null>(null);
  const authorError = ref('');

  function previewPaste(text: string) {
    authorDraft.value = text;
    authorError.value = '';
    previewSave.value = null;
    try {
      previewSave.value = PvPSaveSchema.parse(JSON.parse(text));
    } catch (e: any) {
      authorError.value = '存档 JSON 解析失败: ' + (e?.message || e);
    }
  }

  async function writeToWorldbook(): Promise<boolean> {
    if (!previewSave.value) {
      authorError.value = '请先校验存档';
      return false;
    }
    try {
      const save = previewSave.value;
      const name = save.契约者.头部.姓名 || '未命名契约者';
      await createWorldbookEntries(WORKSHOP_WORLDBOOK_NAME, [
        {
          name,
          enabled: false,
          content: JSON.stringify(save),
        },
      ]);
      toastr.success('已收录契约者「' + name + '」');
      previewSave.value = null;
      authorDraft.value = '';
      await loadContracts();
      return true;
    } catch (e: any) {
      authorError.value = '写入世界书失败: ' + (e?.message || e);
      return false;
    }
  }

  async function removeContract(name: string) {
    try {
      await deleteWorldbookEntries(WORKSHOP_WORLDBOOK_NAME, entry => entry.name === name);
      toastr.success('已移除契约者「' + name + '」');
      await loadContracts();
    } catch (e: any) {
      toastr.error('移除失败: ' + (e?.message || e));
    }
  }

  // ---- 发起对战 ----
  async function startBattle(card: WorkshopCard): Promise<boolean> {
    try {
      await waitGlobalInitialized('Mvu');
      const enemy = {
        外貌: card.外貌 || generateDefaultAppearance(card.save.契约者.装备),
        头部: card.save.契约者.头部,
        属性: card.save.契约者.属性,
        衍生属性: card.save.契约者.衍生属性,
        职业: card.save.契约者.职业,
        通用技能: card.save.契约者.通用技能,
        装备: card.save.契约者.装备,
      };
      // 用当前楼层（与 extractMySave/readPlayerData 探测模式一致）。全局脚本 iframe 无楼层上下文，
      // getCurrentMessageId() 调用会抛错 → try/catch 吞掉后回退 -1（最新楼层）
      let message_id: number | 'latest' = -1;
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) message_id = mid;
      } catch (_) {}
      const mvu = Mvu.getMvuData({ type: 'message', message_id });
      // 数组路径：每个元素都是字面量 key，名字含「.」（如 J.K.罗琳）不会被 lodash 当作层级分隔，且只写这一条路径（不清空不覆盖）
      _.set(mvu, ['stat_data', '契约者', '当前敌人', card.name], enemy);
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id });
      // 以玩家身份发送挑战消息（player 视角引导 AI 抽取副本作为模拟战场）
      await createChatMessages([{ role: 'user', message: buildBattleIntroMessage(card) }]);
      toastr.success('对战开始！对手已写入');
      return true;
    } catch (e: any) {
      toastr.error('发起对战失败: ' + (e?.message || e));
      return false;
    }
  }

  return {
    contracts,
    loadingContracts,
    worldbookError,
    mySave,
    extracting,
    aiIntroEnabled,
    introGenerating,
    loadContracts,
    extractMySave,
    generateIntro,
    downloadMySave,
    authorDraft,
    previewSave,
    authorError,
    previewPaste,
    writeToWorldbook,
    removeContract,
    startBattle,
  };
});

// ================================================================
// 副本生成
// ================================================================
const DGEN_SK = 'wxhl003_rolled_dungeons';

/** 单个副本角色的生成槽位 */
export interface EnemySlot {
  /** AI 原始产物。面板专用的「威胁」也在里面 —— 按用户规则, 威胁不进变量 */
  数据: GeneratedEnemy;
  /** 写入后回读前端代算值拼出的 <enemy> 面板; 尚未写入时为空串 */
  面板: string;
  /** 是否已写进存档 */
  已写入: boolean;
}

/** 一次「掷骰 + 生成」的完整产物 */
export interface RolledDungeon {
  id: number;
  createdAt: string;
  /** 全部骰值与映射, 含奖励骰 */
  buildRecords: RollRecord[];
  rewardRecords: RollRecord[];
  build: BuildRoll;
  rewards: RewardSet;
  /** AI 产出, 通过 zod 校验后才写入 */
  result?: DungeonGenResult;
  panelText?: string;
  enterPrompt?: string;
  /** 已写入存档的痕迹 */
  written?: { at: string; messageId: number | 'latest' };
  /** 敌人生成的产物, 每个副本条目独立; 未生成时为 undefined */
  enemies?: EnemySlot[];
  /** 自选模式: 契约者指定的世界观名; 随机掷骰条目为 undefined */
  customWorld?: string;
  /** 自选模式: 队友来源世界观（IP 角色队友从该世界观取） */
  mateWorld?: string;
  /** 自选模式: 队友具体人物（指定后其他契约者必须恰好是他们） */
  mateNames?: string;
  /** 每轮单独选: 是否额外匹配 1 名同人契约者（CR≥5 时面板可选） */
  同人开关?: boolean;
  /** 那名同人契约者的性别 */
  同人性别?: '男' | '女' | '不限';
  /** 每轮单独选: 是否读取并注入 EJS 动态事件。**默认开** */
  事件开关?: boolean;
  /** 本次渲染出的生效事件名（由 generate 写入, 供界面展示） */
  触发的动态事件?: string[];
}

function loadRolledDungeons(): RolledDungeon[] {
  try {
    const r = localStorage.getItem(DGEN_SK);
    if (r) return JSON.parse(r);
  } catch (_) {}
  return [];
}

function saveRolledDungeons(list: RolledDungeon[]) {
  try {
    localStorage.setItem(DGEN_SK, JSON.stringify(list));
  } catch (_) {}
}

/** 各阶位的等级上限（下标 = `归一位阶` 的返回值 0..3）。五阶不在表内 —— 用户 2026-09-25 拍板 Lv.100 不触发晋升试炼 */
const 晋升阶位上限 = [20, 40, 60, 80] as const;

/** 按 CR 决定队友匹配池（规则 §三 与用户口径: ≥6 升一阶, ≥7 升两阶, =10 天榜） */
export function buildMatchPool(cr: number, 阶位: string): string {
  // 归一交给 `dice.ts` 的 `归一位阶`（一阶/1阶/一/1/第一阶/全角…都认）;
  // **失败策略刻意保持 `?? 0`**: 认不出就当一阶, 只影响队友匹配池的档位, 不写任何数值
  const idx = 归一位阶(阶位) ?? 0;
  if (cr <= 4) {
    return `玩家 CR=${cr}（≤4）：请自由生成同阶契约者作为队友，**不要**从排行榜抓人。等级与玩家同阶相近。`;
  }
  const 偏移 = cr >= 10 ? 4 - idx : cr >= 7 ? 2 : cr >= 6 ? 1 : 0;
  const board = RANK_BOARDS[Math.min(4, idx + 偏移)];
  const lines = board.items.map(i => `- [${i.name}]${i.realName} Lv.${i.lv}（${i.team} · ${i.className}）`);
  return `玩家 CR=${cr}，阶位=${阶位}：从【${board.title}】中挑选队友。榜单候选（称号/真名/职业/势力均已公开）：
${lines.join('\n')}
要求：被选中的契约者必须使用其真名（真名公开，禁止代号），并给出阵营。`;
}

export const useDungeonGenStore = defineStore('dungeonGen', () => {
  const rolledDungeons = ref<RolledDungeon[]>(loadRolledDungeons());
  const rolling = ref(false);
  const generating = ref(false);
  const writing = ref(false);
  const generatingEnemies = ref(false);
  const writingEnemies = ref(false);
  const lastError = ref('');

  watchEffect(() => saveRolledDungeons(rolledDungeons.value));

  /** 用户在历史里选中的条目 id; 为 null 时展示最新一条 */
  const selectedId = ref<number | null>(null);
  /** 卡片当前展示的条目: 选中的那条, 否则最新一条 */
  const current = computed(
    () => rolledDungeons.value.find(d => d.id === selectedId.value) ?? rolledDungeons.value[0] ?? null,
  );
  function select(id: number) {
    selectedId.value = id;
  }

  function getForumStore() {
    return useForumStore();
  }

  function nowStamp(): string {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0') +
      ' ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0')
    );
  }

  /** 读 stat_data 里的副本周期与玩家简报 */
  function readPlayerBrief(): { 副本周期: number; player: PlayerBrief; text: string; 队伍最高等级: number } {
    const 兜底 = {
      副本周期: 1,
      player: { 姓名: '', 等级: 1, 阶位: '一阶', CR: 3, 晋升试炼: false },
      text: '',
      队伍最高等级: 1,
    };
    try {
      let vars: any = {};
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
      } catch (_) {}
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
        } catch (_) {}
      }
      if (!vars?.stat_data?.契约者) {
        try {
          vars = getVariables?.({ type: 'chat' }) ?? {};
        } catch (_) {}
      }
      const c = vars?.stat_data?.契约者;
      if (!c) return 兜底;
      const h = c.头部 ?? {};
      // 晋升试炼判定: 等级满了当前位阶上限。用 `>=` 而非 `==` —— 多给的经验不至于漏判。
      // 阶位认不出或为五阶（idx === 4）时一律不触发。
      const 阶位序 = 归一位阶(h.阶位);
      const 晋升试炼 = 阶位序 !== undefined && 阶位序 <= 3 && (Number(h.等级) || 1) >= 晋升阶位上限[阶位序];
      const player: PlayerBrief = {
        姓名: h.姓名 || '未知契约者',
        等级: Number(h.等级) || 1,
        阶位: h.阶位 || '一阶',
        CR: Number(h.CR) || 3,
        晋升试炼,
      };
      const 副本周期 = Number(c.赛季信息?.当前副本周期) || 1;
      // 队伍最高等级: 玩家自身与小队成员的最高等级 (成员为空时 Math.max 仍安全)
      const 成员 = Object.values((c.小队?.成员 ?? {}) as Record<string, any>);
      const 队伍最高等级 = Math.max(player.等级, ...成员.map(m => Number(m?.头部?.等级) || 0), 0);
      const lines = [
        '【头部】' + JSON.stringify(h),
        '【职业】' + JSON.stringify(c.职业 ?? {}),
        '【属性】' + JSON.stringify(c.属性 ?? {}),
        '【小队】' + JSON.stringify(c.小队 ?? {}),
        '【副本经历】' + JSON.stringify(c.副本经历 ?? {}),
      ];
      return { 副本周期, player, text: lines.join('\n'), 队伍最高等级 };
    } catch (_) {
      return 兜底;
    }
  }

  /**
   * 掷骰: 只掷, 不调 AI。
   *
   * 两个开关（同人 / 事件）由界面在**掷骰这一刻**传进来、记在条目上 —— 它们是「这一轮副本」的
   * 属性, 之后的 `generate()` 只读条目、不再看界面控件。否则玩家掷完再改勾选, 生成出来的
   * 会与他掷骰时看到的不一致。
   */
  function doRoll(
    同人: { 开关: boolean; 性别: '男' | '女' | '不限' } = { 开关: false, 性别: '不限' },
    事件 = true,
  ) {
    rolling.value = true;
    lastError.value = '';
    // 掷骰是「新一次副本」的入口: 清掉历史选中, 否则卡片仍停留在旧条目、看不到刚掷出的骰值
    selectedId.value = null;
    try {
      const { 副本周期, player } = readPlayerBrief();
      const { build, records: buildRecords } = rollBuild(副本周期, player.阶位);
      const { rewards, records: rewardRecords } = rollRewards();
      const maxId = rolledDungeons.value.reduce((m, d) => Math.max(m, d.id), 0);
      const entry: RolledDungeon = {
        id: maxId + 1,
        createdAt: nowStamp(),
        buildRecords,
        rewardRecords,
        build,
        rewards,
        同人开关: 同人.开关,
        同人性别: 同人.性别,
        事件开关: 事件, // 默认开（用户 2026-09-25 拍板）
      };
      rolledDungeons.value.unshift(entry);
    } catch (e: any) {
      lastError.value = e.message || '掷骰失败';
    } finally {
      rolling.value = false;
    }
  }

  /** 自选掷骰: 照掷全部骰子, 再用契约者自选覆盖指定项, 并锚定世界观与队友 */
  function doCustomRoll(
    overrides: BuildOverrides,
    worldview: string,
    mateWorld: string,
    mateNames: string,
    同人: { 开关: boolean; 性别: '男' | '女' | '不限' },
    事件: boolean,
  ) {
    rolling.value = true;
    lastError.value = '';
    selectedId.value = null;
    try {
      const { 副本周期, player } = readPlayerBrief();
      const rolled = rollBuild(副本周期, player.阶位);
      const { build, records: buildRecords } = applyBuildOverrides(rolled.build, rolled.records, overrides);
      const { rewards, records: rewardRecords } = rollRewards();
      const maxId = rolledDungeons.value.reduce((m, d) => Math.max(m, d.id), 0);
      const entry: RolledDungeon = {
        id: maxId + 1,
        createdAt: nowStamp(),
        buildRecords,
        rewardRecords,
        build,
        rewards,
        customWorld: worldview.trim() || undefined,
        mateWorld: mateWorld.trim() || undefined,
        mateNames: mateNames.trim() || undefined,
        同人开关: 同人.开关,
        同人性别: 同人.性别,
        事件开关: 事件,
      };
      rolledDungeons.value.unshift(entry);
    } catch (e: any) {
      lastError.value = e.message || '自选掷骰失败';
    } finally {
      rolling.value = false;
    }
  }

  /** 生成: 用当前展示条目的掷骰结果调 AI 产出副本内容 */
  async function generate() {
    if (generating.value) return;
    const entry = current.value;
    if (!entry) {
      lastError.value = '请先掷骰';
      return;
    }

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generating.value = true;
    lastError.value = '';
    try {
      const { player, text: playerText, 队伍最高等级 } = readPlayerBrief();
      const wb = await forumStore.getWorldbookContent();
      // 动态事件: **先判开关** —— 关掉时连控制器都不渲染（spec §三 最后一条）。
      // 任何失败都只降级不阻断: `buildEventSection` 内部已吞掉所有异常并给出跳过原因。
      let 动态事件段 = '';
      let 触发的动态事件: string[] = [];
      if (entry.事件开关 ?? true) {
        if (typeof EjsTemplate === 'undefined') {
          // 插件没装 —— 与「渲染失败」同一条降级路径: **只提示, 不阻断**（Review Focus 第 1 条）。
          // 不能指望 buildEventSection 兜住这个: 它在 store 侧才被解引用, 直接写会在闭包里抛 ReferenceError。
          lastError.value = '本次未注入动态事件：未安装「提示词模板语法」插件';
        } else {
          const 条目表 = await forumStore.getCardWorldbookEntries();
          const 事件 = await buildEventSection({
            条目表,
            evalTemplate: (code, ctx) => EjsTemplate.evalTemplate(code, ctx),
            prepareContext: () => EjsTemplate.prepareContext(),
          });
          动态事件段 = 事件.段落;
          触发的动态事件 = 事件.触发;
          if (事件.跳过原因) lastError.value = '本次未注入动态事件：' + 事件.跳过原因;
          else if (事件.缺失.length) lastError.value = '控制器引用了找不到的条目：' + 事件.缺失.join('、');
        }
      }
      const 匹配池 = buildMatchPool(player.CR, player.阶位);
      // 生机评估: 按 CR 档取出的凶险判定, 只给 AI 定调（数值那一半在敌人生成时由基准等级偏移落地）
      const prompt = buildDungeonPrompt(
        entry.build,
        [...entry.buildRecords, ...entry.rewardRecords],
        playerText,
        wb,
        匹配池,
        player.阶位,
        队伍最高等级,
        生机评估(player.CR),
        entry.customWorld,
        { 来源世界观: entry.mateWorld, 人物: entry.mateNames },
        {
          同人契约者: { 开关: entry.同人开关 ?? false, 性别: entry.同人性别 ?? '不限' },
          动态事件段,
          晋升试炼: player.晋升试炼,
        },
      );
      const raw = await aiGenerate(cfg, prompt, {
        name: 'dungeon_generation',
        value: JSON.parse(JSON.stringify(z.toJSONSchema(DungeonGenResultSchema, { io: 'input' }))),
      });
      const parsed = DungeonGenResultSchema.parse(extractJSON(raw));
      // 软校验: 事件点名的人必须在名单里。**只报警、不阻断**（照本项目「宁可难看也不圆上」的口径）。
      // **先排除契约者本人** —— 他既不在「其他契约者」也不在「固有角色」里, 而事件正文常用
      // 「{{user}}」指代他, AI 偶尔会把他列进「事件点名角色」。那是**误报**:
      // prompt 已明令不要列（Task 5 ⑥b）, 这里再兜一道 —— 误报比不报更糟, 它会让玩家学会无视警告。
      const 缺席 = 点名缺席者(parsed).filter(名 => 名 !== player.姓名);
      if (缺席.length) lastError.value = '事件点名的人物未出现在名单里：' + 缺席.join('、');
      const idx = rolledDungeons.value.findIndex(d => d.id === entry.id);
      if (idx < 0) return;
      rolledDungeons.value[idx] = {
        ...rolledDungeons.value[idx],
        result: parsed,
        panelText: assemblePanelText(parsed, entry.build, entry.rewards, player),
        enterPrompt: buildEnterPrompt(parsed, entry.build),
        触发的动态事件,
      };
    } catch (e: any) {
      lastError.value = e.message || '生成失败';
    } finally {
      generating.value = false;
    }
  }

  /** 敌人生成: 按基准等级生成 1 杂兵 + 1 精英 + 1 BOSS, 先只落库不碰变量 */
  async function generateEnemies() {
    if (generatingEnemies.value) return;
    const entry = current.value;
    if (!entry) {
      lastError.value = '请先掷骰';
      return;
    }
    if (!entry.result) {
      lastError.value = '请先生成副本';
      return;
    }

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generatingEnemies.value = true;
    lastError.value = '';
    try {
      const { player, text: playerText } = readPlayerBrief();
      const wb = await forumStore.getWorldbookContent();
      // 基准等级 = 玩家等级 + CR 档偏移。**经 crTable.基准等级 算** ——
      // 与 `mapToVariables` 写进 `当前副本元数据.基准等级` 的是同一个函数、同一组输入,
      // 所以「存档里写的基准等级」与「敌人实际按哪个基准等级生成」不可能漂移。
      const prompt = buildEnemyPrompt(entry.build, playerText, wb, 基准等级(player.等级, player.CR), entry.customWorld);
      const raw = await aiGenerate(cfg, prompt, {
        name: 'enemy_generation',
        value: JSON.parse(JSON.stringify(z.toJSONSchema(EnemyGenResultSchema, { io: 'input' }))),
      });
      const parsed = EnemyGenResultSchema.parse(extractJSON(raw));
      const idx = rolledDungeons.value.findIndex(d => d.id === entry.id);
      if (idx < 0) return;
      rolledDungeons.value[idx] = {
        ...rolledDungeons.value[idx],
        enemies: parsed.敌人.map(e => ({ 数据: e, 面板: '', 已写入: false })),
      };
    } catch (e: any) {
      lastError.value = e.message || '敌人生成失败';
    } finally {
      generatingEnemies.value = false;
    }
  }

  /** 重roll: 丢弃当前展示条目的 AI 产物, 重新掷骰 */
  function reroll() {
    const entry = current.value;
    if (entry) rolledDungeons.value = rolledDungeons.value.filter(d => d.id !== entry.id);
    doRoll();
  }

  /** 把生成结果写进 MVU 变量。逐条 _.set, 不清空不覆盖无关字段 */
  async function writeToSave(id: number): Promise<boolean> {
    const entry = rolledDungeons.value.find(d => d.id === id);
    if (!entry?.result) {
      lastError.value = '该条目还没有生成结果';
      return false;
    }
    writing.value = true;
    lastError.value = '';
    try {
      await waitGlobalInitialized('Mvu');
      // 与竞技场写「当前敌人」保持一致的楼层探测: 全局脚本 iframe 无楼层上下文时回退最新楼层
      let message_id: number | 'latest' = -1;
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) message_id = mid;
      } catch (_) {}
      const { player } = readPlayerBrief();
      const vars = mapToVariables(entry.result, entry.build, entry.rewards, player);
      const mvu = Mvu.getMvuData({ type: 'message', message_id });
      for (const [key, value] of Object.entries(vars)) {
        // 数组路径: 每个元素都是字面量 key, 名字含「.」也不会被 lodash 当作层级分隔
        _.set(mvu, ['stat_data', '契约者', key], value);
      }
      // 系统日志（#5）：与本次副本写入同一事务落档，AI 由此知道玩家生成了哪个副本
      const 副本名 = String((vars['当前副本元数据'] as any)?.副本名称 ?? '未知副本');
      pushSyslog(mvu, `你生成了新副本「${副本名}」`);
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id });
      // 回读校验: MVU 按注册的 zod schema 处理写入, 未声明的键会被静默剥掉 —— 这里主动暴露, 避免"看起来写成功"
      const after = Mvu.getMvuData({ type: 'message', message_id });
      for (const key of Object.keys(vars)) {
        // 数组路径: 键名可能含「.」, 不能走字符串路径
        if (_.get(after, ['stat_data', '契约者', key]) === undefined) {
          throw new Error('写入未生效: 字段名与存档 schema 不匹配 → ' + key);
        }
      }
      const idx = rolledDungeons.value.findIndex(d => d.id === id);
      if (idx >= 0) {
        rolledDungeons.value[idx] = {
          ...rolledDungeons.value[idx],
          written: { at: nowStamp(), messageId: message_id },
        };
      }
      toastr.success('副本已写入存档');
      return true;
    } catch (e: any) {
      lastError.value = e?.message || '写入存档失败';
      toastr.error('写入存档失败: ' + lastError.value);
      return false;
    } finally {
      writing.value = false;
    }
  }

  /**
   * 把勾选的副本角色写进 `契约者.副本角色`。
   *
   * 顺序严格按用户规则: 先 insert 变量 → 读回前端代算好的值 → 用那些值拼 <enemy> 面板。
   * 因此生成后、写入前**不提供面板** —— 宁可不给, 也不给一个注定偏低的数。
   */
  async function writeEnemies(选中: number[]): Promise<boolean> {
    const entry = current.value;
    if (!entry?.enemies?.length) {
      lastError.value = '请先生成副本角色';
      return false;
    }
    const 目标 = 选中.map(i => ({ i, slot: entry.enemies![i] })).filter(x => x.slot);
    if (目标.length === 0) {
      lastError.value = '请至少勾选一个副本角色';
      return false;
    }
    const 源数组 = entry.enemies;
    writingEnemies.value = true;
    lastError.value = '';
    try {
      await waitGlobalInitialized('Mvu');
      // 与竞技场写「当前敌人」/ writeToSave 一致的楼层探测: 全局脚本 iframe 无楼层上下文时回退最新楼层
      let message_id: number | 'latest' = -1;
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) message_id = mid;
      } catch (_) {}
      const mvu = Mvu.getMvuData({ type: 'message', message_id });
      // 同批重名: 写入路径是 副本角色.<名称>, 同名会互相覆盖, 而回读校验发现不了(同一路径有值)。
      const 名称表 = 目标.map(x => x.slot.数据.名称);
      const 重名 = [...new Set(名称表.filter((n, i) => 名称表.indexOf(n) !== i))];
      if (重名.length > 0) {
        lastError.value = '副本角色重名, 无法写入: ' + 重名.join('、');
        toastr.error(lastError.value + '（请重新点「敌人生成」）');
        return false;
      }
      // 已存在的同名角色: _.set 是整节点替换, 覆盖会把当前 HP/MP/耐力 重置为满值并清掉战斗中的临时状态。
      // 规则要求战斗中通过 delta 改 *_当前, 不能让这条路径静默抹掉它 —— 先问。
      const 已存在 = 目标.filter(
        ({ slot }) => _.get(mvu, ['stat_data', '契约者', '副本角色', slot.数据.名称]) !== undefined,
      );
      const 跳过 = new Set<number>();
      if (已存在.length > 0) {
        const 确认覆盖 = confirm(
          '以下副本角色已存在:\n' +
            '· ' +
            已存在.map(x => x.slot.数据.名称).join('\n· ') +
            '\n\n覆盖会把它们的当前 HP / MP / 耐力重置为满值, 并清掉战斗中的临时状态。\n\n' +
            '点「确定」= 覆盖这些角色\n点「取消」= 跳过它们, 只写其余',
        );
        if (!确认覆盖) for (const x of 已存在) 跳过.add(x.i);
      }
      const 实写 = 目标.filter(x => !跳过.has(x.i));
      if (实写.length === 0) {
        toastr.info('已取消, 未写入任何副本角色');
        return false;
      }
      for (const { slot } of 实写) {
        // 数组路径: 角色名可能含「.」, 不能走字符串路径
        _.set(mvu, ['stat_data', '契约者', '副本角色', slot.数据.名称], mapEnemyToVariables(slot.数据));
      }
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id });
      // 回读校验: MVU 按注册的 zod schema 处理写入, 未声明的键会被静默剥掉 —— 这里主动暴露, 避免"看起来写成功"
      for (const { slot } of 实写) {
        if (
          _.get(Mvu.getMvuData({ type: 'message', message_id }), [
            'stat_data',
            '契约者',
            '副本角色',
            slot.数据.名称,
          ]) === undefined
        ) {
          throw new Error('写入未生效: 字段名与存档 schema 不匹配 → 副本角色.' + slot.数据.名称);
        }
      }
      // 用户卡的前端脚本异步跑代算, 写入刚返回时 属性.实际 / 衍生属性 很可能还没算好。
      // 每轮都必须重新取: 前端脚本是异步写回代算值的, 复用上一轮快照等于永远读到旧值
      // 最多约 2 秒, 超时不算失败 —— 走回退路径并如实告知用户。
      let 已代算 = false;
      let 快照: any;
      for (let n = 0; n < 10; n++) {
        快照 = Mvu.getMvuData({ type: 'message', message_id });
        已代算 = 实写.every(({ slot }) => 前端已代算(_.get(快照, ['stat_data', '契约者', '副本角色', slot.数据.名称])));
        if (已代算) break;
        await new Promise(r => setTimeout(r, 200));
      }
      // 回填前校验: 写入期间用户可能重掷(条目被删)或重新生成(enemies 换成新数组)。
      // 两种情况下变量都已经真写进存档, 但界面已经不代表它们了 —— 不能盖"已写入"骗人。
      const idx = rolledDungeons.value.findIndex(d => d.id === entry.id);
      const 可回填 = idx >= 0 && rolledDungeons.value[idx].enemies === 源数组;
      if (可回填) {
        const 槽 = [...rolledDungeons.value[idx].enemies!];
        for (const { i, slot } of 实写) {
          const 实体 = _.get(快照, ['stat_data', '契约者', '副本角色', slot.数据.名称]) ?? {};
          槽[i] = { ...slot, 面板: assembleEnemyPanelFromEntity(slot.数据.名称, 实体, slot.数据.威胁), 已写入: true };
        }
        rolledDungeons.value[idx] = { ...rolledDungeons.value[idx], enemies: 槽 };
      }
      // 两个分支都刻意保留: 未代算时面板会退化, 用户必须知道; 成功分支也要点明来源,
      // 因为「已代算」判据对 prefault 非 0 的 schema 可能在脚本跑之前就为真。
      if (!可回填) toastr.info('变量已写入存档, 但该条目已被重掷或重新生成, 面板未回填');
      else if (已代算) toastr.success('已写入 ' + 实写.length + ' 个副本角色（面板数值取自前端代算结果）');
      else toastr.info('已写入 ' + 实写.length + ' 个副本角色；前端脚本尚未代算, 面板为模块自算值');
      if (跳过.size > 0) toastr.info('已跳过 ' + 跳过.size + ' 个已存在的副本角色');
      return true;
    } catch (e: any) {
      lastError.value = e?.message || '写入副本角色失败';
      toastr.error('写入副本角色失败: ' + lastError.value);
      return false;
    } finally {
      writingEnemies.value = false;
    }
  }

  /** 把「进入副本」提示词填入酒馆输入框, 只填入不发送 */
  async function fillInput(id: number): Promise<boolean> {
    const entry = rolledDungeons.value.find(d => d.id === id);
    if (!entry?.enterPrompt) {
      lastError.value = '该条目还没有进本提示词';
      return false;
    }
    if (!entry.written) {
      lastError.value = '请先写入存档，再填入输入框';
      toastr.info('请先点「写入存档」');
      return false;
    }
    lastError.value = '';
    const text = entry.enterPrompt;
    // 优先直接操作输入框并派发 input 事件（行为可预测）；失败再退回 STScript /setinput
    try {
      const $ta = $('#send_textarea');
      if ($ta.length === 0) throw new Error('未找到输入框 #send_textarea');
      $ta.val(text).trigger('input');
      toastr.success('已填入输入框');
      return true;
    } catch (e: any) {
      try {
        // /setinput 取整行剩余内容, 换行会截断命令, 故压成单行
        await triggerSlash('/setinput ' + text.replace(/\r?\n/g, ' '));
        toastr.success('已填入输入框');
        return true;
      } catch (_) {
        lastError.value = e?.message || '填入输入框失败';
        toastr.error('填入输入框失败: ' + lastError.value);
        return false;
      }
    }
  }

  function remove(id: number) {
    rolledDungeons.value = rolledDungeons.value.filter(d => d.id !== id);
    if (selectedId.value === id) selectedId.value = null;
  }

  return {
    rolledDungeons,
    rolling,
    generating,
    writing,
    lastError,
    current,
    select,
    generatingEnemies,
    writingEnemies,
    generateEnemies,
    writeEnemies,
    doRoll,
    doCustomRoll,
    generate,
    reroll,
    writeToSave,
    fillInput,
    remove,
    /** 供测试与调试用 —— 面板不直接调它, 但它是判定的唯一入口, 必须能被单测钉住 */
    readPlayerBrief,
  };
});

// ================================================================
// 副本结算 Store
//
// 分工: 算术 / 面板 / 写入清单全在 settlementRules.ts（纯函数, 由单测覆盖）;
// 本文件只负责「读 MVU 变量 → 组装输入 → 调 AI → 把产物摆给视图」与「按清单写回 MVU」。
// ================================================================

/** 变量里的字段一律可能是 undefined / 非字符串 —— 取文本时统一成 `''`, 让下游的占位逻辑生效 */
function 取文本(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

/** 同上, 但转成有限数字; 非数字（含 undefined / 空串 / 'abc'）一律 0 */
function 取数字(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 楼层探测读取 `stat_data.契约者` 的**原文**（与 `readPlayerBrief` 同款回退链）。
 *
 * `readSettlementSnapshot` 要把它压成只读快照, 但 prompt 的「变量快照」段要的是原文
 * （AI 需要看到 `当前副本任务` 里逐字的任务名与奖励文本）。两处共用这一个读取口。
 */
function read契约者(): any {
  try {
    let vars: any = {};
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
    } catch (_) {}
    if (!vars?.stat_data?.契约者) {
      try {
        vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
      } catch (_) {}
    }
    if (!vars?.stat_data?.契约者) {
      try {
        vars = getVariables?.({ type: 'chat' }) ?? {};
      } catch (_) {}
    }
    return vars?.stat_data?.契约者 ?? undefined;
  } catch (_) {
    return undefined;
  }
}

/**
 * 把一个任务容器（`支线任务` / `隐藏任务` / `副本成就`）摊平进 `任务奖励`：键名用容器里的原文, 值取条目的 `奖励`。
 *
 * **只收字符串 `奖励`**：`奖励` 缺失或不是字符串时**不放进表** —— 于是 `汇总基础奖励` 会把它记进
 * `未找到`, 由 UI 如实展示。若退而塞 `''`, 会被 `parseRewardText` 当成「这条任务没有奖励」静默算 0
 * （玩家少拿奖励而无人察觉）; 塞 `String(undefined)` 则会印出 'undefined'。
 */
function 摊平奖励(容器: unknown, 出: Record<string, string>) {
  if (!容器 || typeof 容器 !== 'object') return;
  for (const [名, 条目] of Object.entries(容器 as Record<string, any>)) {
    const 原文 = (条目 as any)?.奖励;
    if (typeof 原文 === 'string') 出[名] = 原文;
  }
}

/**
 * 从 `stat_data` 里摘出结算需要的**只读快照**（纯读取, 不改任何变量）。
 *
 * 字段名必须与 `settlementRules.ts` 的 `SettlementSnapshot` **逐字一致** —— 对不上不会报错,
 * 只会让下游读到 `undefined`。
 */
function readSettlementSnapshot(): SettlementSnapshot | null {
  const c = read契约者();
  if (!c) return null;

  // ── 任务名 → 奖励原文 ─────────────────────────────────────────────
  // 主线**固定用 `'主线'` 作键**（主线没有名字可当键）; 支线/隐藏/成就用容器里的键名原文。
  // **世界事件不摊平** —— 它的 `奖励` 字段存的是「影响」文本, 不是数值, 计进来会把影响描述当奖励解析。
  const 任务奖励: Record<string, string> = {};
  const 主线任务 = c.当前副本任务?.主线任务;
  if (typeof 主线任务?.奖励 === 'string') 任务奖励['主线'] = 主线任务.奖励;
  for (const 容器名 of ['支线任务', '隐藏任务', '副本成就']) {
    摊平奖励(c.当前副本任务?.[容器名], 任务奖励);
  }

  // ── 背包：物品名 → **已有**数量 ───────────────────────────────────
  // 掉落写入要在它上面**累加**。缺席会被 buildSettlementWrites 抛错挡住（那是最后一道防线）,
  // 这里必须真的供上, 否则玩家原有的同名物品会被结算冲掉。
  const 已有背包: Record<string, number> = {};
  for (const [名, 条目] of Object.entries((c.背包 ?? {}) as Record<string, any>)) {
    if (条目 && typeof 条目 === 'object') 已有背包[名] = 取数字((条目 as any).数量);
  }

  // ── 成就 / 隐藏任务的**全量**清单（含未达成 / 未触发）─────────────────
  // 规则第九步要公示「本次错过的」, 所以不能只留已达成的那几条; 已完否由面板拿 AI 的名单比对。
  const 成就清单 = Object.entries((c.当前副本任务?.副本成就 ?? {}) as Record<string, any>).map(
    ([名称, a]: [string, any]) => ({
      名称,
      说明: 取文本(a?.说明),
      难度: 取文本(a?.难度),
      奖励: 取文本(a?.奖励),
    }),
  );
  const 隐藏任务清单 = Object.entries((c.当前副本任务?.隐藏任务 ?? {}) as Record<string, any>).map(
    ([名称, t]: [string, any]) => ({
      名称,
      说明: 取文本(t?.说明),
      奖励: 取文本(t?.奖励),
    }),
  );

  // ── 小队成员：结算要给每个队友发与玩家相同的 EXP / UP ──────────────
  const 小队成员 = Object.entries((c.小队?.成员 ?? {}) as Record<string, any>).map(([名称, m]: [string, any]) => ({
    名称,
    当前EXP: 取数字((m as any)?.头部?.EXP_当前),
    // 实体 schema 没有 `经济` 字段, 队友的 UP 落在背包的「现金UP」条目上（与写入清单同一口径）
    当前UP: 取数字((m as any)?.背包?.['现金UP']?.数量),
  }));

  return {
    副本名称: 取文本(c.当前副本元数据?.副本名称),
    当前EXP: 取数字(c.头部?.EXP_当前),
    当前UP: 取数字(c.经济?.UP),
    当前RP: 取数字(c.头部?.RP_当前),
    当前PEXP: 取数字(c.职业?.PEXP_当前),
    军衔: 取文本(c.头部?.军衔),
    职业等级: 取数字(c.职业?.职业等级),
    PEXP_升级所需: 取数字(c.职业?.PEXP_升级所需),
    当前CR: 取数字(c.头部?.CR),
    // `当前时间` 分组里是**两个不同的字段**: `现实日期` 是日期（`2025年5月10日`）, `现实时间` 是时刻
    // （`凌晨00:01`）。第十一步的「加天数」只认日期, 拿时刻去顶会恒返回空串 —— 两个都照原文读出来,
    // 各归各的用途（日期参与算术, 时刻只做面板后缀）。
    当前现实日期: 取文本(c.当前时间?.现实日期),
    当前现实时间: 取文本(c.当前时间?.现实时间),
    // 赛季资格分（写入的是「它 + 本次」）—— `buildSettlementWrites` 入口会挡住它的缺失
    旧资格分: 取数字(c.资格分),
    任务奖励,
    已有背包,
    成就清单,
    隐藏任务清单,
    小队成员,
  };
}

/** 一次结算的完整产物（只在内存里, 不落盘） */
export interface SettlementPreview {
  快照: SettlementSnapshot;
  计算结果: SettlementComputed;
  ai: SettlementGenResult;
  /** `assembleSettlementPanel` 的产物, 逐行照规则模板 */
  面板: string;
  /**
   * 「进入回廊结算空间」的提示词, 由 `buildSettlementEnterPrompt` 产出 ——
   * 供 `fillInput` 填进酒馆输入框（只填入不发送）。
   * 在 `generateSettlement` 里一次算好存下（它只读 computed / ai / 快照, 与面板同源）。
   */
  结算空间提示词: string;
  /**
   * `replaceMvuData` 已返回、但回读校验没过 —— 变量**已经写进存档**了, 只是没能核对上。
   *
   * 本模块是**累加**语义（旧值 + 增量）, 与 `writeToSave`/`writeEnemies` 的覆盖语义不同:
   * 覆盖语义下失败重试基本幂等, 这里重试会让 EXP/UP/RP/PEXP/资格分**翻倍**。视图据此禁用写入入口。
   */
  已写入: boolean;
  /**
   * 写入**成功且回读校验通过**。与 `已写入` 互斥: 后者专指「写了, 但没核对上」这一失败态。
   * 互斥由代码强制（不是约定）: `writeSettlement` 成功路径上 `toastr.success` 抛错即会改走
   * catch 打上 `已写入`, 所以本标记必须在 `toastr.success` **之后**才置位; 且 `writeSettlement`
   * 与 `fillInput` 都先判 `已写入` 早退, 于是两个标记不会同时为真、任一为真都一律不放行。
   *
   * 写入成功后**预览不销毁**（与 `已写入` 一样保留), 理由有二:
   * 1. 保留 `结算空间提示词` 才能让玩家在写入后还点得到「填入输入框」（它正是写在预览里的）;
   * 2. 面板文本仍可复制。
   * 代价是必须把写入入口彻底锁死（视图的 `:disabled` + `writeSettlement` 开头的守卫）——
   * 累加语义下, 同一份预览再写一次会把刚清空的副本资料重新填回去、并让数值翻倍。
   */
  写入完成: boolean;
}

/**
 * 「0 数量的背包条目」是 **no-op**, 该跳过: 卡的 `背包` schema 带
 * `transform: _.pickBy(data, ({数量}) => 数量 > 0)`, MVU 在 parse 时会把数量 ≤ 0 的条目整个丢掉 ——
 * 写了等于没写, 却会让回读校验读到 `undefined` 而误报「写入未生效」, 把一次成功的写入推进
 * 「已提交但未核对」的分支（进而锁死重试, 见 `SettlementPreview.已写入`）。
 *
 * **只对末段是 `数量` 的路径放行, 不用 `值 === 0` 一刀切** —— 后者会顺带掩盖「某个本该非 0 的字段
 * 被算成 0」这种真 bug; 也**不给 `数量` 兜 `|| 1`**, 那会凭空给队友发一个「现金UP」。
 */
function 是零数量(路径: string[], 值: unknown): boolean {
  return 值 === 0 && 路径[路径.length - 1] === '数量';
}

export const useSettlementStore = defineStore('settlement', () => {
  const generating = ref(false);
  const writing = ref(false);
  const lastError = ref('');
  /**
   * 当前预览; 为 null = 尚未结算。
   *
   * 写入成功后**不清空** —— 只标记 `写入完成` 并把写入入口锁死。保留它有两个用处:
   * 「填入输入框」用的 `结算空间提示词` 与可复制的面板文本都在这份预览里。
   * 唯一的清空点是 `reset()`（= 视图的「放弃本次结算」）。
   */
  const settlement = ref<SettlementPreview | null>(null);

  function reset() {
    settlement.value = null;
    lastError.value = '';
  }

  function getForumStore() {
    return useForumStore();
  }

  async function generateSettlement() {
    if (generating.value) return;

    const 快照 = readSettlementSnapshot();
    if (!快照) {
      lastError.value = '读取不到契约者数据';
      return;
    }
    // 副本资料被清空后 副本名称 是 '未生成'（见 buildSettlementWrites 的清除清单）——
    // 它正是「这一轮副本已经结算过了」的标志, 第二次点结算会停在这里
    if (快照.副本名称 === '' || 快照.副本名称 === '未生成') {
      lastError.value = '当前没有进行中的副本';
      return;
    }

    // 原文另读一份: prompt 的「变量快照」段要的是**原文**（AI 需要逐字的任务名与奖励文本）,
    // 而快照是给纯函数用的只读视图 —— 它不含 阶位 / 当前副本周期 这些组装 SettlementInputs 才要的字段
    const c = read契约者() ?? {};

    // 先判主线状态: 失败 = 抹杀, **不调 AI、不写任何变量**。
    // computeSettlement 对 'F' 也会抛错, 但那是花掉一次 AI 调用之后的事 —— 这里用变量里的状态先挡住
    if (c.当前副本任务?.主线任务?.状态 === '失败') {
      lastError.value = '主线失败 = 抹杀，不进入结算流程';
      return;
    }

    const forumStore = getForumStore();
    const cfg = getActiveCfg(forumStore.settings);
    if (!cfg.url || !cfg.apiKey) {
      lastError.value = '请先在终端设置中配置 API';
      return;
    }

    generating.value = true;
    lastError.value = '';
    try {
      // 变量快照: 给 AI 看「逐字的任务名与奖励」, 由它判定哪些完成了。
      // 只摘结算用得到的段落 —— 不作全量 JSON.stringify（契约者里还有背包/技能等大块内容）。
      const 变量快照 = [
        '【当前副本元数据】' + JSON.stringify(c.当前副本元数据 ?? {}),
        // 第十一步「按副本内所待天数更新现实时间」的天数来源: 当前时间.客观时间 = 本次副本已度过的天数。
        // 不摘这一段, AI 就看不到 当前时间, 【副本天数】只能靠聊天记录猜。
        '【当前时间】' + JSON.stringify(c.当前时间 ?? {}),
        '【当前副本任务】' + JSON.stringify(c.当前副本任务 ?? {}),
        '【其他契约者名单】' + JSON.stringify(c.其他契约者名单 ?? {}),
        '【固有角色名单】' + JSON.stringify(c.固有角色名单 ?? {}),
        '【副本角色】' + (Object.keys(c.副本角色 ?? {}).join('、') || '（无）'),
        '【头部】' + JSON.stringify(c.头部 ?? {}),
        '【职业】' + JSON.stringify(c.职业 ?? {}),
        '【经济】' + JSON.stringify(c.经济 ?? {}),
      ].join('\n');

      const wb = await forumStore.getWorldbookContent();
      const prompt = buildSettlementPrompt(变量快照, forumStore.readRecentChat(30), wb);
      const raw = await aiGenerate(cfg, prompt, {
        name: 'dungeon_settlement',
        value: JSON.parse(JSON.stringify(z.toJSONSchema(SettlementGenResultSchema, { io: 'input' }))),
      });
      const parsed = SettlementGenResultSchema.parse(extractJSON(raw));

      // 第二道 F 守卫: AI 也可以直接把评价定成 F（规则原文「若主线失败, 填 F」）。
      // 走到这里说明变量里的状态没写「失败」, 但 AI 从聊天记录里判出了失败 —— 同样不产出画面、不写任何变量。
      if (parsed.评价等级 === 'F') {
        lastError.value = '主线失败 = 抹杀，不进入结算流程';
        return;
      }

      // 基础奖励汇总（纯函数）。变量里**存在**的奖励文本解析失败会在这里抛错 → 由 catch 接住并报出任务名,
      // 绝不静默当 0。`未找到` 是 AI 报告了、但变量里没有的键名: 不阻断结算, 但必须让玩家看见。
      const 基础 = 汇总基础奖励(快照, parsed);
      if (基础.未找到.length > 0) {
        lastError.value = '变量中未找到这些任务：' + 基础.未找到.join('、') + '（这些任务的奖励按 0 计, 请核对键名）';
      }

      const 计算结果 = computeSettlement(
        {
          评价等级: parsed.评价等级,
          击杀: parsed.击杀,
          副本天数: parsed.副本天数,
          基础EXP汇总: 基础.EXP,
          基础UP汇总: 基础.UP,
          // 资格分的「支线+5/条」用 **AI 报告的数组长度**（见 SettlementInputs 的注释）
          完成的支线数: parsed.完成的支线.length,
          // 隐藏项与成就项**只计变量里真的存在的条目**（与 `汇总基础奖励` 同口径）——
          // 否则 AI 多报的名字会让资格分 +20 / +10, 而同一份名单它的奖励已被按 0 计、UI 还明说「按 0 计」
          隐藏任务数: 存在条目数(快照.隐藏任务清单, parsed.完成的隐藏任务),
          成就星数: 成就星数(快照, parsed.达成的成就),
          天赋试炼次数: parsed.天赋试炼次数,
          // 只用于第六步 PEXP 的「每条掷 50~100」；**不是**上面那个 完成的支线数, 别混
          职业专属支线条数: parsed.职业专属支线条数,
          CR: 快照.当前CR,
          // 下面两项不在 SettlementSnapshot 里, 从 `契约者` 另读。
          // 阶位与旧周期**都不做兜底**（不写 `?? '一阶'` / `|| 1`）: 缺失/不可识别时让 computeSettlement
          // 抛错并在 UI 上点名, 否则会静默按 ×1 / 周期 1 算（五阶真实是 ×5, 写进存档的最终 EXP/UP 会差 5 倍）。
          阶位: 取文本(c.头部?.阶位),
          旧周期: 取数字(c.赛季信息?.当前副本周期),
          // 旧资格分（写入「它 + 本次」）与现实日期都在快照里 —— 快照字段缺失由 buildSettlementWrites 的入口守卫挡住
          旧资格分: 快照.旧资格分,
          // ⚠️ 是 `当前现实日期`（日期）而不是 `当前现实时间`（时刻 `凌晨00:01`）:
          // 后者喂给「加天数」会恒返回空串, 现实日期于是永不更新、面板还照印「格式无法识别」。
          现实日期: 快照.当前现实日期,
        },
        rollDie,
      );

      settlement.value = {
        快照,
        计算结果,
        ai: parsed,
        面板: assembleSettlementPanel(计算结果, parsed, 快照),
        结算空间提示词: buildSettlementEnterPrompt(计算结果, parsed, 快照),
        已写入: false,
        写入完成: false,
      };
    } catch (e: any) {
      lastError.value = e.message || '结算失败';
      toastr.error('结算失败: ' + lastError.value);
    } finally {
      generating.value = false;
    }
  }

  /** 把预览的写入清单落进 MVU。照 writeToSave / writeEnemies 的模式: 逐条 _.set → replaceMvuData → 回读校验 */
  async function writeSettlement(): Promise<boolean> {
    const 预览 = settlement.value;
    if (!预览) {
      lastError.value = '请先结算';
      return false;
    }
    // 累加语义下, 同一份预览写第二次 = 整份结算应用两次（数值翻倍且不可撤销）。
    // 视图的 `:disabled` 是第一道; 这里是**不看视图也拦得住**的那一道（光改文案挡不住手快的人）。
    // **先判 `已写入`**: 那个标记同样意味着「变量已经落进存档」, 所以它也必须挡住重复写入 ——
    // 否则「已写入 与 写入完成 互斥」就只是注释里的约定, 而不是代码事实。
    if (预览.已写入) {
      lastError.value = '本次结算已提交（回读校验失败），不能重复写入，请先读存档确认';
      return false;
    }
    if (预览.写入完成) {
      lastError.value = '本次结算已经写入存档，不能重复写入';
      return false;
    }

    writing.value = true;
    lastError.value = '';
    // `已提交` = `replaceMvuData` 是否已经返回（= 变量已经落进存档）。**必须带到 catch**,
    // 因为本模块是累加语义: 失败后再点一次会让 EXP/UP/RP/PEXP/资格分整个翻倍, 且不可撤销。
    let 已提交 = false;
    try {
      await waitGlobalInitialized('Mvu');
      // 与竞技场写「当前敌人」/ writeToSave 一致的楼层探测: 全局脚本 iframe 无楼层上下文时回退最新楼层
      let message_id: number | 'latest' = -1;
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
        if (mid && mid !== -1) message_id = mid;
      } catch (_) {}

      // 清单在写入前一次性生成。`buildSettlementWrites` 会先校验 `快照.已有背包` 是否供上 ——
      // 缺席时抛错, 绝不退化成「覆盖写」把玩家原有的同名物品冲掉。
      const writes = buildSettlementWrites(预览.计算结果, 预览.ai, 预览.快照);
      const mvu = Mvu.getMvuData({ type: 'message', message_id });
      for (const w of writes) {
        if (是零数量(w.路径, w.值)) continue;
        // 数组路径: 物品名 / 角色名可能含「.」(如 J.K.罗琳), 不能走字符串路径
        _.set(mvu, ['stat_data', '契约者', ...w.路径], w.值);
      }

      // 这一对赋值之间是唯一的窗口: 之后变量就一定在存档里了（无论回读校验过不过）。
      // 把 已提交 夹在 replaceMvuData 两侧, 是为了让「没写」与「写了但没核对上」在 catch 里可分辨。
      已提交 = false;
      // 系统日志（#5）：与本次结算同一事务落档，AI 由此知道这轮副本的收获（数值与写入同源）
      const c0 = 预览.计算结果;
      pushSyslog(
        mvu,
        `你完成了副本「${预览.快照.副本名称}」的结算：EXP +${c0.最终EXP}、UP +${c0.最终UP}、RP +${c0.RP}、PEXP +${c0.PEXP}`,
      );
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id });
      已提交 = true;

      // 回读校验: MVU 按注册的 zod schema 处理写入, 未声明的键会被静默剥掉 —— 这里主动暴露, 避免"看起来写成功"
      const after = Mvu.getMvuData({ type: 'message', message_id });
      for (const w of writes) {
        // 0 数量是 no-op（卡 schema 自己就会把该条目丢掉）, 不写也不校验 —— 否则这里会误报「写入未生效」
        if (是零数量(w.路径, w.值)) continue;
        if (_.get(after, ['stat_data', '契约者', ...w.路径]) === undefined) {
          throw new Error('写入未生效: 字段名与存档 schema 不匹配 → ' + w.路径.join('.'));
        }
      }

      // 结算是一次性的: 副本资料已被清空, 同一份面板再写一次只会把刚清空的资料重新填回去。
      // 所以**保留预览但标记 写入完成**, 并把写入入口锁死（本函数开头的守卫 + 视图的 :disabled）——
      // 保留预览是为了让玩家还能拿到「填入输入框」的提示词, 那是写入之后才该做的事。
      toastr.success('副本结算已写入');
      // ⚠️ 顺序要紧: `写入完成` 必须落在 `toastr.success` **之后**。
      // 两者在同一个 try 里 —— 若 toastr 抛错（全局缺失/异常）, 控制权会走 catch, 而那时
      // `已提交` 已是 true, catch 会给预览打上 `已写入`（回读失败）标记。若这里先打了 `写入完成`,
      // 一次回读**通过**的写入就会同时带上两个标记: 提示谎报「回读校验失败」、放弃被禁（预览清不掉）、
      // 而填入口却仍可点（`!写入完成` 为 false）—— 「已写入态关闭填入口」的设计随之失效。
      // 放在 toastr 之后, 该场景只会退化成一次保守的回读失败态（两个标记互斥, 一律不放行）。
      预览.写入完成 = true;
      return true;
    } catch (e: any) {
      const 原因 = e?.message || String(e);
      if (已提交) {
        // 变量**已经写进去了**, 只是回读没核对上。既不能谎报成功, 也绝不能让玩家直接重试 ——
        // 累加语义下重试 = 整份结算应用第二次。标记预览并锁住写入入口（光改文案挡不住手快的人）。
        预览.已写入 = true;
        lastError.value = '变量已写入存档，但回读校验失败（' + 原因 + '）。请先读存档确认，不要直接重试';
        toastr.error('变量已写入存档，但回读校验失败，请先读存档确认: ' + 原因);
      } else {
        // 写入根本没发生（含 buildSettlementWrites 的校验抛错、Mvu 初始化失败）—— 可以安全重试
        lastError.value = 原因 || '写入结算失败';
        toastr.error('写入结算失败: ' + lastError.value);
      }
      return false;
    } finally {
      writing.value = false;
    }
  }

  /**
   * 把「进入回廊结算空间」的提示词填入酒馆输入框, **只填入、不发送**。
   *
   * 照 `useDungeonGenStore.fillInput` 同款: 先直接操作输入框并派发 input 事件（行为可预测）,
   * 失败再退回 STScript `/setinput`（换行会截断命令, 故压成单行）。
   *
   * 守卫与副本生成的那一支同款, 但更严一档: 只有**写入成功且回读校验通过**（`写入完成`）才放行。
   * 理由: 本模块是累加语义, 回读失败（`已写入`）意味着画面上的数与存档里的数**可能不同源** ——
   * 那种状态下把「结算已完成、数字是这些」讲给 AI 听, 正是本模块最忌讳的「两份不同源的数」。
   */
  async function fillInput(): Promise<boolean> {
    const 预览 = settlement.value;
    if (!预览) {
      lastError.value = '请先结算';
      return false;
    }
    // 先判 `已写入`（回读失败）: 它同样意味着变量已经落进存档, 但画面上的数与存档里的数
    // **可能不同源** —— 把「结算已完成、数字是这些」讲给 AI 听正是本模块最忌讳的事, 不放行。
    if (预览.已写入) {
      lastError.value = '本次结算已提交但回读校验失败，请先读存档确认，再填入输入框';
      toastr.info('请先读存档确认（明细见上方红框），不要直接重试结算');
      return false;
    }
    if (!预览.写入完成) {
      lastError.value = '请先写入存档，再填入输入框';
      toastr.info('请先点「确认结算」');
      return false;
    }
    const text = 预览.结算空间提示词;
    if (!text) {
      lastError.value = '该预览没有结算空间提示词';
      return false;
    }
    lastError.value = '';
    try {
      const $ta = $('#send_textarea');
      if ($ta.length === 0) throw new Error('未找到输入框 #send_textarea');
      $ta.val(text).trigger('input');
      toastr.success('已填入输入框');
      return true;
    } catch (e: any) {
      try {
        await triggerSlash('/setinput ' + text.replace(/\r?\n/g, ' '));
        toastr.success('已填入输入框');
        return true;
      } catch (_) {
        lastError.value = e?.message || '填入输入框失败';
        toastr.error('填入输入框失败: ' + lastError.value);
        return false;
      }
    }
  }

  return { settlement, generating, writing, lastError, generateSettlement, writeSettlement, fillInput, reset };
});
