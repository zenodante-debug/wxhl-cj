// src/wxhl-003/crafting/order/store.ts
// ================================================================
// 工坊订单 store：pinia 状态 + **本地结算**
//
// 钱是怎么走的（读懂这一句再看代码）：服务器只当中转与账本（订单行 + 按项 ACK 位），
// **UP 与物品全部在客户端结算** —— 发单人 spendUP 扣订金/尾款、接单者 gainUP 收订金/尾款、
// 成品在两边各自出入包。所以这里的每一个分支都要问两个问题：
//   ① 钱没到位时，会不会仍然把权益领走（= 凭空生钱）？
//   ② 钱到位了、权益却领不到（= 玩家白干）？
// 服务器侧四条裁定（Ruling G/I/L 等）堵的都是这两个方向，客户端这一层不得把它们重新打开。
//
// MVU 读写纪律（与 crafting/store.ts / market/store.ts 同一套）：
//   楼层探测 → _.set → replaceMvuData → 回读校验；**只写 `契约者.背包` 与 `契约者.经济.UP`**。
//   另：写入基底一律取**此刻**的新读值 —— 绝不用 await 之前的快照。建单/交付/验收都是网络往返，
//   期间市场那边可能刚卖出一件（写 背包 −物 / UP +货款）；拿旧快照写回去会把这笔整片覆盖（钱物凭空蒸发）。
// ================================================================
import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from '../../market/settle';
import type { MarketItemSnapshot } from '../../market/priceTable';
import {
  ackOrder, acceptOrder, confirmOrder, createOrder, deliverOrder,
  fetchHall, fetchMine, rejectOrder,
  type 订单, type 待领取,
} from './api';
import { 成品体积检查, type 需求单 } from './spec';

// —— MVU 三助手：与 crafting/store.ts 逐字一致（楼层探测 → _.set → replaceMvuData → 回读校验）——
function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

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

const 空待领: 待领取 = { deposit: 0, final: 0, items: [], 待领: [] };

