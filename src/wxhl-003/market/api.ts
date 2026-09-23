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

/** 挂单成交总价（单价 × 数量） */
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

export function fetchListings(): Promise<Listing[]> {
  return req<{ listings: Listing[] }>('/market/listings').then(r => r.listings);
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

export function buyListing(id: string, buyer: string): Promise<void> {
  return post('/market/buy', { id, buyer, client: getClientId() });
}

export function cancelListing(id: string): Promise<void> {
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
