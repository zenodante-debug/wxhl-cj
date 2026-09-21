import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from './settle';
import {
  buyListing,
  cancelListing,
  collectProceeds,
  createListing,
  fetchListings,
  fetchMine,
  type Listing,
} from './api';
import type { MarketItemSnapshot } from './priceTable';

// ================================================================
// 无限回廊 · 自由市场 store
// 结算顺序原则：本地能先校验的先校验（余额/数量），服务器失败一律回滚本地；
// Mvu 读写严格照 store.ts writeToSave 模式（楼层探测 → _.set → replaceMvuData → 回读校验）。
// ================================================================

/** 楼层探测：全局脚本 iframe 无楼层上下文时回退最新楼层（与 store.ts 一致） */
function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

/** 读 stat_data.契约者；读不到返回 null */
function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    const c = _.get(mvu, ['stat_data', '契约者']);
    return c ? { mvu, c, mid } : null;
  } catch (_) {
    return null;
  }
}

/** 落档 + 回读校验：回读不上 = 已写但未核对（照 writeToSave 惯例警告，不视为失败） */
async function commit(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> {
  await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
  const after = Mvu.getMvuData({ type: 'message', message_id: mid });
  for (const [path, expectVal] of checks) {
    const got = _.get(after, path);
    if (expectVal === undefined ? got !== undefined : !_.isEqual(got, expectVal)) {
      toastr.warning('变量已写入但回读核对不上: ' + path.join('.'));
    }
  }
}

export const useMarketStore = defineStore('wxhl003-market', () => {
  const listings = ref<Listing[]>([]);
  const myListings = ref<Listing[]>([]);
  const pending = ref(0);
  const loading = ref(false);
  const lastError = ref('');

  const playerName = ref('无名契约者');
  const playerTier = ref('一阶');
  const playerUP = ref(0);
  const playerBag = ref<Bag>({});

  function syncFromMvu(): boolean {
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量（契约者不存在）';
      return false;
    }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    playerTier.value = String(r.c.头部?.阶位 ?? '一阶');
    playerUP.value = Number(r.c.经济?.UP ?? 0);
    playerBag.value = (r.c.背包 ?? {}) as Bag;
    return true;
  }

  async function refresh() {
    loading.value = true;
    lastError.value = '';
    try {
      syncFromMvu();
      const [all, mine] = await Promise.all([fetchListings(), fetchMine()]);
      listings.value = [...all].reverse(); // key 升序 = 旧→新，界面最新在前
      myListings.value = mine.listings;
      pending.value = mine.pending;
    } catch (e: any) {
      lastError.value = e?.message || '市场连接失败';
    } finally {
      loading.value = false;
    }
  }

  /** 上架：先本地扣背包 → 服务器登记；服务器失败则把物品加回去 */
  async function sell(name: string, snapshot: MarketItemSnapshot, kind: 'equip' | 'goods', qty: number, price: number): Promise<boolean> {
    lastError.value = '';
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量';
      return false;
    }
    const oldBag = (r.c.背包 ?? {}) as Bag;
    const oldQty = Number(oldBag[name]?.数量 ?? 0);
    let newBag: Bag;
    try {
      newBag = bagRemove(oldBag, name, qty);
    } catch (e: any) {
      lastError.value = e.message;
      toastr.error(e.message);
      return false;
    }
    _.set(r.mvu, ['stat_data', '契约者', '背包'], newBag);
    await commit(r.mvu, r.mid, [
      [['stat_data', '契约者', '背包', name, '数量'], oldQty - qty > 0 ? oldQty - qty : undefined],
    ]);
    try {
      await createListing({
        seller: playerName.value,
        tier: playerTier.value,
        kind,
        item: { ...snapshot, 名称: name, 数量: qty },
        qty,
        price,
      });
    } catch (e: any) {
      // 回滚：把物品加回去
      const rb = readContractor();
      if (rb) {
        _.set(rb.mvu, ['stat_data', '契约者', '背包'], bagAdd((rb.c.背包 ?? {}) as Bag, { ...snapshot, 名称: name }, qty));
        await commit(rb.mvu, rb.mid, []);
      }
      lastError.value = e?.message || '上架被拒绝';
      toastr.error('上架失败: ' + lastError.value);
      return false;
    }
    toastr.success(`「${name}」×${qty} 已上架`);
    await refresh();
    return true;
  }

  /** 购买：本地先校验余额（不足则不动服务器）→ 服务器销账 → 本地扣 UP 入包 */
  async function buy(l: Listing): Promise<boolean> {
    lastError.value = '';
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量';
      return false;
    }
    const up = Number(r.c.经济?.UP ?? 0);
    try {
      spendUP(up, l.price);
    } catch (e: any) {
      lastError.value = e.message;
      toastr.error(e.message);
      return false;
    }
    try {
      await buyListing(l.id, playerName.value);
    } catch (e: any) {
      lastError.value = e?.message || '购买失败';
      toastr.error('购买失败: ' + lastError.value);
      return false;
    }
    _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], up - l.price);
    _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, l.qty));
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], up - l.price]]);
    toastr.success(`购得「${l.item.名称}」×${l.qty}`);
    await refresh();
    return true;
  }

  /** 下架：先服务器删单 → 本地回包（本地写失败只警告，物品实质在服务器侧已核销） */
  async function cancel(l: Listing): Promise<boolean> {
    lastError.value = '';
    try {
      await cancelListing(l.id);
    } catch (e: any) {
      lastError.value = e?.message || '下架失败';
      toastr.error(lastError.value);
      return false;
    }
    const r = readContractor();
    if (r) {
      _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, l.qty));
      await commit(r.mvu, r.mid, []);
    }
    toastr.success(`「${l.item.名称}」已取回`);
    await refresh();
    return true;
  }

  /** 领取货款：先服务器清零 → 本地加 UP */
  async function collect(): Promise<boolean> {
    lastError.value = '';
    let gained = 0;
    try {
      gained = await collectProceeds();
    } catch (e: any) {
      lastError.value = e?.message || '领取失败';
      toastr.error(lastError.value);
      return false;
    }
    if (gained <= 0) {
      toastr.info('没有待领货款');
      return true;
    }
    const r = readContractor();
    if (r) {
      const up = Number(r.c.经济?.UP ?? 0);
      _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], gainUP(up, gained));
      await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], up + gained]]);
    }
    toastr.success(`领取货款 ${gained} UP`);
    await refresh();
    return true;
  }

  return {
    listings,
    myListings,
    pending,
    loading,
    lastError,
    playerName,
    playerTier,
    playerUP,
    playerBag,
    refresh,
    sell,
    buy,
    cancel,
    collect,
  };
});
