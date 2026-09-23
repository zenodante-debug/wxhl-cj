// 店铺归属与店铺榜单 · 纯逻辑
//
// 接单人身份 = 变量里的**当前店铺**（契约者.个人产业.当前店铺.名称）：
// '无'/空/缺失 = 未开店，未开店不准接单（store.accept 的闸门用 readShopName 判定）。
// 评分跟着店名走（spec §2）：改名 = 新店从 0；同名店铺共享一行分数。
// ShopRankBoard 形状镜像 Worker 的 /shop/rank（与玩家排行榜 /rank/top 同形，lv→score）。

/** 店铺榜单一屏的名次数；名次在此之外时另取前后邻居 */
export const SHOP_TOP_N = 20;

/**
 * 读当前店铺名。'无'/空白/路径缺失 → ''（未开店）。只读存档，不写任何变量。
 * 注意：schema 里 `当前店铺.名称` 的 prefault 就是 '无'，所以判空必须把 '无' 算进去。
 */
export function readShopName(契约者: any): string {
  const raw = 契约者?.个人产业?.当前店铺?.名称;
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s === '无' ? '' : s;
}

/** 服务器回传的店铺榜条目 */
export interface ShopRankEntry {
  name: string;
  score: number;
  /** 服务端记录的最近变动时间戳；同分时**先到的排前面** */
  updated: number;
}

/** `GET /shop/rank` 的响应（形状与玩家排行榜 RankBoard 一致） */
export interface ShopRankBoard {
  list: ShopRankEntry[];
  total: number;
  me: { rank: number; entry: ShopRankEntry } | null;
  near: { rank: number; entry: ShopRankEntry }[];
}

/** 榜单一行：条目行，或「⋯」省略号分隔 */
export type ShopBoardRow =
  | { kind: 'entry'; rank: number; entry: ShopRankEntry; mine: boolean }
  | { kind: 'gap' };

/**
 * 把服务器响应摊成可渲染的行：前 SHOP_TOP_N + （我在榜外时）省略号 + 邻居。
 * 服务器没下发邻居时（异常兜底），至少把「我」那一行补上 —— 不能让玩家看不见自己。
 * （与 rank/rank.ts 的 boardRows 同构；类型不同（lv→score）故各写一份，不做强行泛型。）
 */
export function shopBoardRows(board: ShopRankBoard): ShopBoardRow[] {
  const rows: ShopBoardRow[] = (board.list ?? []).map((entry, i) => ({
    kind: 'entry',
    rank: i + 1,
    entry,
    mine: board.me?.rank === i + 1,
  }));

  const me = board.me;
  if (!me || me.rank <= SHOP_TOP_N) return rows;

  rows.push({ kind: 'gap' });
  const near = board.near ?? [];
  for (const n of near) {
    rows.push({ kind: 'entry', rank: n.rank, entry: n.entry, mine: n.rank === me.rank });
  }
  if (!near.some(n => n.rank === me.rank)) {
    rows.push({ kind: 'entry', rank: me.rank, entry: me.entry, mine: true });
  }
  return rows;
}
