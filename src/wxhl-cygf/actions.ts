export const WORKSHOP_WORLDBOOK_NAME = '无限回廊mod';
export const WORKSHOP_EXTRA_KEY = 'wxhlWorkshop';

export interface SourceMeta {
  sourceId: string;
  sourceType?: string;
}

/** 读取条目的工坊把手；无把手或把手残缺返回 null */
export function getWorkshopMeta(entry: WorldbookEntry): (Record<string, any> & SourceMeta) | null {
  const meta = entry?.extra?.[WORKSHOP_EXTRA_KEY];
  if (!meta || typeof meta.sourceId !== 'string' || meta.sourceId === '') return null;
  return meta;
}

/** 条目是否属于 sourceMeta 指定的内容包 */
export function matchesSource(entry: WorldbookEntry, sourceMeta: SourceMeta): boolean {
  const meta = getWorkshopMeta(entry);
  if (!meta || !sourceMeta?.sourceId) return false;
  if (meta.sourceId !== sourceMeta.sourceId) return false;
  return !sourceMeta.sourceType || (meta.sourceType ?? '') === sourceMeta.sourceType;
}

/**
 * upsert 纯逻辑：删掉 sourceMeta 对应的旧条目 → 追加新条目 → 带把手条目按 order 归一化（1..N）。
 * 不动无把手条目的字段（玩家手动加的内容），不分配 uid。
 *
 * 返回数组按 `position.order` 排好序：带把手条目因此以归一化后的 1..N 顺序排在前列
 * （brief 原实现只 sort 了 filter 出来的临时数组、返回未排序的 merged，无法满足本条测试）。
 */
export function computeUpsertWorldbook(
  entries: WorldbookEntry[],
  sourceMeta: SourceMeta,
  newEntries: WorldbookEntry[],
): WorldbookEntry[] {
  const remaining = entries.filter(entry => !matchesSource(entry, sourceMeta));
  const merged = [...remaining, ...newEntries];
  merged.sort((a, b) => (a.position?.order ?? 0) - (b.position?.order ?? 0) || a.name.localeCompare(b.name));
  const managed = merged.filter(entry => getWorkshopMeta(entry) !== null);
  managed.forEach((entry, index) => {
    entry.position = { ...entry.position, order: index + 1 };
  });
  return merged;
}

// ==================== 互斥队列（写操作读改写不可并发，范例二的教训） ====================
let _queue: Promise<unknown> = Promise.resolve();

export function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = _queue.then(fn, fn);
  _queue = run.then(
    () => {},
    () => {},
  );
  return run;
}

export function resetQueueForTest(): void {
  _queue = Promise.resolve();
}

// ==================== 契约者只读桥接（竞技场同款白名单） ====================
/** 竞技场同款白名单：只回构筑相关子树，绝不带经济/背包/人际关系/副本经历/论坛档案 */
const CONTRACT_SAVE_KEYS = ['头部', '属性', '衍生属性', '职业', '通用技能', '装备'] as const;

/** 重算 属性.实际 = 基础 + 加成 + 自定义加成（照 src/wxhl-003/workshop.ts 的 extractContractSave） */
function recomputeActual(属性: any): void {
  if (!属性?.基础) return;
  属性.实际 = {
    STR: (属性.基础.STR ?? 0) + (属性.加成?.STR ?? 0) + (属性.自定义加成?.STR ?? 0),
    AGI: (属性.基础.AGI ?? 0) + (属性.加成?.AGI ?? 0) + (属性.自定义加成?.AGI ?? 0),
    CON: (属性.基础.CON ?? 0) + (属性.加成?.CON ?? 0) + (属性.自定义加成?.CON ?? 0),
    PER: (属性.基础.PER ?? 0) + (属性.加成?.PER ?? 0) + (属性.自定义加成?.PER ?? 0),
  };
}

