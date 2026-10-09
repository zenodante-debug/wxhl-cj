import type { MarketItemSnapshot } from './priceTable';

/** 部署域名：绑定自定义域名后改这里 */
export const MARKET_API = 'https://market.657868.xyz';

const CLIENT_KEY = 'wxhl003_market_client';

/** 匿名客户端标识：首次随机生成，持久化在 localStorage */
export function getClientId(): string {
  let id = '';
  try {
    id = localStorage.getItem(CLIENT_KEY) ?? '';
  } catch (_) {}
  if (!id) {
    id = 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try {
      localStorage.setItem(CLIENT_KEY, id);
    } catch (_) {}
  }
  return id;
}

export interface Listing {
  id: string;
  client: string;
  seller: string;
  tier: string;
  kind: 'equip' | 'goods';
  item: MarketItemSnapshot;
  qty: number;
  /** 单价（UP）。成交总价 = price × qty */
  price: number;
  created: number;
  /** 超模声明（真实阶位 + 已付费用），非超模物品为空 */
  op?: { tier: string; rp: number; up: number };
}

/**
 * 挂单成交总价（单价 × 数量）。
 * 注意：**金额一律走 `buyQty.ts` 的 `buyTotals`**（它同时给总价/手续费/实付，且数量已夹取）。
 * 这里保留只是为了不打断外部引用，新代码别再单独用它拼金额。
 */
export function totalPrice(l: Pick<Listing, 'price' | 'qty'>): number {
  return Number(l.price) * Number(l.qty);
}

/** 出售记录（我的成交史，含买家名） */
export interface SaleRecord {
  id: string;
  buyer: string;
  item: MarketItemSnapshot;
  qty: number;
  price: number;
  created: number;
}

/** 非 2xx 时 throw Error(响应文本)；Worker 400 的响应体就是拒绝原因 */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(MARKET_API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  req<T>(path, { method: 'POST', body: JSON.stringify(body) });

/**
 * 取**全部**在售挂单：服务端分页（limit ≤ 500/页，带 `hasMore`），这里一页页翻到底。
 *
 * ⚠️ 早先这里裸调 `/market/listings`，服务端默认只回最新 50 条 —— 市集一超过 50 件，
 * 更早的挂单就再也取不到（玩家挂的东西「凭空消失」）。翻页 + 服务端 `hasMore` 是根治。
 *
 * 两层兜底，保证不会死循环也不会漏：
 * - 服务端**旧版**不认 `offset`（没有 `hasMore`）时，第 2 页会返回同一批 → 用 id 去重，
 *   一整页没有新条目即视为到底（越早的版本越不会因此卡住或重复渲染）。
 * - 硬上限 20 页（约 1 万条），防服务端异常时无限翻。
 */
export async function fetchListings(): Promise<Listing[]> {
  const 全部: Listing[] = [];
  const 已见 = new Set<string>();
  for (let offset = 0, 页号 = 0; 页号 < 20; 页号++) {
    const r = await req<{ listings: Listing[]; hasMore?: boolean }>(
      `/market/listings?limit=500&offset=${offset}`,
    );
    const 页 = r.listings ?? [];
    const 新条目 = 页.filter(l => !已见.has(l.id));
    if (新条目.length === 0) break; // 到底了（也兜住不认 offset 的旧服务端）
    for (const l of 新条目) 已见.add(l.id);
    全部.push(...新条目);
    if (!r.hasMore) break;
    offset += 页.length;
  }
  return 全部;
}

export function createListing(p: {
  seller: string;
  tier: string;
  kind: 'equip' | 'goods';
  item: MarketItemSnapshot;
  qty: number;
  price: number;
  /** 超模声明（真实阶位+费用），仅超模物品携带 */
  op?: { tier: string; rp: number; up: number };
}): Promise<{ id: string }> {
  return post('/market/list', { client: getClientId(), ...p });
}

/** 购买：只买走 `qty` 件（部分购买，剩余继续挂在市场上）。服务器按单价×qty 给卖家记账 */
export function buyListing(id: string, buyer: string, qty: number): Promise<{ ok: boolean; bought: number }> {
  return post('/market/buy', { id, buyer, client: getClientId(), qty });
}

/**
 * 下架取回。回传服务端此刻的**剩余数量** —— 部分成交后本地缓存那份挂单的 qty 是陈旧的，
 * 按它往背包加会让卖家多拿回物品，所以必须用服务器这个数。
 */
export function cancelListing(id: string): Promise<{ ok: boolean; returned: number }> {
  return post('/market/cancel', { id, client: getClientId() });
}

export function collectProceeds(): Promise<number> {
  return post<{ gained: number }>('/market/collect', { client: getClientId() }).then(r => r.gained);
}

export function fetchMine(): Promise<{ pending: number; listings: Listing[] }> {
  return req(`/market/mine?client=${encodeURIComponent(getClientId())}`);
}

/** 我的出售记录（含买家名，最近 100 条） */
export function fetchSales(): Promise<SaleRecord[]> {
  return req<{ sales: SaleRecord[] }>(`/market/sales?client=${encodeURIComponent(getClientId())}`).then(r => r.sales);
}
