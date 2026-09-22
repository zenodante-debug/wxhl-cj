import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from './settle';
import {
  buyListing,
  cancelListing,
  collectProceeds,
  createListing,
  fetchListings,
  fetchMine,
  totalPrice,
  type Listing,
} from './api';
import type { MarketItemSnapshot } from './priceTable';
import {
  buildReviewPrompt,
  getCachedReview,
  REVIEW_SCHEMA,
  reviewVerdicts,
  setCachedReview,
  type ReviewTarget,
  type ReviewVerdict,
} from './aiReview';
import { aiGenerate, extractJSON, getActiveCfg, useForumStore } from '../store';

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
  /** 跨 app 联动：其他 app（如工坊）要求市场打开并预选上架物品时写入物品名 */
  const pendingSell = ref('');
  const loading = ref(false);
  const lastError = ref('');
  /** 上架 AI 审核进行中（前端审核，用卖家终端设置里配置的 API） */
  const reviewing = ref(false);
  /** 双击防护：结算进行中标志（购买/上架/下架/领取各自独立） */
  const purchasing = ref(false);
  const listing = ref(false);
  const collecting = ref(false);

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

  /**
   * 上架前 AI 审核（两道：规则/效果合规 + 红线），支持批量——多选上架只花一次 API。
   * 已审过的物品走会话级缓存（改价/改数量不重审，改内容才重审）。
   * fail-closed：未配置 API、调用失败、格式异常、有物品未被审到 → 抛错，由 sellBatch 拒绝上架。
   */
  async function aiReviewItems(targets: ReviewTarget[]): Promise<Map<string, ReviewVerdict>> {
    const out = new Map<string, ReviewVerdict>();
    const todo: ReviewTarget[] = [];
    for (const t of targets) {
      const cached = getCachedReview(t.item);
      if (cached) out.set(t.item.名称, cached);
      else todo.push(t);
    }
    if (todo.length === 0) return out;

    const cfg = getActiveCfg(useForumStore().settings);
    if (!cfg.url || !cfg.apiKey) {
      throw new Error('上架需通过回廊 AI 审核——请先在「终端设置」中配置 API');
    }
    reviewing.value = true;
    try {
      const raw = await aiGenerate(cfg, buildReviewPrompt(todo), {
        name: REVIEW_SCHEMA.name,
        value: REVIEW_SCHEMA.value as unknown as Record<string, any>,
      });
      const fresh = reviewVerdicts(
        extractJSON(raw),
        todo.map(t => t.item.名称),
      );
      for (const t of todo) {
        const v = fresh.get(t.item.名称)!;
        setCachedReview(t.item, v);
        out.set(t.item.名称, v);
      }
      return out;
    } finally {
      reviewing.value = false;
    }
  }

  /**
   * 单件上架（sellBatch 的薄封装）：AI 审核通过 → 本地扣背包 → 服务器登记。
   * 双击防护：结算进行中(listing)直接忽略重复调用。
   */
  async function sell(name: string, snapshot: MarketItemSnapshot, kind: 'equip' | 'goods', qty: number, price: number): Promise<boolean> {
    const ok = await sellBatch([{ name, snapshot, kind, qty, price }]);
    return ok;
  }

  /**
   * 批量上架：一次 AI 审核覆盖所有待上架物品，再逐件本地扣背包 + 服务器登记。
   * 单价为 0 的条目按「未定价」跳过。任一环节失败只回滚该件，已成功的保留。
   */
  async function sellBatch(
    entries: { name: string; snapshot: MarketItemSnapshot; kind: 'equip' | 'goods'; qty: number; price: number }[],
  ): Promise<boolean> {
    if (listing.value) return false; // 双击防护
    lastError.value = '';
    const todo = entries.filter(e => Number(e.price) > 0);
    if (todo.length === 0) {
      lastError.value = '请先为要上架的物品填写单价';
      toastr.warning(lastError.value);
      return false;
    }

    // ① 先只读校验每件数量，任何一件不合法就整体不上架
    const r0 = readContractor();
    if (!r0) {
      lastError.value = '读不到存档变量';
      return false;
    }
    const bag0 = (r0.c.背包 ?? {}) as Bag;
    for (const e of todo) {
      const have = Number(bag0[e.name]?.数量 ?? 0);
      if (!Number.isInteger(e.qty) || e.qty < 1 || e.qty > have) {
        lastError.value = `「${e.name}」数量不合法：现有 ${have}，拟上架 ${e.qty}`;
        toastr.error(lastError.value);
        return false;
      }
    }

    // ② AI 审核（一次调用覆盖全部；fail-closed：本地背包分毫未动）
    listing.value = true;
    let verdicts: Map<string, ReviewVerdict>;
    try {
      verdicts = await aiReviewItems(
        todo.map(e => ({ item: { ...e.snapshot, 名称: e.name, 数量: e.qty }, kind: e.kind })),
      );
    } catch (e: any) {
      listing.value = false;
      lastError.value = e?.message || 'AI 审核失败';
      toastr.error('上架被拒: ' + lastError.value);
      return false;
    }

    const failed: string[] = [];
    const rejected: string[] = [];
    try {
      for (const e of todo) {
        const v = verdicts.get(e.name);
        if (!v?.pass) {
          rejected.push(`「${e.name}」：${(v?.reasons ?? ['未通过审核']).join('；')}`);
          continue;
        }
        // ③ 本地扣背包
        const r = readContractor();
        if (!r) {
          failed.push(`「${e.name}」读不到存档变量`);
          continue;
        }
        const bag = (r.c.背包 ?? {}) as Bag;
        let newBag: Bag;
        try {
          newBag = bagRemove(bag, e.name, e.qty);
        } catch (err: any) {
          failed.push(`「${e.name}」${err.message}`);
          continue;
        }
        _.set(r.mvu, ['stat_data', '契约者', '背包'], newBag);
        await commit(r.mvu, r.mid, []);
        // ④ 服务器登记；失败则把该件加回背包
        try {
          await createListing({
            seller: playerName.value,
            tier: playerTier.value,
            kind: e.kind,
            item: { ...e.snapshot, 名称: e.name, 数量: e.qty },
            qty: e.qty,
            price: e.price,
          });
        } catch (err: any) {
          const rb = readContractor();
          if (rb) {
            _.set(rb.mvu, ['stat_data', '契约者', '背包'], bagAdd((rb.c.背包 ?? {}) as Bag, { ...e.snapshot, 名称: e.name }, e.qty));
            await commit(rb.mvu, rb.mid, []);
          }
          failed.push(`「${e.name}」${err?.message || '服务器拒绝'}`);
        }
      }
    } finally {
      listing.value = false;
    }

    const okCount = todo.length - failed.length - rejected.length;
    if (okCount > 0) toastr.success(`已上架 ${okCount} 件`);
    if (rejected.length > 0) {
      lastError.value = rejected.join('\n');
      toastr.error(`AI 审核驳回 ${rejected.length} 件：\n` + rejected.join('\n'));
    }
    if (failed.length > 0) {
      lastError.value = failed.join('\n');
      toastr.error(`上架失败 ${failed.length} 件：\n` + failed.join('\n'));
    }
    await refresh();
    return okCount > 0;
  }

  /** 购买：本地先校验余额（不足则不动服务器）→ 服务器销账 → 本地扣 UP 入包。双击防护：结算中直接忽略 */
  async function buy(l: Listing): Promise<boolean> {
    if (purchasing.value) return false; // 双击防护：防止一次支付 N 份钱只买一件
    purchasing.value = true;
    try {
      return await doBuy(l);
    } finally {
      purchasing.value = false;
    }
  }

  async function doBuy(l: Listing): Promise<boolean> {
    lastError.value = '';
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量';
      return false;
    }
    const total = totalPrice(l); // 总价 = 单价 × 数量
    const up = Number(r.c.经济?.UP ?? 0);
    try {
      spendUP(up, total);
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
    _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], up - total);
    _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, l.qty));
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], up - total]]);
    toastr.success(`购得「${l.item.名称}」×${l.qty}，支付 ${total} UP`);
    await refresh();
    return true;
  }

  /**
   * 下架取回。双击防护 + 「前世记忆」提醒：
   * 挂单归属客户端标识（localStorage，不随存档变），换新存档后仍能取回旧存档挂的单——
   * 这是玩家自己的东西（不阻止），但弹窗说明来源，避免"凭空多出物品"。
   */
  async function cancel(l: Listing): Promise<boolean> {
    if (listing.value) return false; // 双击防护
    listing.value = true;
    try {
      return await doCancel(l);
    } finally {
      listing.value = false;
    }
  }

  async function doCancel(l: Listing): Promise<boolean> {
    lastError.value = '';
    // 卖家名与当前存档不符 → 大概率是上一世（旧存档）挂的单
    const 前世 = l.seller && playerName.value && l.seller !== playerName.value;
    if (前世) {
      const ok = window.confirm(
        `「${l.item.名称}」的挂单来自「${l.seller}」，与你当前存档的契约者「${playerName.value}」不同。\n\n` +
          `确认这是你上一世（旧存档）挂的单并取回吗？（物品会进入当前存档的背包）`,
      );
      if (!ok) return false;
    }
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
    toastr.success(`「${l.item.名称}」已取回${前世 ? '（来自旧存档）' : ''}`);
    await refresh();
    return true;
  }

  /**
   * 领取货款。双击防护 + 「前世记忆」提醒：
   * 货款按客户端标识挂账，换新存档后旧存档的货款仍可领进当前存档。
   * 登录前无法知道挂账来自哪一世（KV 里只存金额），因此只在有待领货款时提醒一次来源不明。
   */
  async function collect(): Promise<boolean> {
    if (collecting.value) return false; // 双击防护
    collecting.value = true;
    try {
      return await doCollect();
    } finally {
      collecting.value = false;
    }
  }

  async function doCollect(): Promise<boolean> {
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
    const ok = window.confirm(
      `待领货款 ${gained} UP 将进入当前存档。\n\n` +
        `注意：货款按你的终端标识挂账，若其中包含上一世（旧存档）卖出的货款，也会一并领入当前存档。\n继续领取？`,
    );
    if (!ok) return false;
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
    pendingSell,
    loading,
    reviewing,
    purchasing,
    listing,
    collecting,
    lastError,
    playerName,
    playerTier,
    playerUP,
    playerBag,
    refresh,
    sell,
    sellBatch,
    buy,
    cancel,
    collect,
  };
});