/** 只读：从当前楼层（回退最新楼层）的 stat_data.契约者 摘出六字段构筑白名单 */
function readContractor(): { 契约者: Record<string, unknown> } {
  const pick = (messageId: number | 'latest') => {
    const vars = getVariables({ type: 'message', message_id: messageId }) as any;
    // 用可选链而不是 lodash `_`：宿主脚本没有引 lodash
    return vars?.stat_data?.契约者 as Record<string, any> | undefined;
  };
  let 契约者: Record<string, any> | undefined;
  try {
    契约者 = pick(typeof getLastMessageId === 'function' ? getLastMessageId() : -1);
  } catch {
    /* 楼层接口不可用 */
  }
  if (!契约者) 契约者 = pick(-1);
  if (!契约者) throw new Error('读不到当前契约者：请确认已加载角色卡并在有存档的楼层使用');

  const 摘出: Record<string, unknown> = {};
  for (const key of CONTRACT_SAVE_KEYS) 摘出[key] = 契约者[key];
  recomputeActual(摘出.属性);
  return { 契约者: 摘出 };
}

// ==================== 世界书 ensure ====================
export async function ensureWorkshopWorldbook(): Promise<{ created: boolean; bound: boolean }> {
  let created = false;
  if (!getWorldbookNames().includes(WORKSHOP_WORLDBOOK_NAME)) {
    await createWorldbook(WORKSHOP_WORLDBOOK_NAME, []);
    created = true;
  }
  const charBooks = getCharWorldbookNames('current');
  const additional = charBooks.additional ?? [];
  let bound = false;
  if (charBooks.primary !== WORKSHOP_WORLDBOOK_NAME && !additional.includes(WORKSHOP_WORLDBOOK_NAME)) {
    await rebindCharWorldbooks('current', { primary: charBooks.primary, additional: [...additional, WORKSHOP_WORLDBOOK_NAME] });
    bound = true;
  }
  return { created, bound };
}

// ==================== 动作分发 ====================
// getContext 虽名为读动作，但内部 ensureWorkshopWorldbook 会 createWorldbook / rebindCharWorldbooks 写世界书；
// 与队列中的 upsertWorkshopEntries 并发会出现"检查不存在 → 别的写操作刚写入 → createWorldbook 用空数组覆盖"的清空窗口，
// 故整体入队（不要在 ensure 内部再套 queued —— 将来嵌套入队会死锁）。
export const MUTATING_ACTIONS: ReadonlySet<string> = new Set([
  'getContext',
  'createWorldbook',
  'createEntries',
  'updateEntry',
  'deleteEntries',
  'upsertWorkshopEntries',
  'deleteWorkshopEntries',
  'applyBuild',
]);

function requireString(payload: Record<string, any>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value === '') throw new Error(`缺少必要参数: ${key}`);
  return value;
}

function requireEntries(payload: Record<string, any>): WorldbookEntry[] {
  if (!Array.isArray(payload.entries)) throw new Error('缺少必要参数: entries（数组）');
  return payload.entries as WorldbookEntry[];
}

