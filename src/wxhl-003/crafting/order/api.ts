// 订单 Worker 封装：照 market/api.ts 的 req/post 写法，复用同一后端域名与匿名客户端标识。
import { MARKET_API, getClientId } from '../../market/api';
import type { MarketItemSnapshot } from '../../market/priceTable';
import type { 需求单 } from './spec';

export type 订单状态 = '待接单' | '已接单' | '已交付' | '已完成' | '已取消' | '已弃单';

export interface 订单 {
  id: string;
  poster: string;
  maker: string | null;
  spec: 需求单;
  deposit: number;
  final: number;
  status: 订单状态;
  created: number;
  updated: number;
}

export interface 待领项 { id: string; 项: '订金' | '尾款' | '成品' }
export interface 待领取 {
  deposit: number;
  final: number;
  items: { id: string; item: MarketItemSnapshot }[];
  /** 服务器给出的领取清单：客户端照此逐条 ACK，**不要**从汇总或订单列表反推 */
  待领: 待领项[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(MARKET_API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
const post = <T>(path: string, body: unknown): Promise<T> => req<T>(path, { method: 'POST', body: JSON.stringify(body) });

export function createOrder(p: { poster: string; spec: 需求单; deposit: number; final: number }): Promise<{ id: string }> {
  return post('/order/create', { ...p, client: getClientId() });
}
export function fetchHall(exclude: string): Promise<订单[]> {
  return req<{ orders: 订单[] }>(`/order/list?exclude=${encodeURIComponent(exclude)}`).then(r => r.orders);
}
export function acceptOrder(id: string, maker: string): Promise<void> {
  return post('/order/accept', { id, maker, client: getClientId() }).then(() => undefined);
}
export function deliverOrder(id: string, maker: string, item: MarketItemSnapshot): Promise<void> {
  return post('/order/deliver', { id, maker, item, client: getClientId() }).then(() => undefined);
}
export function confirmOrder(id: string, poster: string): Promise<void> {
  return post('/order/confirm', { id, poster, client: getClientId() }).then(() => undefined);
}
export function rejectOrder(id: string, poster: string): Promise<void> {
  return post('/order/reject', { id, poster, client: getClientId() }).then(() => undefined);
}
export function fetchMine(who: string): Promise<{ asPoster: 订单[]; asMaker: 订单[]; claim: 待领取 }> {
  return req(`/order/mine?who=${encodeURIComponent(who)}`);
}
export function ackOrder(id: string, who: string, side: 'poster' | 'maker', 项: '订金' | '尾款' | '成品'): Promise<{ deleted: boolean }> {
  return post('/order/ack', { id, who, side, 项, client: getClientId() });
}
