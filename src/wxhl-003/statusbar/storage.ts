// ================================================================
// 储藏室 · 数据层（纯函数，便于测试）
// 仅存本机浏览器 localStorage——**不是**酒馆变量（非全局/角色卡/聊天/消息变量），
// 因此里面的物品不会随 stat_data 发给 AI，用来给背包减重、节省 token。
// key 带项目前缀（wxhl003_），避免与其他角色卡/脚本在同源 localStorage 里串数据。
// 物品结构沿用背包条目；存入/取出按「名称」堆叠合并（与背包同一口径）。
// ================================================================

export const STORAGE_KEY = 'wxhl003_storage_room';

/** 储藏室：物品名 → 背包条目（含 数量） */
export type StorageRoom = Record<string, any>;

/** 读储藏室；损坏/非对象一律回退为空 */
export function loadStorage(): StorageRoom {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (_) {
    return {};
  }
}

/** 写储藏室；localStorage 不可用时静默放弃（不阻塞存取流程） */
export function saveStorage(s: StorageRoom): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (_) {
    /* 忽略 */
  }
}

/** 存入：把整堆物品并入储藏室（同名堆叠、数量相加），返回新储藏室（不改原对象） */
export function deposit(storage: StorageRoom, name: string, item: any): StorageRoom {
  const next = { ...storage };
  const count = Number(item?.数量 ?? 1) || 1;
  if (next[name]) {
    next[name] = { ...next[name], 数量: (Number(next[name].数量 ?? 1) || 1) + count };
  } else {
    next[name] = { ...item, 数量: count };
  }
  return next;
}

/** 取出：从储藏室移除整堆并返回它；不存在返回 null（不改原对象） */
export function withdraw(storage: StorageRoom, name: string): { next: StorageRoom; item: any } | null {
  if (!storage[name]) return null;
  const item = storage[name];
  const next = { ...storage };
  delete next[name];
  return { next, item };
}
