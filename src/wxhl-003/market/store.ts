import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from './settle';
import { buyTotals, clampQty } from './buyQty';
import {
  buyListing,
  cancelListing,
  collectProceeds,
  createListing,
  fetchListings,
  fetchMine,
  fetchSales,
  type Listing,
  type SaleRecord,
} from './api';
import { classify, type MarketItemSnapshot } from './priceTable';
import {
  buildReviewPrompt,
  getCachedReview,
  REVIEW_SCHEMA,
  reviewVerdicts,
  setCachedReview,
  type ReviewTarget,
  type ReviewVerdict,
} from './aiReview';
import { assessDeterministic, baseUpOf, nominalIdxOf, opFeeFor, realTierName } from './fee';
import { useMarketNotices } from './notify';
import { pushSyslog } from '../syslog';
import { aiGenerate, extractJSON, getActiveCfg, useForumStore } from '../store';

// ================================================================
// 无由回廊 · 自由市场 store
// 结算顺序原则：本地能先校验的先校验（余额/数量），服务器失败一律回滚本地；
// Mvu 读写严格照 store.ts writeToSave 模式（楼层探测 → _.set → replaceMvuData → 回读校验）。
// 上架为两阶段：prepareSell（AI 审核+算税/超模费，不碰变量）→ 用户确认 → commitSell（执行+扣费）。
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

// ==================== 上架两阶段的数据结构 ====================

export interface SellPrepItem {
  name: string;
  snapshot: MarketItemSnapshot;
  kind: 'equip' | 'goods';
  qty: number;
  price: number;
  /** false = 红线/结构被拒，不可上架 */
  ok: boolean;
  reasons: string[];
  /** 上架税 = ceil(总价×20%)，0 元单免税 */
  tax: number;
  /** 超模费（效果真实阶位高于名义阶位时） */
  op: { realTier: string; realIdx: number; rp: number; up: number; points: string[] } | null;
  /** 传给服务器的超模声明 */
  opField?: { tier: string; rp: number; up: number };
}

export interface SellPrep {
  items: SellPrepItem[];
  listable: SellPrepItem[];
  totalTax: number;
  totalOpUp: number;
  totalOpRp: number;
  /** 需支付的 UP = 税 + 超模 UP 费 */
  upNeeded: number;
  /** 需支付的 RP = 超模 RP 费 */
  rpNeeded: number;
  upHave: number;
  rpHave: number;
  affordable: boolean;
}

