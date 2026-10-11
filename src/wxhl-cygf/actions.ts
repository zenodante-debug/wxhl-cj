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
    default:
      throw new Error(`未知桥接动作: ${action}`);
  }
}

/** 写动作进互斥队列，读动作直接执行 */
export function dispatchAction(action: string, payload: Record<string, any>): Promise<unknown> {
  return MUTATING_ACTIONS.has(action) ? queued(() => handleAction(action, payload)) : handleAction(action, payload);
}
