// cloudflare/wxhl-cygf/page-lib.js
// 工坊页面的逻辑层：纯 JS ES module，浏览器直接 import，vitest 直接测。
// 桥协议与常量与宿主 src/wxhl-cygf/ 一一对应——改协议两边同步。

export const BRIDGE_CHANNEL = 'wxhl-workshop:worldbook';
export const WORKSHOP_WORLDBOOK = '无限回廊mod';
export const AGREEMENT_KEY = 'wxhl_cygf_agreement';

// ==================== 桥客户端 ====================
export function createBridgeClient({ parentWindow, selfWindow, timeoutMs = 30000 } = {}) {
  let seq = 0;
  const pending = new Map();
  const onMessage = event => {
    // 这里**故意不校验 event.source / event.origin**：
    // 宿主脚本跑在酒馆页面的**兄弟 iframe** 里，它回包时 event.source 是那个脚本 iframe，
    // 永远不会等于本页面的 window.parent（酒馆主窗口）—— 加这个守卫会把所有合法回包拦死
    // （2026-10-11 踩过：页面永远显示「未检测到宿主脚本」）。
    // 配对只靠 channel + kind + 每次请求唯一的 id；两份参考实现也都是这么做的。
    const d = event?.data;
    if (!d || d.channel !== BRIDGE_CHANNEL || d.kind !== 'response') return;
    const entry = pending.get(d.id);
    if (!entry) return;
    pending.delete(d.id);
    clearTimeout(entry.timer);
    if (d.ok) entry.resolve(d.payload);
    else entry.reject(new Error(d.error || '桥接调用失败'));
  };
  selfWindow.addEventListener('message', onMessage);
  return {
    request(action, payload = {}) {
      const id = `r${++seq}-${Math.random().toString(36).slice(2, 8)}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`桥接请求超时（${action}）：宿主脚本未响应——请确认是从酒馆内的「创意工坊」按钮打开本页面`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        parentWindow.postMessage({ channel: BRIDGE_CHANNEL, kind: 'request', id, action, payload }, '*');
      });
    },
    destroy() {
      selfWindow.removeEventListener('message', onMessage);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('桥接已销毁'));
      }
      pending.clear();
    },
  };
}

// ==================== 条目映射（扩展包条目 → 酒馆世界书条目） ====================
const POSITION_MAP = {
  before_char: 'before_character_definition',
  after_char: 'after_character_definition',
  at_depth: 'at_depth',
};

export function mapExtensionEntry(entry) {
  return {
    name: entry.name,
    enabled: entry.enabled !== false,
    strategy: {
      type: entry.constant ? 'constant' : 'selective',
      keys: entry.keys ?? [],
      keys_secondary: { logic: 'and_any', keys: entry.keysSecondary ?? [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: POSITION_MAP[entry.position ?? 'after_char'],
      role: 'system',
      depth: entry.depth ?? 0,
      order: entry.order ?? 100,
    },
    content: entry.content,
    probability: entry.probability ?? 100,
    recursion: {
      prevent_incoming: !!entry.preventRecursion,
      prevent_outgoing: !!entry.excludeRecursion,
      delay_until: null,
    },
    effect: { sticky: entry.sticky ?? null, cooldown: entry.cooldown ?? null, delay: entry.delay ?? null },
    // sourceId 等由宿主按 sourceMeta 盖章；这里留空骨架保持形状
    extra: { wxhlWorkshop: { sourceId: '', sourceType: 'extension', version: '', title: '' } },
  };
}

const TYPE_LABEL = { extension: '扩展', build: '构筑', character: '角色' };

// ==================== 渲染模板（构筑/同人角色 → 条目正文） ====================
function renderSkills(技能表) {
  const lines = Object.entries(技能表 ?? {}).map(([名, s]) => {
    const 效果 = Object.entries(s.效果 ?? {})
      .map(([k, v]) => `${k}：${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('；');
    return `· ${名}（${s.类型 ?? '主动'}${s.消耗 ? `，消耗 ${s.消耗}` : ''}${s.冷却 ? `，冷却 ${s.冷却}` : ''}）${效果 ? `：${效果}` : ''}`;
  });
  return lines.length ? lines.join('\n') : '无';
}

function renderEquipment(装备) {
  return Object.entries(装备 ?? {})
    .map(([槽, e]) => (e && e.名称 && e.名称 !== '无' ? `· ${槽}：${e.名称}（${e.品质 ?? '无'}·${e.阶位 ?? '无'}${e.伤害骰 && e.伤害骰 !== '无' ? `，伤害骰 ${e.伤害骰}` : ''}${e.倍率 ? `，倍率 ${e.倍率}` : ''}${e.主属性加成 ? `，主属性+${e.主属性加成}` : ''}）` : null))
    .filter(Boolean)
    .join('\n') || '无';
}

export function renderBuildEntry(build) {
  const 属性 = build.属性基础 ?? {};
  return [
    `【构筑】${build.构筑名}`,
    `定位：${build.定位}`,
    `属性加点：STR ${属性.STR ?? 5} / AGI ${属性.AGI ?? 5} / CON ${属性.CON ?? 5} / PER ${属性.PER ?? 5}`,
    build.天赋?.名称 && build.天赋.名称 !== '无' ? `天赋：${build.天赋.名称}（${build.天赋.品质 ?? ''}）${renderEffects(build.天赋.效果)}` : null,
    build.血统?.名称 && build.血统.名称 !== '无' ? `血统：${build.血统.名称}（${build.血统.品质 ?? ''}）${renderEffects(build.血统.效果)}` : null,
    build.称号?.名称 && build.称号.名称 !== '无' ? `称号：${build.称号.名称}${renderEffects(build.称号.效果)}` : null,
    build.职业?.名称 && build.职业.名称 !== '无' ? `职业：${build.职业.名称}（${build.职业.稀有度 ?? ''}）` : null,
    `通用技能：\n${renderSkills(build.通用技能)}`,
    `装备：\n${renderEquipment(build.装备)}`,
    Object.keys(build.背包建议 ?? {}).length
      ? `背包建议：\n${Object.entries(build.背包建议).map(([名, it]) => `· ${名} ×${it.数量 ?? 1}${it.描述 ? `：${it.描述}` : ''}`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderEffects(效果) {
  const parts = Object.entries(效果 ?? {}).map(([k, v]) => `${k}：${v}`);
  return parts.length ? `—— ${parts.join('；')}` : '';
}

export function renderCharacterEntry(character) {
  return [
    `【同人角色】${character.构筑名}（建议作为：${character.建议类型 ?? '其他契约者'}）`,
    `外貌：${character.外貌}`,
    character.性格 ? `性格：${character.性格}` : null,
    `背景：${character.背景}`,
    '',
    renderBuildEntry(character),
  ]
    .filter(x => x !== null)
    .join('\n');
}

// ==================== 包 → 条目 ====================
export function sourceMetaOf(pack) {
  return { sourceId: pack.id, sourceType: pack.type, version: pack.version, title: pack.name };
}

export function packToWorldbookEntries(pack) {
  if (pack.type === 'extension') {
    return (pack.worldbookEntries ?? []).map(entry => ({
      ...mapExtensionEntry(entry),
      name: `[回廊mod][${TYPE_LABEL[pack.type]}]${pack.name}·${entry.name}`,
    }));
  }
  const isBuild = pack.type === 'build';
  const payload = isBuild ? pack.build : pack.character;
  const name = isBuild ? payload.构筑名 : payload.构筑名;
  return [
    {
      name: `[回廊mod][${TYPE_LABEL[pack.type]}]${pack.name}`,
      enabled: true,
      strategy: { type: 'selective', keys: [name], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: 'after_character_definition', role: 'system', depth: 0, order: 100 },
      content: isBuild ? renderBuildEntry(payload) : renderCharacterEntry(payload),
      probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
      extra: { wxhlWorkshop: { sourceId: '', sourceType: pack.type, version: '', title: '' } },
    },
  ];
}

// ==================== 已装状态 ====================
export function computeInstalled(entries) {
  const map = new Map();
  for (const entry of entries ?? []) {
    const meta = entry?.extra?.wxhlWorkshop;
    if (!meta?.sourceId) continue;
    const prev = map.get(meta.sourceId) ?? { version: meta.version ?? '', count: 0 };
    map.set(meta.sourceId, { version: meta.version ?? prev.version, count: prev.count + 1 });
  }
  return map;
}

// ==================== API 封装 ====================
async function callApi(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) throw new Error(data?.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

export const api = {
  list: params => callApi(`/api/packs?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v))}`),
  get: id => callApi(`/api/packs/${id}`),
  upload: pack => callApi('/api/packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack) }),
  update: (id, manageKey, pack) =>
    callApi(`/api/packs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manageKey, pack }) }),
  remove: (id, manageKey) =>
    callApi(`/api/packs/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manageKey }) }),
};

// ==================== 免责声明 ====================
export function isAgreementAccepted(storage) {
  try {
    return storage.getItem(AGREEMENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptAgreement(storage) {
  try {
    storage.setItem(AGREEMENT_KEY, '1');
  } catch {
    /* 隐私模式下写不进就算了——下次再弹一次 */
  }
}

// ==================== 世界书 JSON 导入（移植自用户提供补丁 worldbook-json-import.mjs） ====================
// 纯转换：绝不执行世界书内容，也绝不碰 DOM。整次拒绝——任一条目有工坊不支持的设置，
// 整次导入抛错并点名，绝不静默跳过单条或偷偷改设置。
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ENTRIES = 2000;

const IMPORT_POSITIONS = new Map([[0, 'before_char'], [1, 'after_char'], [4, 'at_depth']]);
const KNOWN_WORLDBOOK_FIELDS = new Set([
  'uid', 'displayIndex', 'comment', 'name', 'content', 'key', 'keysecondary',
  'constant', 'disable', 'selective', 'selectiveLogic', 'position', 'role',
  'depth', 'order', 'probability', 'useProbability', 'sticky', 'cooldown', 'delay',
  'preventRecursion', 'excludeRecursion', 'vectorized', 'ignoreBudget',
  'matchPersonaDescription', 'matchCharacterDescription', 'matchCharacterPersonality',
  'matchCharacterDepthPrompt', 'matchScenario', 'matchCreatorNotes',
  'delayUntilRecursion', 'outletName', 'group', 'groupOverride', 'groupWeight',
  'scanDepth', 'caseSensitive', 'matchWholeWords', 'useGroupScoring', 'automationId',
  'characterFilterNames', 'characterFilterTags', 'characterFilterExclude',
  'triggers', 'addMemo', 'extensions', 'characterFilter',
]);
const UNSUPPORTED_NONEMPTY_FIELDS = [
  'vectorized', 'ignoreBudget', 'matchPersonaDescription', 'matchCharacterDescription',
  'matchCharacterPersonality', 'matchCharacterDepthPrompt', 'matchScenario', 'matchCreatorNotes',
  'delayUntilRecursion', 'outletName', 'group', 'automationId', 'characterFilterNames',
  'characterFilterTags', 'characterFilterExclude', 'triggers', 'extensions', 'characterFilter',
];
const UNSUPPORTED_IF_PRESENT = ['scanDepth', 'caseSensitive', 'matchWholeWords'];
const GLOBAL_UNSUPPORTED = ['scan_depth', 'token_budget', 'recursive_scanning', 'extensions'];

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function hasData(value) {
  if (value === undefined || value === null || value === false || value === 0 || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function importBool(entry, field, fallback) {
  if (!hasOwn(entry, field)) return fallback;
  if (typeof entry[field] !== 'boolean') throw new Error(`${field} 必须是布尔值`);
  return entry[field];
}

function importNumber(entry, field, fallback, { integer = true, min = -Infinity, max = Infinity } = {}) {
  if (!hasOwn(entry, field)) return fallback;
  const value = entry[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value)) || value < min || value > max) {
    throw new Error(`${field} 的数值不合法`);
  }
  return value;
}

function importNullableNumber(entry, field) {
  if (entry[field] === undefined || entry[field] === null) return null;
  return importNumber(entry, field, null, { min: 0 });
}

function importKeywords(entry, field) {
  if (!hasOwn(entry, field)) return [];
  if (!Array.isArray(entry[field]) || entry[field].some(word => typeof word !== 'string' || word.length === 0)) {
    throw new Error(`${field} 必须是非空字符串组成的数组`);
  }
  return [...entry[field]];
}

function checkUnsupportedSettings(entry, constant, secondaryKeys, position) {
  const unsupported = [];
  for (const field of UNSUPPORTED_NONEMPTY_FIELDS) {
    if (hasData(entry[field])) unsupported.push(field);
  }
  // 显式给出的逐条覆盖值不同于继承宿主全局设置（包括 false 与 0）：当前包无对应字段。
  for (const field of UNSUPPORTED_IF_PRESENT) {
    if (entry[field] !== undefined && entry[field] !== null) unsupported.push(field);
  }
  if (!constant && secondaryKeys.length > 0 && importBool(entry, 'selective', true) && (entry.selectiveLogic ?? 0) !== 0) {
    unsupported.push('selectiveLogic（工坊仅支持 AND ANY）');
  }
  if (position === 4 && (entry.role ?? 0) !== 0) unsupported.push('role（工坊仅支持 system）');
  for (const key of Object.keys(entry)) if (!KNOWN_WORLDBOOK_FIELDS.has(key)) unsupported.push(key);
  if (unsupported.length) throw new Error('当前工坊不能保留这些设置：' + unsupported.join('、'));
}

function convertWorldbookEntry(entry, index) {
  if (!isPlainObject(entry)) throw new Error('条目必须是对象');
  if (typeof entry.content !== 'string' || entry.content.length === 0) throw new Error('正文为空或不是字符串');
  if (!['key', 'comment', 'uid', 'disable'].some(key => hasOwn(entry, key))) {
    throw new Error('不是酒馆原生世界书条目；请在酒馆的世界书管理中导出 JSON');
  }
  const keys = importKeywords(entry, 'key');
  const secondary = importKeywords(entry, 'keysecondary');
  const constant = importBool(entry, 'constant', false);
  const position = importNumber(entry, 'position', 0);
  if (!IMPORT_POSITIONS.has(position)) throw new Error(`插入位置 ${position} 暂不受工坊支持（仅支持角色定义前、后和指定深度）`);
  checkUnsupportedSettings(entry, constant, secondary, position);
  if (!constant && keys.length === 0) throw new Error('绿灯条目没有主关键词，当前工坊服务器不接受此格式（禁用条目也一样）');
  if (entry.comment !== undefined && typeof entry.comment !== 'string') throw new Error('comment 必须是字符串');
  if (entry.name !== undefined && typeof entry.name !== 'string') throw new Error('name 必须是字符串');
  const sourceName = (entry.comment || entry.name || '').trim();
  const name = sourceName || `条目 ${index + 1}`;
  return {
    generatedName: !sourceName,
    entry: {
      name,
      // 正文（含 EJS/HTML 与换行）逐字以字符串保留。
      content: entry.content,
      enabled: !importBool(entry, 'disable', false),
      constant,
      keys,
      // selective 为 false 时，未使用的次要关键词不影响原作。
      keysSecondary: importBool(entry, 'selective', true) ? secondary : [],
      position: IMPORT_POSITIONS.get(position),
      depth: importNumber(entry, 'depth', 4, { min: 0 }),
      order: importNumber(entry, 'order', 100),
      probability: importBool(entry, 'useProbability', true) ? importNumber(entry, 'probability', 100, { integer: false, min: 0, max: 100 }) : 100,
      preventRecursion: importBool(entry, 'preventRecursion', false),
      excludeRecursion: importBool(entry, 'excludeRecursion', false),
      sticky: importNullableNumber(entry, 'sticky'),
      cooldown: importNullableNumber(entry, 'cooldown'),
      delay: importNullableNumber(entry, 'delay'),
    },
  };
}

export function parseWorldbookJson(text, filename = '世界书.json') {
  if (typeof text !== 'string') throw new Error('无法读取文件文本');
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('文件过大，请使用 10 MB 以内的世界书 JSON');
  let book;
  try { book = JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch { throw new Error('JSON 格式不正确，请选择从酒馆导出的世界书文件'); }
  if (!isPlainObject(book) || (!isPlainObject(book.entries) && !Array.isArray(book.entries))) {
    throw new Error('未找到 entries；请选择世界书 JSON，角色卡或酒馆脚本 JSON 不适用');
  }
  for (const field of GLOBAL_UNSUPPORTED) {
    if (hasData(book[field])) throw new Error(`世界书全局设置 ${field} 暂不能由当前工坊保留`);
  }
  const rawEntries = Object.values(book.entries);
  if (!rawEntries.length) throw new Error('世界书没有条目');
  if (rawEntries.length > MAX_IMPORT_ENTRIES) throw new Error(`条目过多，单次最多导入 ${MAX_IMPORT_ENTRIES} 条`);
  const entries = [], errors = [];
  let generatedNames = 0;
  for (const [index, raw] of rawEntries.entries()) {
    try {
      const converted = convertWorldbookEntry(raw, index);
      entries.push(converted.entry);
      generatedNames += Number(converted.generatedName);
    } catch (error) {
      const title = typeof raw?.comment === 'string' && raw.comment.trim() ? raw.comment.trim() : `条目 ${index + 1}`;
      errors.push(`${title}：${error.message}`);
    }
  }
  if (errors.length) {
    throw new Error(`尚未导入，原草稿已保留。有 ${errors.length} 条条目需要处理：\n` + errors.slice(0, 10).join('\n') + (errors.length > 10 ? '\n（仅显示前 10 条）' : ''));
  }
  return {
    name: (typeof book.name === 'string' && book.name.trim()) || filename.replace(/\.json$/i, ''),
    entries,
    summary: { total: entries.length, disabled: entries.filter(entry => !entry.enabled).length, generatedNames },
  };
}
