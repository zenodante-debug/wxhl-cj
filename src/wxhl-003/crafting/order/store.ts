// src/wxhl-003/crafting/order/store.ts
// ================================================================
// 工坊订单 store：pinia 状态 + **本地结算**
//
// 钱是怎么走的（读懂这一句再看代码）：服务器只当中转与账本（订单行 + 按项 ACK 位），
// **UP 与物品全部在客户端结算** —— 发单人 spendUP 扣订金/尾款、接单者 gainUP 收订金/尾款、
// 成品在两边各自出入包。所以这里的每一个分支都要问两个问题：
//   ① 钱没到位时，会不会仍然把权益领走（= 凭空生钱）？
//   ② 钱到位了、权益却领不到（= 玩家白干）？
// 服务器侧那几条裁定（Ruling G/I/L/M）堵的都是这两个方向，客户端这一层不得把它们重新打开：
//   L —— 只准照服务器给的 `待领` 清单逐条 ACK（不许遍历自己的订单，那会提前置位尚不存在的权益）；
//   M —— 先回执、后入账，且只为回执成功的条目入账（反过来 ACK 失败会重复发钱）。
//   N —— 图纸是生产资料（不可恢复），交付流程必须排除它：store 边界拦一道、UI 候选再挡一道。
//
// MVU 读写纪律（与 crafting/store.ts / market/store.ts 同一套）：
//   楼层探测 → _.set → replaceMvuData → 回读校验；**只写 `契约者.背包` 与 `契约者.经济.UP`**。
//   另：写入基底一律取**此刻**的新读值 —— 绝不用 await 之前的快照。建单/交付/验收/领取都是网络往返，
//   期间市场那边可能刚卖出一件（写 背包 −物 / UP +货款）；拿旧快照写回去会把这笔整片覆盖（钱物凭空蒸发）。
// ================================================================
import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from '../../market/settle';
import type { MarketItemSnapshot } from '../../market/priceTable';
import { isBlueprintName } from '../recipes';
import {
  ackOrder, acceptOrder, confirmOrder, createOrder, deliverOrder,
  fetchHall, fetchMine, rejectOrder,
  type 订单, type 待领取, type 待领项,
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

/**
 * 交付下拉候选（Ruling N 的 UI 侧防线）：背包里数量 > 0 且**不是图纸**的物品名。
 * 图纸是生产资料（材料候选排除它、市场禁止倒卖它，同一条护栏），不能当订单成品送出去。
 * 真正的拦截在 `deliver` 里 —— 这里只是让玩家根本看不到这个选项。
 */
export function 可交付候选(背包: Bag): string[] {
  return Object.keys(背包 ?? {}).filter(n => !isBlueprintName(n) && Number(背包[n]?.数量 ?? 0) > 0);
}

/**
 * 某件成品该不该入包：它由 `待领` 里**同 id** 的那条承载 —— 正常交付是 `项='成品'` 那条，
 * 退货退回的成品是 `项='尾款'` 且 `金额=0` 那条（尾款那个位两用：已完成给钱、已取消退物）。
 * 两条同时存在时以 `成品` 那条为准（服务器不会这样下发，但判定必须唯一）。
 *
 * 判定还要求该条回执**首次成功**（`first=true`）：回执失败不入包（否则该条仍留在服务器的
 * `待领` 里，下次刷新会**再入一遍**＝复制物品）；`first=false` 的重复回执也不入包——
 * 那是另一标签页已入过账的补回执，再入一次同样是复制（I-1 双发闸）。
 * 形状异常（找不到承载条目）同样不入：宁可滞留，也不发没回执的东西。
 */
function 成品该入账(待领: 待领项[], 该入账: Set<string>, id: string): boolean {
  const 同单 = 待领.filter(t => t.id === id);
  const 载体 = 同单.find(t => t.项 === '成品') ?? 同单.find(t => t.项 === '尾款' && Number(t.金额) === 0);
  return !!载体 && 该入账.has(`${载体.id}|${载体.项}`);
}

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
    // Ruling N（store 边界防线）：图纸是生产资料（4,500~112,500 UP、不可恢复），
    // 材料候选排除它、市场禁止倒卖它 —— 交付这道口是同一条护栏，也必须拦。
    // 拦在函数内而不是靠每个调用点自觉（同 autoPick 那次的收口理由）。
    if (isBlueprintName(物品名)) {
      lastError.value = `「${物品名}」是图纸，图纸是生产资料，不能作为订单成品交付`;
      toastr.error(lastError.value);
      return false;
    }
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
   * 领取待领物并逐项 ACK。三条裁定叠在一起，顺序不能动：
   *
   * **Ruling L（ACK 哪几项）**：必须照服务器给的 `待领` 清单逐条 ACK —— 不要遍历 `asPoster`/`asMaker`
   * 对每张单每个项都 ACK：那会**提前置位尚不存在的权益**（订单还在「已接单」就 ACK 尾款 →
   * `maker_final_ack=1`），等该单真正完成时尾款**永久领不到**。`待领` 就是为它而生的。
   *
   * **Ruling M（先回执还是先入账）**：**先回执、后入账，且只为回执成功的条目入账**。
   * 反过来（先前我把入账放在前面）会**无限刷钱**：ACK 失败（网络抖动即可）时钱已到玩家手上，
   * 而服务器仍把该项列在 `待领` 里 → 下次刷新按汇总**再发一遍**。先回执就没有这个口子：
   * ACK 失败 ⇒ 不记账 ⇒ 那笔钱/那件物仍留在服务器上，下次刷新重试即可（幂等）。
   * 金额也因此必须取**条目自带的 `金额`** 逐条累加，不再用 `claim.deposit`/`claim.final` 汇总 ——
   * 只认汇总就认不出「这项是不是已经发过了」。
   *
   * **I-1（first 门 + 新读值）**：**只为 first=true 的条目入账；写入基取循环后新读值**。
   * ACK 循环是一串网络往返（~0.5-2s/项）：期间市场/工坊/另一标签页可能改过同一楼层存档，
   * 拿循环前的快照 `r` 写回会把那段变动整片覆盖（钱物凭空蒸发，同 crafting/store.ts 那次教训）；
   * 而双开标签页共享存档、读到同一份 `待领`，若不问 first 各入一次账就是双发——服务器只在
   * 0→1 的那次回 `first:true`（重复回执改 0 行 → `first:false`），入账只认它。
   *
   * 残余风险只剩「回执成功、本地落档失败」（本地写入失败比网络失败罕见得多）：此时服务器已认为
   * 该项被领走，本地却没入账 —— 只能**大声报错**，绝不静默（Ruling M 明确接受这个残余）。
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
    // Ruling M：条目必须自带可用的逐项金额。**这一步必须在任何 ACK 之前**——回执一发出去，
    // 服务器就认为该项已领；此刻才发现金额缺失，客户端算不出该发多少钱，那笔钱就白丢了。
    if (!c.待领.every(t => Number.isFinite(Number(t.金额)))) {
      lastError.value = '待领取条目缺少可用金额（服务器版本过旧？），本次不领取以免算错账';
      toastr.error(lastError.value);
      return;
    }

    let 出错 = '';
    let 回执失败 = 0;
    let 已领钱 = 0;
    let 已领件 = 0;
    busy.value = true; lastError.value = '';
    try {
      // ① 先逐条回执（side 由 `项` 唯一决定：成品归发单人，订金/尾款归接单者）。
      //    回执成功 ≠ 该入账：`first=false` 是另一标签页已入过账的重复回执，本页不得再入一次（I-1 双发闸）。
      const 待领 = c.待领;
      const 已回执 = new Set<string>();
      const 该入账 = new Set<string>();
      for (const t of 待领) {
        const side = t.项 === '成品' ? 'poster' : 'maker';
        try {
          const ack = await ackOrder(t.id, playerName.value, side, t.项);
          已回执.add(`${t.id}|${t.项}`);
          if (ack.first) 该入账.add(`${t.id}|${t.项}`);
        }
        catch (_) { 回执失败++; }        // 失败的条目**不入账**（下称「未领」），仍留在服务器的待领清单里
      }
      if (已回执.size === 0) throw new Error(`领取失败：${回执失败} 项回执均未送达服务器，请稍后重试`);

      // ② 只为 first=true 的条目入账：钱按条目 `金额` 累加；物品按「其承载条目 first」入包。
      //    写入基底取**循环后的新读值**（同 publish/deliver/confirm）：循环是一串网络往返，
      //    期间市场/工坊可能改过同一楼层存档，拿循环前的快照 `r` 写回会把那段变动整片覆盖。
      已领钱 = 待领.reduce((s, t) => (该入账.has(`${t.id}|${t.项}`) ? s + Number(t.金额) : s), 0);
      const rr = readContractor() ?? r;
      let 新背包 = (rr.c.背包 ?? {}) as Bag;
      for (const { id, item } of c.items ?? []) {
        if (!成品该入账(待领, 该入账, id)) continue;
        const 名 = String((item as any)?.名称 ?? '');
        if (!名) throw new Error('待领成品缺少名称');
        新背包 = bagAdd(新背包, item, Number((item as any).数量 ?? 1));
        已领件++;
      }

      // ③ 资金与物品**一次落档**：分两次写的话，第二次失败就变成「钱已入账、物品没进包」，
      //    而回执已经发出去了 —— 那件物品服务器认为已领，玩家却永远拿不到（丢失不可救）。
      const checks: [string[], unknown][] = [];
      if (已领钱 > 0) {
        const 新UP = gainUP(Number(rr.c.经济?.UP ?? 0), 已领钱);
        _.set(rr.mvu, ['stat_data', '契约者', '经济', 'UP'], 新UP);
        checks.push([['stat_data', '契约者', '经济', 'UP'], 新UP]);
      }
      if (已领件 > 0) {
        _.set(rr.mvu, ['stat_data', '契约者', '背包'], 新背包);
        checks.push([['stat_data', '契约者', '背包'], 新背包]);
      }
      if (checks.length > 0) {
        try { await commit(rr.mvu, rr.mid, checks); }
        catch (e: any) {
          // Ruling M 的残余：回执已送达 → 服务器已标记这些权益为「已领」，而本地没入账，
          // 刷新后它们不会再出现在待领里。只能大声报错（不许静默），让玩家知道要找管理员核对。
          throw new Error(
            `回执已送达服务器，但本地入账失败（${e?.message ?? e}）：服务器已把这些权益记为已领，请把本条错误报告给管理员核对`,
          );
        }
      }
      if (已领钱 > 0 || 已领件 > 0) {
        toastr.success(`已领取：${已领钱} UP${已领件 ? ` + ${已领件} 件物品` : ''}`);
      }
    } catch (e: any) {
      出错 = e?.message || '领取失败';
      toastr.error(出错);
    } finally { busy.value = false; }
    // 刷新放在**报警之前**：refresh 会清 lastError（顶部常驻错误条），先报后刷等于没报。
    await refresh();
    if (出错) lastError.value = 出错;
    if (回执失败 > 0) {
      // 未领的条目**没有入账**，下次刷新会照旧出现在待领里 —— 重试即可，不会重复发放。
      const msg = `部分领取未完成：${回执失败} 项回执未送达服务器（这些项未入账，稍后刷新可重试）`;
      lastError.value = msg;
      toastr.warning(msg);
    }
  }

  return { hall, asPoster, asMaker, claim, loading, busy, lastError, playerName,
           refresh, publish, accept, deliver, confirm, reject, claimAll };
});