export const useMarketStore = defineStore('wxhl003-market', () => {
  const listings = ref<Listing[]>([]);
  const myListings = ref<Listing[]>([]);
  const sales = ref<SaleRecord[]>([]);
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
  const playerRP = ref(0);
  const playerBag = ref<Bag>({});

  const noticesApi = useMarketNotices();
  const unread = computed(() => noticesApi.notices.value.filter(n => !n.read).length);

  function syncFromMvu(): boolean {
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量（契约者不存在）';
      return false;
    }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    playerTier.value = String(r.c.头部?.阶位 ?? '一阶');
    playerUP.value = Number(r.c.经济?.UP ?? 0);
    playerRP.value = Number(r.c.头部?.RP_当前 ?? 0);
    playerBag.value = (r.c.背包 ?? {}) as Bag;
    return true;
  }

  async function refresh() {
    loading.value = true;
    lastError.value = '';
    try {
      syncFromMvu();
      const [all, mine, sold] = await Promise.all([fetchListings(), fetchMine(), fetchSales().catch(() => [] as SaleRecord[])]);
      listings.value = [...all].reverse(); // 服务器按时间倒序，界面最新在前
      myListings.value = mine.listings;
      pending.value = mine.pending;
      sales.value = sold;
    } catch (e: any) {
      lastError.value = e?.message || '市场连接失败';
    } finally {
      loading.value = false;
    }
  }

  /**
   * 上架前 AI 审核（规则/真实阶位判定 + 红线），支持批量——多选上架只花一次 API。
   * 已审过的物品走会话级缓存（改价/改数量不重审，改内容才重审）。
   * fail-closed：未配置 API、调用失败、格式异常、有物品未被审到 → 抛错，由 prepareSell 拒绝上架。
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

  // ==================== 上架：两阶段（prepare 算费 → 用户确认 → commit 扣费执行） ====================

  /**
   * 阶段一：AI 审核 + 确定性超模反查 + 计算税费。不碰任何变量、不发任何挂单。
   * 红线命中 → ok=false（拒绝，不可收费放行）；超模 → 附费用明细，等用户确认。
   * 同时向小手机通知中心写入 超模提醒/上架被拒。
   */
  async function prepareSell(
    entries: { name: string; snapshot: MarketItemSnapshot; kind: 'equip' | 'goods'; qty: number; price: number }[],
  ): Promise<SellPrep> {
    lastError.value = '';
    const r0 = readContractor();
    if (!r0) throw new Error('读不到存档变量');
    const bag0 = (r0.c.背包 ?? {}) as Bag;
    const upHave = Number(r0.c.经济?.UP ?? 0);
    const rpHave = Number(r0.c.头部?.RP_当前 ?? 0);
    const { add } = noticesApi;

    // ① 数量与名义阶位（只读校验）
    const nominalById = new Map<string, number>();
    const items: SellPrepItem[] = [];
    for (const e of entries) {
      const have = Number(bag0[e.name]?.数量 ?? 0);
      if (!Number.isInteger(e.qty) || e.qty < 1 || e.qty > have) {
        items.push({ name: e.name, snapshot: e.snapshot, kind: e.kind, qty: e.qty, price: Number(e.price), ok: false, reasons: [`数量不合法：现有 ${have}，拟上架 ${e.qty}`], tax: 0, op: null });
        continue;
      }
      const nominal = nominalIdxOf({ ...e.snapshot, 阶位: e.snapshot.阶位 }, playerTier.value);
      if (nominal === null) {
        items.push({ name: e.name, snapshot: e.snapshot, kind: e.kind, qty: e.qty, price: Number(e.price), ok: false, reasons: ['名义阶位无法识别（阶位写法不合规）'], tax: 0, op: null });
        continue;
      }
      nominalById.set(e.name, nominal);
      items.push({ name: e.name, snapshot: e.snapshot, kind: e.kind, qty: e.qty, price: Number(e.price), ok: true, reasons: [], tax: 0, op: null });
    }

    // ② AI 批量审核（一次调用覆盖全部）
    const toReview = items.filter(i => i.ok);
    let verdicts = new Map<string, ReviewVerdict>();
    if (toReview.length > 0) {
      verdicts = await aiReviewItems(
        toReview.map(i => ({
          item: { ...i.snapshot, 名称: i.name, 数量: i.qty },
          kind: i.kind,
          nominalIdx: nominalById.get(i.name) ?? 0,
        })),
      );
    }

    // ③ 逐项：红线拒绝 / 确定性超模反查 + AI 真实阶位（取较高者）→ 费用
    for (const item of items) {
      if (!item.ok) continue;
      const v = verdicts.get(item.name);
      if (!v) {
        item.ok = false;
        item.reasons = ['未通过审核'];
        continue;
      }
      if (!v.pass) {
        item.ok = false;
        item.reasons = v.reasons;
        add('上架被拒', `「${item.name}」：${item.reasons.join('；')}`);
        continue;
      }
      const nominal = nominalById.get(item.name) ?? 0;
      const points = [...v.opPoints];
      // 真实阶位合并规则（2026-09-24 修复）：
      //   有数值信号（属性加成/防闪）时，数值反查是硬事实，AI 语义判定不能超出它
      //   ——否则「主属性加成+5」这类纯数字会被模型误判成超脱；
      //   无数值信号（纯效果文本）时，完全听 AI 的语义判定。
      let realIdx = v.realIdx ?? nominal;
      if (item.kind === 'equip') {
        const cls = classify({ ...item.snapshot, 名称: item.name });
        if (cls.kind === 'equip') {
          const det = assessDeterministic({ ...item.snapshot, 名称: item.name }, cls, nominal);
          if (det) {
            realIdx = Math.max(realIdx, det.realIdx); // 数值层下界（防 AI 放水）
            realIdx = Math.min(realIdx, det.realIdx); // 数值层上界（防 AI 误判夸大）
            points.push(...det.points);
          }
        }
      }
      const fee = opFeeFor(nominal, realIdx, baseUpOf(item.kind, item.snapshot, item.kind === 'equip' ? (classify({ ...item.snapshot, 名称: item.name }) as { category?: string }).category ?? null : null));
      // 上架税：总价（数量×单价）的 20%，0 元单免税
      item.tax = Math.ceil(item.qty * item.price * 0.2);
      if (fee) {
        const transFee = fee.realIdx === 5;
        item.op = { realTier: realTierName(fee.realIdx), realIdx: fee.realIdx, rp: fee.rp, up: fee.up, points };
        item.opField = { tier: realTierName(fee.realIdx), rp: fee.rp, up: fee.up };
        add(
          transFee ? '超脱上架费' : '超模提醒',
          `「${item.name}」效果达到「${realTierName(fee.realIdx)}」规格，上架需支付 RP ${fee.rp} + UP ${fee.up}${transFee ? '（含超脱上架费 20 RP + 超脱基准价×50% UP）' : ''}。\n${points.join('\n')}`,
        );
      }
    }

    const listable = items.filter(i => i.ok);
    const totalTax = listable.reduce((s, i) => s + i.tax, 0);
    const totalOpUp = listable.reduce((s, i) => s + (i.op?.up ?? 0), 0);
    const totalOpRp = listable.reduce((s, i) => s + (i.op?.rp ?? 0), 0);
    const upNeeded = totalTax + totalOpUp;
    const rpNeeded = totalOpRp;
    return {
      items,
      listable,
      totalTax,
      totalOpUp,
      totalOpRp,
      upNeeded,
      rpNeeded,
      upHave,
      rpHave,
      affordable: upHave >= upNeeded && rpHave >= rpNeeded,
    };
  }

  /**
   * 阶段二：用户确认费用后执行——逐件扣背包 + 服务器登记（含超模声明），
   * 成功件一次性扣 上架税 + 超模费（UP/RP 自动从存档变量扣除，回读校验）。
   * 任一件服务器失败只回滚该件，该件的费用不计。
   */
  async function commitSell(prep: SellPrep): Promise<boolean> {
    if (listing.value) return false; // 双击防护
    if (prep.listable.length === 0) return false;
    listing.value = true;
    const failed: string[] = [];
    const succeeded: SellPrepItem[] = [];
    const { add } = noticesApi;
    try {
      for (const e of prep.listable) {
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
        try {
          await createListing({
            seller: playerName.value,
            tier: playerTier.value,
            kind: e.kind,
            item: { ...e.snapshot, 名称: e.name, 数量: e.qty },
            qty: e.qty,
            price: e.price,
            op: e.opField,
          });
          succeeded.push(e);
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

    // 费用结算：只对成功上架的件收取（税 + 超模费），一次性扣
    const feeUp = succeeded.reduce((s, i) => s + i.tax + (i.op?.up ?? 0), 0);
    const feeRp = succeeded.reduce((s, i) => s + (i.op?.rp ?? 0), 0);
    if (feeUp > 0 || feeRp > 0) {
      const r = readContractor();
      if (r) {
        const up = Number(r.c.经济?.UP ?? 0);
        const rp = Number(r.c.头部?.RP_当前 ?? 0);
        if (up < feeUp || rp < feeRp) {
          toastr.error(`费用结算异常：UP/RP 余额不足（需 UP ${feeUp} / RP ${feeRp}）。挂单已生效，请尽快补缴。`);
          add('费用结算异常', `UP/RP 余额不足（需 UP ${feeUp} / RP ${feeRp}），挂单已生效请补缴。`);
        } else {
          _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], up - feeUp);
          _.set(r.mvu, ['stat_data', '契约者', '头部', 'RP_当前'], rp - feeRp);
          await commit(r.mvu, r.mid, [
            [['stat_data', '契约者', '经济', 'UP'], up - feeUp],
            [['stat_data', '契约者', '头部', 'RP_当前'], rp - feeRp],
          ]);
        }
      }
    }

    // 系统日志（#5）：逐件记一笔成功上架，让 AI 知道这些物品离开背包、挂进了市场。
    // 独立一次落档（费用结算只在有费时落档，0 费单也要留痕），只记成功件、与费用结算互不干扰。
    if (succeeded.length > 0) {
      const r = readContractor();
      if (r) {
        for (const e of succeeded) {
          pushSyslog(r.mvu, `你在自由市场上架了「${e.name}」×${e.qty}，单价 ${e.price} UP`);
        }
        await commit(r.mvu, r.mid, []);
      }
    }

    if (succeeded.length > 0) {
      const feeLine = feeUp > 0 || feeRp > 0 ? `，支付税费/超模费 UP ${feeUp}${feeRp > 0 ? ` + RP ${feeRp}` : ''}` : '';
      toastr.success(`已上架 ${succeeded.length} 件${feeLine}`);
      add('上架成功', `已上架 ${succeeded.length} 件：${succeeded.map(i => `「${i.name}」`).join('、')}${feeLine}。`);
    }
    if (failed.length > 0) {
      lastError.value = failed.join('\n');
      toastr.error(`上架失败 ${failed.length} 件：\n` + failed.join('\n'));
      add('上架失败', failed.join('\n'));
    }
    await refresh();
    return succeeded.length > 0;
  }

  // ==================== 购买（支持部分购买，含 10% 手续费） ====================

  /** 购买：本地先校验余额（含手续费，不足则不动服务器）→ 服务器按 qty 销账 → 本地扣 UP 入包。双击防护 */
  async function buy(l: Listing, qty: number): Promise<boolean> {
    if (purchasing.value) return false;
    purchasing.value = true;
    try {
      return await doBuy(l, qty);
    } finally {
      purchasing.value = false;
    }
  }

  async function doBuy(l: Listing, qty: number): Promise<boolean> {
    lastError.value = '';
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量';
      return false;
    }
    // 再夹一次：服务器也会夹，但金额必须按**实际会买到的数量**算，不能按界面上可能残留的值
    const 买 = clampQty(qty, l.qty);
    const { fee, pay } = buyTotals(l.price, 买);
    const up = Number(r.c.经济?.UP ?? 0);
    try {
      spendUP(up, pay);
    } catch (e: any) {
      lastError.value = e.message;
      toastr.error(e.message);
      return false;
    }
    try {
      await buyListing(l.id, playerName.value, 买);
    } catch (e: any) {
      lastError.value = e?.message || '购买失败';
      toastr.error('购买失败: ' + lastError.value);
      return false;
    }
    _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], up - pay);
    _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, 买));
    // 系统日志（#5）：与本次扣费入包同一事务落档，AI 由此知道背包里这件东西的来源
    pushSyslog(r.mvu, `你在自由市场购买了「${l.item.名称}」×${买}，实付 ${pay} UP`);
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], up - pay]]);
    toastr.success(`购得「${l.item.名称}」×${买}，实付 ${pay} UP（含手续费 ${fee}）`);
    await refresh();
    return true;
  }

  // ==================== 下架 / 领取 ====================

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
    // 取回数量以**服务端此刻的剩余**为准：部分成交后本地缓存那份 qty 是陈旧的，
    // 按它加回背包会让卖家多拿回物品。
    let returned = 0;
    try {
      returned = (await cancelListing(l.id)).returned;
    } catch (e: any) {
      lastError.value = e?.message || '下架失败';
      toastr.error(lastError.value);
      return false;
    }
    const r = readContractor();
    if (r) {
      _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, returned));
      await commit(r.mvu, r.mid, []);
    }
    toastr.success(`「${l.item.名称}」已取回 ×${returned}${前世 ? '（来自旧存档）' : ''}`);
    await refresh();
    return true;
  }

  /**
   * 领取货款。双击防护 + 「前世记忆」提醒：
   * 货款按客户端标识挂账，换新存档后旧存档的货款仍可领进当前存档。
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
    sales,
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
    playerRP,
    playerBag,
    notices: noticesApi.notices,
    unread,
    markAllRead: noticesApi.markAllRead,
    refresh,
    prepareSell,
    commitSell,
    buy,
    cancel,
    collect,
  };
});