async function handleAction(action: string, payload: Record<string, any>): Promise<unknown> {
  switch (action) {
    case 'handshake':
      return {
        label: 'wxhl创意工坊宿主',
        workshopWorldbook: WORKSHOP_WORLDBOOK_NAME,
        hostVersion: typeof __WXHL_BUILD__ !== 'undefined' ? __WXHL_BUILD__ : 'dev',
        capabilities: {
          getWorldbookNames: typeof getWorldbookNames === 'function',
          getCharWorldbookNames: typeof getCharWorldbookNames === 'function',
          rebindCharWorldbooks: typeof rebindCharWorldbooks === 'function',
          getWorldbook: typeof getWorldbook === 'function',
          createWorldbook: typeof createWorldbook === 'function',
          replaceWorldbook: typeof replaceWorldbook === 'function',
          updateWorldbookWith: typeof updateWorldbookWith === 'function',
          createWorldbookEntries: typeof createWorldbookEntries === 'function',
          deleteWorldbookEntries: typeof deleteWorldbookEntries === 'function',
        },
      };
    case 'getContext': {
      const ensured = await ensureWorkshopWorldbook();
      return {
        worldbookNames: getWorldbookNames(),
        charWorldbooks: getCharWorldbookNames('current'),
        workshopWorldbook: WORKSHOP_WORLDBOOK_NAME,
        ensured,
      };
    }
    case 'getEntries': {
      // 先校验参数再引用全局：未打桩时 getWorldbook 未定义，若内联调用会先抛 ReferenceError 而掩盖缺参错误
      const name = requireString(payload, 'worldbookName');
      return { entries: await getWorldbook(name) };
    }
    case 'createWorldbook': {
      const name = requireString(payload, 'worldbookName');
      return { created: await createWorldbook(name, []) };
    }
    case 'createEntries': {
      const name = requireString(payload, 'worldbookName');
      return await createWorldbookEntries(name, requireEntries(payload), { render: 'immediate' });
    }
    case 'updateEntry': {
      const name = requireString(payload, 'worldbookName');
      const uid = Number(payload.uid);
      if (!Number.isFinite(uid)) throw new Error('updateEntry 缺少合法 uid');
      const nextEntry = (payload.nextEntry ?? {}) as Partial<WorldbookEntry>;
      // 先读全量确认 uid 存在再写：不能靠 updater 里的命中标记，uid 打错时必须响亮报错而不是假报成功
      const worldbook = await getWorldbook(name);
      if (!worldbook.some(entry => Number(entry.uid) === uid)) throw new Error(`updateEntry 未找到 uid ${uid}`);
      await updateWorldbookWith(name, entries => entries.map(entry => (Number(entry.uid) === uid ? { ...entry, ...nextEntry } : entry)), { render: 'immediate' });
      return { updated: true };
    }
    case 'deleteEntries': {
      const name = requireString(payload, 'worldbookName');
      // 丢掉非有限值后为空（缺参 / 全非法）就报错：空集合匹配不到任何条目，静默"成功"会掩盖调用方的 bug
      const uids = new Set(((payload.uids ?? []) as unknown[]).map(Number).filter(Number.isFinite));
      if (uids.size === 0) throw new Error('deleteEntries 缺少 uids');
      return await deleteWorldbookEntries(name, entry => uids.has(Number(entry.uid)), { render: 'immediate' });
    }
    case 'upsertWorkshopEntries': {
      const name = requireString(payload, 'worldbookName');
      const sourceMeta = payload.sourceMeta as SourceMeta | undefined;
      if (!sourceMeta || typeof sourceMeta.sourceId !== 'string' || sourceMeta.sourceId === '') {
        throw new Error('upsertWorkshopEntries 缺少 sourceMeta.sourceId');
      }
      const newEntries = requireEntries(payload);
      // 宿主补把手：云端漏打标记的条目会变得不可管理（后续 upsert/卸载都匹配不到），
      // 而卸载不干净比报错更糟 —— 所以由宿主以 payload 的 sourceMeta 为准盖章
      const stamped = newEntries.map(entry => ({
        ...entry,
        extra: {
          ...(entry.extra ?? {}),
          [WORKSHOP_EXTRA_KEY]: { ...((entry.extra ?? {})[WORKSHOP_EXTRA_KEY] ?? {}), ...sourceMeta },
        },
      }));
      const worldbook = await getWorldbook(name);
      const next = computeUpsertWorldbook(worldbook, sourceMeta, stamped);
      await replaceWorldbook(name, next, { render: 'immediate' });
      return { total: next.length, installed: newEntries.length };
    }
    case 'deleteWorkshopEntries': {
      const name = requireString(payload, 'worldbookName');
      const sourceMeta = payload.sourceMeta as SourceMeta | undefined;
      if (!sourceMeta || typeof sourceMeta.sourceId !== 'string' || sourceMeta.sourceId === '') {
        throw new Error('deleteWorkshopEntries 缺少 sourceMeta.sourceId');
      }
      // 整包卸载：互斥队列内读全量→按把手过滤→一次性写回，避免页面自己找 uid 再删的读改写竞争
      const worldbook = await getWorldbook(name);
      const kept = worldbook.filter(entry => !matchesSource(entry, sourceMeta));
      const removed = worldbook.length - kept.length;
      if (removed > 0) await replaceWorldbook(name, kept, { render: 'immediate' });
      return { removed };
    }
    case 'applyBuild':
      return applyBuild(payload);
    case 'readContractor':
      return readContractor();
    default:
      throw new Error(`未知桥接动作: ${action}`);
  }
}

/** 写动作进互斥队列，读动作直接执行 */
export function dispatchAction(action: string, payload: Record<string, any>): Promise<unknown> {
  return MUTATING_ACTIONS.has(action) ? queued(() => handleAction(action, payload)) : handleAction(action, payload);
}

// ==================== 写变量：把构筑/人设装到不同位置（2026-10-12 用户需求） ====================
const APPLY_TARGETS = ['扮演', '队友', '副本角色', '其他契约者'] as const;
const 副本角色类型 = ['杂兵', '精英', 'BOSS', '隐藏BOSS', '精英（固有角色）', 'BOSS（固有角色）', '隐藏BOSS（固有角色）'] as const;

