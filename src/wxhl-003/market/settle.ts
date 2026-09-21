import type { MarketItemSnapshot } from './priceTable';

export type Bag = Record<string, MarketItemSnapshot & { 数量: number }>;

/** 上架扣减：数量不足或物品不存在抛错；返回新 bag（不改原对象） */
export function bagRemove(bag: Bag, name: string, qty: number): Bag {
  const cur = bag[name];
  if (!cur) throw new Error(`背包中没有「${name}」`);
  const left = Number(cur.数量) - qty;
  if (left < 0) throw new Error(`「${name}」数量不足：现有 ${cur.数量}，需要 ${qty}`);
  const next = { ...bag };
  if (left === 0) delete next[name];
  else next[name] = { ...cur, 数量: left };
  return next;
}

/** 购入/取回：同名合并数量，否则以快照整条入包 */
export function bagAdd(bag: Bag, snapshot: MarketItemSnapshot, qty: number): Bag {
  const name = snapshot.名称;
  const cur = bag[name];
  const next = { ...bag };
  next[name] = cur
    ? { ...cur, 数量: Number(cur.数量) + qty }
    : ({ ...snapshot, 数量: qty } as MarketItemSnapshot & { 数量: number });
  return next;
}

export function spendUP(up: number, price: number): number {
  if (up < price) throw new Error(`UP 不足：现有 ${up}，需要 ${price}`);
  return up - price;
}

export function gainUP(up: number, gained: number): number {
  return up + gained;
}
