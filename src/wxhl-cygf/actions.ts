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