const 零属性 = () => ({ STR: 0, AGI: 0, CON: 0, PER: 0 });

/**
 * 外观三件套 → 单个「外貌」字符串：带标签分行，只拼非空段；三段全空回 ''（由 entityFromBuild 落成 '无'）。
 * 取值口径：payload.外观（或 payload.build?.外观）→ payload.外观额外，逐块取第一个非空文本；「外貌」兼容旧字段 payload.外貌。
 */
export function composeAppearance(payload: Record<string, any>): string {
  const 外观块: Array<Record<string, any>> = [payload?.外观 ?? payload?.build?.外观 ?? {}, payload?.外观额外 ?? {}];
  const 取值 = (key: string): string => {
    for (const 块 of 外观块) {
      const value = 块?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    if (key === '外貌') {
      const 旧 = payload?.外貌;
      if (typeof 旧 === 'string' && 旧.trim()) return 旧.trim();
    }
    return '';
  };
  const 行: Array<[string, string]> = [
    ['外貌', 取值('外貌')],
    ['衣着', 取值('衣着')],
    ['装备幻化', 取值('装备幻化')],
  ];
  return 行
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n');
}

/** 背包建议（{物品名: {描述, 数量}}）→ 实体/契约者「背包」条目：数量缺省 1，数量 <= 0 的丢掉 */
export function bagFromAdvice(背包建议: any): Record<string, { 描述: string; 数量: number }> {
  const 背包: Record<string, { 描述: string; 数量: number }> = {};
  for (const [名, item] of Object.entries(背包建议 ?? {})) {
    if (!名) continue;
    const 原数量 = Number((item as any)?.数量);
    const 数量 = Number.isFinite(原数量) ? 原数量 : 1;
    if (数量 <= 0) continue;
    背包[名] = { 描述: String((item as any)?.描述 ?? ''), 数量 };
  }
  return 背包;
}

/** 构筑载荷 → 变量结构里的「实体」（实体Schema） */
export function entityFromBuild(build: any, 类型: string, 外貌: string): Record<string, any> {
  const 基础 = { STR: 5, AGI: 5, CON: 5, PER: 5, ...(build?.属性基础 ?? {}) };
  const 属性: any = { 基础, 加成: 零属性(), 自定义加成: 零属性(), 未分配属性点: 0 };
  recomputeActual(属性);
  return {
    外貌: 外貌 || '无',
    类型,
    构筑: build?.定位 || '无',
    好感度: 0,
    头部: {
      等级: Number(build?.等级) || 1,
      阶位: build?.阶位 || '一阶',
      天赋: build?.天赋 ?? { 名称: '无' },
      血统: build?.血统 ?? { 名称: '无' },
      称号: { 当前称号: build?.称号 ?? { 名称: '无' }, '备用称号（只记录不生效）': { 名称: '无' } },
    },
    属性,
    职业: build?.职业 ?? { 名称: '无' },
    通用技能: build?.通用技能 ?? {},
    装备: build?.主要装备 ?? {},
    状态: { 生命状态: '健康', 特殊状态: {} },
    背包: bagFromAdvice(build?.背包建议),
  };
}

/**
 * 扮演：**只覆盖构筑字段**，保留玩家自己的进度（经济/人际关系/副本经历/论坛档案/小队…）。
 * 用户 2026-10-12 拍板：不要把玩家的存档整个重置。
 * 2026-10-13 裁决补充：背包按「合并新增」处理——只把包里、而玩家背包里没有的物品加进去，
 * 同名不覆盖、不删除任何已有物品（既尊重「保留进度」，又让背包建议真正落地）。
 */
export function applyAsPlayer(契约者: any, build: any): string[] {
  const 写入: string[] = [];
  const 原头部 = 契约者.头部 ?? {};
  const 头部: any = {
    ...原头部,
    等级: Number(build?.等级) || Number(原头部.等级) || 1,
    阶位: build?.阶位 || 原头部.阶位 || '一阶',
  };
  if (build?.天赋) 头部.天赋 = build.天赋;
  if (build?.血统) 头部.血统 = build.血统;
  if (build?.称号) {
    头部.称号 = { 当前称号: build.称号, '备用称号（只记录不生效）': 原头部.称号?.['备用称号（只记录不生效）'] ?? { 名称: '无' } };
  }
  契约者.头部 = 头部;
  写入.push('头部');

  if (build?.属性基础) {
    const 属性 = { ...(契约者.属性 ?? {}), 基础: { STR: 5, AGI: 5, CON: 5, PER: 5, ...build.属性基础 } };
    recomputeActual(属性);
    契约者.属性 = 属性;
    写入.push('属性');
  }
  if (build?.职业) {
    契约者.职业 = build.职业;
    写入.push('职业');
  }
  if (build?.通用技能) {
    契约者.通用技能 = build.通用技能;
    写入.push('通用技能');
  }
  if (build?.主要装备) {
    契约者.装备 = build.主要装备;
    写入.push('装备');
  }
  // 背包：合并新增（同名不覆盖、不删除已有）
  const 新增背包 = bagFromAdvice(build?.背包建议);
  const 背包名 = Object.keys(新增背包);
  if (背包名.length > 0) {
    const 现有背包 = 契约者.背包 && typeof 契约者.背包 === 'object' ? 契约者.背包 : {};
    let 新增 = 0;
    for (const 名 of 背包名) {
      if (Object.prototype.hasOwnProperty.call(现有背包, 名)) continue; // 已有则跳过，绝不覆盖
      现有背包[名] = 新增背包[名];
      新增 += 1;
    }
    if (新增 > 0) {
      契约者.背包 = 现有背包;
      写入.push('背包');
    }
  }
  return 写入;
}

/** 读当前楼层的 MVU 数据（楼层取不到就退回 -1，与 wxhl-003 store 同口径） */
function readLatestMvu(): { 数据: any; message_id: number | 'latest' } {
  let message_id: number | 'latest' = -1;
  try {
    const mid = typeof getLastMessageId === 'function' ? getLastMessageId() : -1;
    if (mid && mid !== -1) message_id = mid;
  } catch {
    // 楼层接口不可用 → 保持 -1
  }
  return { 数据: Mvu.getMvuData({ type: 'message', message_id }), message_id };
}

/** 把构筑/人设装到不同位置：扮演改契约者构筑字段；其余写进对应实体表 */
async function applyBuild(payload: Record<string, any>): Promise<unknown> {
  const target = payload.target as (typeof APPLY_TARGETS)[number];
  if (!APPLY_TARGETS.includes(target)) {
    throw new Error('applyBuild 的 target 必须是 扮演/队友/副本角色/其他契约者');
  }
  const build = payload.build ?? {};
  const 名字 = String(payload.name ?? '').trim() || String(build.构筑名 ?? '').trim() || String(build.角色名 ?? '').trim();
  if (!名字) throw new Error('applyBuild 缺少名字（要写进哪个实体的键）');
  const 外貌 = composeAppearance(payload);

  await waitGlobalInitialized('Mvu');
  const { 数据, message_id } = readLatestMvu();
  const 契约者 = 数据?.stat_data?.契约者;
  if (!契约者) throw new Error('读不到当前契约者：请在有存档的楼层使用');

  const 写入: string[] = [];
  if (target === '扮演') {
    写入.push(...applyAsPlayer(契约者, build));
  } else {
    let 类型 = '其他契约者';
    if (target === '队友') 类型 = '小队成员';
    else if (target === '副本角色') {
      类型 = String(payload.类型 ?? '杂兵');
      if (!副本角色类型.includes(类型 as (typeof 副本角色类型)[number])) {
        throw new Error('副本角色的类型不合法：' + 类型);
      }
    }
    const 实体 = entityFromBuild(build, 类型, 外貌);
    if (target === '队友') {
      契约者.小队 = 契约者.小队 ?? { 名称: '无', 成员: {} };
      契约者.小队.成员 = 契约者.小队.成员 ?? {};
      契约者.小队.成员[名字] = 实体;
      写入.push('小队.成员.' + 名字);
    } else if (target === '副本角色') {
      契约者.副本角色 = 契约者.副本角色 ?? {};
      契约者.副本角色[名字] = 实体;
      写入.push('副本角色.' + 名字);
    } else {
      契约者.其他契约者 = 契约者.其他契约者 ?? {};
      契约者.其他契约者[名字] = 实体;
      写入.push('其他契约者.' + 名字);
    }
  }

  await Mvu.replaceMvuData(数据, { type: 'message', message_id });
  return { ok: true, target, name: 名字, written: 写入 };
}