export const useOrderStore = defineStore('wxhl003-order', () => {
  const hall = ref<订单[]>([]);
  const asPoster = ref<订单[]>([]);
  const asMaker = ref<订单[]>([]);
  const claim = ref<待领取>({ ...空待领 });
  const loading = ref(false);
  const busy = ref(false);          // 双击防护：所有写操作共用
  const lastError = ref('');
  const playerName = ref('无名契约者');

  /**
   * 取当前存档的姓名。**每个写动作的入口都要先过它**：
   * 姓名是服务器的当事人键（`poster`/`maker`/ACK 的 `who`）。拿一个陈旧的 `playerName.value`
   * 建单，单子会挂在一个不存在的名字下 —— 发单人再也看不到它、订金也永远领不回来（静默丢钱）；
   * 拿它发 ACK 则会被服务器按「不是当事人」400 掉。故姓名只从**此刻的存档**取。
   */
  function syncPlayer(): boolean {
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量（契约者不存在）'; return false; }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    return true;
  }

  async function refresh(): Promise<void> {
    if (!syncPlayer()) return;
    loading.value = true; lastError.value = '';
    try {
      const [h, m] = await Promise.all([fetchHall(playerName.value), fetchMine(playerName.value)]);
      hall.value = h; asPoster.value = m.asPoster; asMaker.value = m.asMaker; claim.value = m.claim;
    } catch (e: any) { lastError.value = e?.message || '订单服务连接失败'; }
    finally { loading.value = false; }
  }

  /** 发布：先本地验余额（不足即拒，零变量变动），再建单；建单失败则本地一分未扣，无需回滚 */
  async function publish(spec: 需求单, deposit: number, final: number): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const 当前UP = Number(r.c.经济?.UP ?? 0);
    // spendUP 抛错就是「余额不足」这道守卫本身：它抛在**任何写入与任何请求之前**，
    // 所以「拒绝」与「零变量变动」是同一件事的两面，不要在这里改成先写后校验。
    try { spendUP(当前UP, deposit); }
    catch (e: any) { lastError.value = e.message; toastr.error(lastError.value); return false; }

    busy.value = true; lastError.value = '';
    try {
      await createOrder({ poster: playerName.value, spec, deposit, final });
    } catch (e: any) {
      lastError.value = e?.message || '发布失败';
      toastr.error('发布失败: ' + lastError.value);
      return false;                      // 未写档，无需回滚
    } finally { busy.value = false; }

    // 建单是一个网络往返，期间存档可能被市场/工坊改过（卖出加 UP / 买货扣 UP）。
    // 扣款基准与写入基底一律取**此刻**的新读值：用 await 之前的快照写回去会把那段变动整片覆盖。
    const rr = readContractor() ?? r;
    let 余UP: number;
    try { 余UP = spendUP(Number(rr.c.经济?.UP ?? 0), deposit); }
    catch (e: any) {
      // 极小概率：这半个往返里余额被别处花掉了。单已在服务器上，客户端却扣不出订金——
      // 此时**一个数都不许写**（写下去就是无中生有的钱），如实报错让玩家去核对。
      lastError.value = `订单已建立，但订金未能扣除：${e.message}。请核对余额后再处理这张单`;
      toastr.error(lastError.value);
      return false;
    }
    _.set(rr.mvu, ['stat_data', '契约者', '经济', 'UP'], 余UP);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '经济', 'UP'], 余UP]]);
    toastr.success(`订单已发布（订金 ${deposit} UP 已托管）`);
    await refresh();
    return true;
  }

  async function accept(id: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    busy.value = true; lastError.value = '';
    try { await acceptOrder(id, playerName.value); toastr.success('接单成功，订金已到你名下'); await refresh(); return true; }
    catch (e: any) { lastError.value = e?.message || '接单失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }
  }

  /** 交付：从背包取出该物品并上传；体积超限在本地先拦（服务端会二次校验） */
  async function deliver(id: string, 物品名: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const 当前背包 = (r.c.背包 ?? {}) as Bag;
    const 物品 = 当前背包[物品名];
    if (!物品) { lastError.value = `背包里没有「${物品名}」`; toastr.error(lastError.value); return false; }
    // **数量必须是 1**：背包条目的 `数量` 是堆叠数，而交付出去的只是**一件**成品
    // （本地也只 bagRemove(…, 1)）。原样带上堆叠数上传，发单人领取时
    // `bagAdd(item, item.数量)` 会照数收下一整叠 —— 那是凭空复制出来的物品。
    const 快照 = { ...物品, 名称: 物品名, 数量: 1 } as MarketItemSnapshot;
    const 体积原因 = 成品体积检查(快照);
    if (体积原因) { lastError.value = 体积原因; toastr.error(体积原因); return false; }

    busy.value = true; lastError.value = '';
    try { await deliverOrder(id, playerName.value, 快照); }
    catch (e: any) { lastError.value = e?.message || '交付失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }

    // 写入基底取新读值（同 publish：上传期间市场可能刚卖掉它）
    const rr = readContractor() ?? r;
    let 新背包: Bag;
    try { 新背包 = bagRemove((rr.c.背包 ?? {}) as Bag, 物品名, 1); }
    catch (e: any) {
      // 上传已成功、物品却在这半个往返里从背包消失（被卖出/用掉）。本地无物可扣，就不写档，
      // 也不假报成功 —— 提醒玩家去核对，别把这张单当成已交付。
      lastError.value = `成品已上传，但背包里已没有「${物品名}」：${e.message}`;
      toastr.error(lastError.value);
      return false;
    }
    _.set(rr.mvu, ['stat_data', '契约者', '背包'], 新背包);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '背包'], 新背包]]);
    toastr.success('已交付，等待发单人验收');
    await refresh();
    return true;
  }

  /** 验收：先校验尾款（不足则禁用按钮 + 这里兜底），扣款后通知服务器 */
  async function confirm(id: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    const 单 = asPoster.value.find(o => o.id === id);
    if (!单) { lastError.value = '找不到该订单'; return false; }
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const 当前UP = Number(r.c.经济?.UP ?? 0);
    try { spendUP(当前UP, 单.final); }
    catch (e: any) { lastError.value = `尾款不足，无法验收：${e.message}`; toastr.error(lastError.value); return false; }

    busy.value = true; lastError.value = '';
    try { await confirmOrder(id, playerName.value); }
    catch (e: any) { lastError.value = e?.message || '验收失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }

    const rr = readContractor() ?? r;
    let 余UP: number;
    try { 余UP = spendUP(Number(rr.c.经济?.UP ?? 0), 单.final); }
    catch (e: any) {
      // 同 publish：服务器已置「已完成」，本地却扣不出尾款 —— 不写任何数，如实报错。
      lastError.value = `订单已验收，但尾款未能扣除：${e.message}。请核对余额后再处理这张单`;
      toastr.error(lastError.value);
      return false;
    }
    _.set(rr.mvu, ['stat_data', '契约者', '经济', 'UP'], 余UP);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '经济', 'UP'], 余UP]]);
    toastr.success(`验收完成，已支付尾款 ${单.final} UP`);
    await refresh();
    return true;
  }

  async function reject(id: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    busy.value = true; lastError.value = '';
    try { await rejectOrder(id, playerName.value); toastr.warning('已退货，订单取消（订金不退）'); await refresh(); return true; }
    catch (e: any) { lastError.value = e?.message || '退货失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }
  }

  /**
   * 领取全部待领物并逐项 ACK。
   *
   * **必须照服务器给的 `待领` 清单逐条 ACK** —— 不要遍历 `asPoster`/`asMaker` 对每张单每个项都 ACK：
   * 那会**提前置位尚不存在的权益**（如订单还在「已接单」就 ACK 尾款 → `maker_final_ack=1`），
   * 等该单真正完成时尾款**永久领不到**。这是 Ruling L 明确禁止的写法，`待领` 就是为它而生的。
   * （清单与汇总金额、`items` 在服务器上由同一个函数派生，故「有金额必有条目」，客户端无需自己核对。）
   *
   * 顺序：资金/物品先本地入账（**一次** commit），再逐条回执 —— 反过来先回执后入账，
   * 一旦入账失败，权益位已置而钱没到手，那是玩家永久白干（「丢失不可救」）。
   */
  async function claimAll(): Promise<void> {
    if (busy.value) return;
    if (!syncPlayer()) return;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return; }
    const c = claim.value;
    // 形状不对（旧服务器没这个字段/数据被改坏）：fail-closed —— 不领、不回执，别拿汇总数字硬凑
    if (!c || !Array.isArray(c.待领)) {
      lastError.value = '待领取数据异常（缺少 待领 清单），请刷新后重试';
      toastr.error(lastError.value);
      return;
    }
    if (c.待领.length === 0) return;

    let 回执失败 = 0;
    let 出错 = '';
    busy.value = true; lastError.value = '';
    try {
      // ① 资金：订金与尾款都是「我收到钱」（注：退货时 `项='尾款'` 指的是退回的**成品**，
      //    它不计入 `final` —— 服务器已把两者分开，故此处只管 `deposit + final`）
      const 进账 = Number(c.deposit ?? 0) + Number(c.final ?? 0);
      const 新UP = 进账 > 0 ? gainUP(Number(r.c.经济?.UP ?? 0), 进账) : Number(r.c.经济?.UP ?? 0);
      // ② 物品：逐件入包（`items` 是 `{id, item}[]`）
      let 新背包 = (r.c.背包 ?? {}) as Bag;
      for (const { item } of c.items ?? []) {
        const 名 = String((item as any)?.名称 ?? '');
        if (!名) throw new Error('待领成品缺少名称');
        新背包 = bagAdd(新背包, item, Number((item as any).数量 ?? 1));
      }
      // 资金与物品**一次落档**：分两次写的话，第二次失败就变成「钱已入账、物品没进包」，
      // 而回执还没发 → 下次刷新这笔待领会再领一遍（重复发钱）。一次写就没有这个中间态。
      const checks: [string[], unknown][] = [];
      if (进账 > 0) {
        _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], 新UP);
        checks.push([['stat_data', '契约者', '经济', 'UP'], 新UP]);
      }
      if ((c.items ?? []).length > 0) {
        _.set(r.mvu, ['stat_data', '契约者', '背包'], 新背包);
        checks.push([['stat_data', '契约者', '背包'], 新背包]);
      }
      if (checks.length > 0) await commit(r.mvu, r.mid, checks);

      // ③ 照单 ACK（side 由 `项` 唯一决定：成品归发单人，订金/尾款归接单者）
      for (const t of c.待领) {
        const side = t.项 === '成品' ? 'poster' : 'maker';
        try { await ackOrder(t.id, playerName.value, side, t.项); }
        catch (_) { 回执失败++; }          // 幂等：位已置/行已删服务器都返回 ok，真失败只能下次再试
      }
      toastr.success(`已领取：${进账} UP${(c.items ?? []).length ? ` + ${c.items.length} 件物品` : ''}`);
    } catch (e: any) {
      出错 = e?.message || '领取失败';
      toastr.error(出错);
    } finally { busy.value = false; }
    // 刷新放在**报警之前**：refresh 会清 lastError（顶部常驻错误条），先报后刷等于没报。
    await refresh();
    if (出错) lastError.value = 出错;   // 入账失败（如 Mvu 写不进去）：常驻错误条上留得住
    if (回执失败 > 0) {
      // 钱/物已入账、回执没送到：刷新后这些项还会出现在「待领取」里。
      // 明说「已入账、别重复领」—— 否则玩家会再领一遍，那就真的重复发钱。
      lastError.value = `有 ${回执失败} 项领取回执未能送达服务器；本地已入账，请勿重复领取`;
      toastr.warning(lastError.value);
    }
  }

  return { hall, asPoster, asMaker, claim, loading, busy, lastError, playerName,
           refresh, publish, accept, deliver, confirm, reject, claimAll };
});
