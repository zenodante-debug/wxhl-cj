/**
 * 玩家排行榜 · 纯逻辑
 *
 * 排序与名次展示**全部在客户端脚本算**（服务器只存和回传），不烧任何 AI token。
 *
 * 规则（2026-09-22 定稿）：
 * - 排名依据是**等级**，不是资格分 —— 资格分每赛季清零，等级不会
 * - **Lv.1 不上榜，Lv.10 起才能参与**；等级**无上限**（可以超脱）
 * - 唯一键是**契约者姓名**，同名后来者顶掉先前者（同一个玩家换新存档）
 * - 一次展示前 `TOP_N` 名；名次在 `TOP_N` 之外时，另外补上「前一名 + 我 + 后一名」
 */

/** 参与排行的最低等级：Lv.1 不上榜 */
export const MIN_LV = 10;

/** 榜单一次展示的名次数；名次在此之外时另取前后各一名 */
export const TOP_N = 20;

/** 上传给服务器的字段 */
export interface RankPayload {
  name: string;
  lv: number;
  title: string;
  job: string;
}

/** 服务器回传的榜上条目 */
export interface RankEntry extends RankPayload {
  /** 服务端记录的上传时间戳，同等级时**先上传的排前面** */
  updated: number;
}

/** `GET /rank/top` 的响应 */
export interface RankBoard {
  /** 前 `TOP_N` 名 */
  list: RankEntry[];
  /** 全服总人数 */
  total: number;
  /** 我的名次；从没上传过就是 null */
  me: { rank: number; entry: RankEntry } | null;
  /** 只在 `me.rank > TOP_N` 时下发：我的前一名与后一名（名次 <= TOP_N 的不重复下发） */
  near: { rank: number; entry: RankEntry }[];
}

/** `readRankSnapshot` 的结果。不够门槛与没名字要分开，UI 才好给不同的文案 */
export type SnapshotResult =
  | { ok: true; payload: RankPayload }
  | { ok: false; reason: 'no-name' | 'too-low'; lv: number };

/** 榜单一行：榜单条目的行，或「⋯」省略号分隔 */
export type BoardRow =
  | { kind: 'entry'; rank: number; entry: RankEntry; mine: boolean }
  | { kind: 'gap' };

/** 文本归一：空串与「无」都算没有，回落到兜底文案 */
function 文本(v: unknown, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return !s || s === '无' ? fallback : s;
}

/**
 * 从 MVU 存档快照读上传字段。
 * 姓名缺失和等级不够都返回 `ok: false`（不抛错）—— 缺姓名优先报 no-name。
 */
export function readRankSnapshot(契约者: any): SnapshotResult {
  const 头部 = 契约者?.头部 ?? {};
  const name = 文本(头部.姓名, '');
  const rawLv = Number(头部.等级);
  const lv = Number.isFinite(rawLv) ? Math.floor(rawLv) : 0;

  if (!name) return { ok: false, reason: 'no-name', lv };
  if (lv < MIN_LV) return { ok: false, reason: 'too-low', lv };

  return {
    ok: true,
    payload: {
      name,
      lv,
      title: 文本(头部?.称号?.当前称号?.名称, '无称号'),
      job: 文本(契约者?.职业?.名称, '无职业'),
    },
  };
}

/** 名次文案：`第 3 名 · 共 128 人`；没上榜就是「未上榜」 */
export function rankText(rank: number, total: number): string {
  if (!(Number(rank) > 0) || !(Number(total) > 0)) return '未上榜';
  return `第 ${Math.floor(rank)} 名 · 共 ${total} 人`;
}

/**
 * 把服务器响应摊成可渲染的行：
 * 前 `TOP_N` 名 + （我在 `TOP_N` 之外时）省略号 + 我的前后邻居。
 *
 * 服务器没下发邻居时（异常兜底），至少把「我」那一行补上 —— 不能让玩家看不见自己。
 */
export function boardRows(board: RankBoard): BoardRow[] {
  const rows: BoardRow[] = (board.list ?? []).map((entry, i) => ({
    kind: 'entry',
    rank: i + 1,
    entry,
    mine: board.me?.rank === i + 1,
  }));

  const me = board.me;
  if (!me || me.rank <= TOP_N) return rows;

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
