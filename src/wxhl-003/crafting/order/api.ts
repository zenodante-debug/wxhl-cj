// 订单 Worker 封装：照 market/api.ts 的 req/post 写法，复用同一后端域名与匿名客户端标识。
import { MARKET_API, getClientId } from '../../market/api';
import type { MarketItemSnapshot } from '../../market/priceTable';
import type { ShopRankBoard } from './rep/shop';
import type { 需求单 } from './spec';

export type 订单状态 = '待接单' | '已接单' | '已交付' | '已完成' | '已取消' | '已弃单';

export interface 订单 {
  id: string;
  poster: string;
  maker: string | null;
  /** 接单人店铺名（v4b；老订单行为 null，展示回退 maker） */
  maker_shop: string | null;
  spec: 需求单;
  deposit: number;
  final: number;
  status: 订单状态;
  created: number;
  updated: number;
}

/**
 * `待领` 的一条：`id` + `项` 是 `/order/ack` 的入参，`金额` 是该条**自己**值多少钱。
 *
 * Ruling M：金额必须**逐条给出**，客户端不许再从 `claim.deposit`/`claim.final` 的汇总里取数。
 * 理由是「先回执、后入账」的记账需要：客户端只为**回执成功**的条目入账，一旦 ACK 失败（网络抖动即可），
 * 只认汇总就认不出「这项是不是已经发过了」—— 下次刷新会按汇总**再发一遍**（无限刷钱）。
 * 口径（服务器侧同源）：`订金` → 该单 deposit；`尾款` 且是钱（已完成）→ 该单 final；
 * `尾款` 但指**退货退回的成品**（已取消）→ 0；`成品` → 0（它给的是物，不是钱）。
 */
export interface 待领项 { id: string; 项: '订金' | '尾款' | '成品' | '赔偿'; 金额: number }
export interface 待领取 {
  /** 汇总数字（订金合计）—— **仅供界面显示**。入账一律按 `待领` 逐条的 `金额` 累加（Ruling M） */
  deposit: number;
  /** 汇总数字（尾款合计）—— 同上，仅供显示 */
  final: number;
  /** 汇总数字（赔偿合计，弃单产生）—— 同上，仅供显示；没有就是 null */
  comp: number | null;
  /** 待领的成品：`id` 与该成品的 `待领` 条目（`项='成品'`，或退货退回时的 `项='尾款'`）同 id */
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
export function acceptOrder(id: string, maker: string, makerShop: string): Promise<void> {
  return post('/order/accept', { id, maker, maker_shop: makerShop, client: getClientId() }).then(() => undefined);
}
export function abandonOrder(id: string, maker: string): Promise<void> {
  return post('/order/abandon', { id, maker, client: getClientId() }).then(() => undefined);
}
/** 店铺分数上报（信义模型）。失败由调用方决定忽略——分数是荣誉值，可丢；钱物通道不受影响 */
export function reportShopScore(name: string, delta: number): Promise<{ score: number }> {
  return post('/shop/score', { name, delta, client: getClientId() });
}
export function fetchShopRank(name: string): Promise<ShopRankBoard> {
  return req(`/shop/rank?name=${encodeURIComponent(name)}`);
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
/**
 * ACK 回执。`deleted`：应领项是否已全部置位（行已删）；`first`：本次是否**真正置位**（首次 ACK）。
 *
 * `first` 是双开标签页的双发闸（I-1）：两页共享同一存档、读到的待领清单相同，服务器只在
 * 0→1 的那次回 `first:true`（重复 ACK 改 0 行 → `first:false`）。客户端**只为 first=true
 * 的条目入账**——否则两页各入一次，就是双发钱/双入包。行已被对方删掉的幂等分支也回 `first:false`
 * （权益早被领走，本次只是补个回执）。
 */
export function ackOrder(id: string, who: string, side: 'poster' | 'maker', 项: '订金' | '尾款' | '成品' | '赔偿'): Promise<{ deleted: boolean; first: boolean }> {
  return post('/order/ack', { id, who, side, 项, client: getClientId() });
}
