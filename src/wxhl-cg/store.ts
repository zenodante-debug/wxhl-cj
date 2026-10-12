// ================================================================
// 回廊交易所 · pinia store：驱动引擎 + localStorage 持久化。
// 所有副作用集中在本层；引擎（engine/）保持纯净。
// z / defineStore / ref / computed / klona / toastr 由 unplugin-auto-import 提供。
// ================================================================
import { createAccount, round2, type ExchangeAccount, type Side } from './engine/types';
import { tickMarket } from './engine/market';
import { closePosition, openPosition, tickTrading } from './engine/trading';
import { pushLog } from './engine/metrics';
import { BANKRUPTCY_LINE, shouldGoBankrupt } from './engine/bankrupt';
import { computeLiquidation, EMPTY_EQUIP_SLOT, type LiquidationResult } from './engine/bankruptcy';
import { adjustUP, commitMvu, readContractor, readUP } from './mvu';

export const STORAGE_KEY = 'wxhl-cg:account';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const AccountSchema = z.looseObject({
  v: z.literal(1),
  cash: z.number(),
  positions: z.record(
    z.string(),
    z.looseObject({
      side: z.enum(['long', 'short']),
      qty: z.number(),
      entryPrice: z.number(),
      leverage: z.number(),
      margin: z.number(),
    }),
  ),
  prices: z.record(z.string(), z.number()),
  priceHistory: z.record(z.string(), z.array(z.number())),
  openPrices: z.record(z.string(), z.number()),
  tick: z.number(),
  netInvested: z.number(),
  debt: z.number(),
  bankruptcyCount: z.number(),
  cumulativeLoss: z.number(),
  frozen: z.boolean(),
  news: z.any().nullable(),
  newsCooldown: z.number(),
  logs: z.array(
    z.looseObject({ tick: z.number(), time: z.string(), kind: z.enum(['news', 'trade', 'system']), text: z.string() }),
  ),
});

export function loadAccount(storage: StorageLike): ExchangeAccount {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createAccount();
  try {
    const parsed = AccountSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn('[wxhl-cg] 存档结构校验失败，重置为新账户:', z.prettifyError(parsed.error));
      return createAccount();
    }
    // 开盘基准价 = 本次脚本加载时的价：涨跌幅与走势图基准线都按它算，因此每次加载都重新快照
    const acct = parsed.data as ExchangeAccount;
    acct.openPrices = { ...acct.prices };
    return acct;
  } catch (e) {
    console.warn('[wxhl-cg] 存档 JSON 损坏，重置为新账户:', e);
    return createAccount();
  }
}

export function saveAccount(storage: StorageLike, acct: ExchangeAccount): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(acct));
}

const TICK_MS = 10_000;
const EXCHANGE_FEE = 0.01; // UP 兑换双向 1%

export const useExchangeStore = defineStore('wxhl-cg', () => {
  const acct = ref<ExchangeAccount>(loadAccount(localStorage));
  const panelOpen = ref(false);
  /** 主卡 UP 余额（读不到为 null）；账户资产里与现金并列显示 */
  const up = ref<number | null>(readUP());
  /** 下一跳的时间戳（界面倒计时用） */
  const nextTickAt = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  /** 防重入闸（照市场 purchasing/listing 惯例）：异步 MVU 操作进行中拒绝并发调用 */
  let exchanging = false;
  let bankruptcing = false;
  /** 自动清算连续失败次数（只提示一次，避免每 10 秒刷屏） */
  let liquidateFailures = 0;

  function persist() {
    saveAccount(localStorage, klona(acct.value));
  }

  /** 刷新主卡 UP 余额（打开面板、兑换后、每跳各读一次） */
  function refreshUP() {
    up.value = readUP();
  }

  /** 推进一跳：行情 → 交易结算（杠杆利息/强平）→ 破产线检查，然后持久化。引擎 throw 时响亮失败并停表。 */
  function doTick() {
    try {
      const beforeNews = acct.value.news?.text;
      tickMarket(acct.value);
      if (acct.value.news && acct.value.news.text !== beforeNews) {
        pushLog(acct.value, 'news', acct.value.news.text);
      }
      const r = tickTrading(acct.value);
      if (r.liquidated.length) {
        const text = `强平：${r.liquidated.join('、')} 已按现价强制平仓`;
        pushLog(acct.value, 'system', text);
        toastr.warning(text);
      }
      persist();
      refreshUP();
      scheduleNext();
      // 破产线：累计已实现亏损越过 250 → 自动清算（异步，失败不阻塞行情，下一跳重试）
      if (!bankruptcing && shouldGoBankrupt(acct.value)) {
        void autoLiquidate();
      }
    } catch (e) {
      console.error('[wxhl-cg] 行情跳动失败，计时器已停止:', e);
      toastr.error('交易所行情引擎出错，已停止跳动（详见控制台）');
      stopTicker();
    }
  }

  /** 开仓（界面入口）：引擎 + 日报 + 落盘 */
  function placeOrder(code: string, side: Side, qty: number, leverage: number) {
    const r = openPosition(acct.value, code, side, qty, leverage);
    pushLog(
      acct.value,
      'trade',
      `开${side === 'long' ? '多' : '空'} ${code} ×${qty} @${acct.value.prices[code]}（保证金 ${r.margin} 佣金 ${r.fee}${
        r.stamp ? ' 印花税 ' + r.stamp : ''
      }）`,
    );
    persist();
    return r;
  }

  /** 平仓（界面入口）：引擎 + 日报 + 落盘 */
  function closeOrder(code: string) {
    const pos = acct.value.positions[code];
    if (!pos) throw new Error('没有该股仓位: ' + code);
    const sideText = pos.side === 'long' ? '多' : '空';
    const r = closePosition(acct.value, code);
    pushLog(
      acct.value,
      'trade',
      `平仓 ${code} ${sideText} ×${pos.qty}：盈亏 ${r.pnl >= 0 ? '+' : ''}${r.pnl}（佣金 ${r.fee}${
        r.stamp ? ' 印花税 ' + r.stamp : ''
      }）`,
    );
    persist();
    return r;
  }

  /** 破产线自动清算：以累计已实现亏损为待偿额；失败整体回滚，下一跳自动重试 */
  async function autoLiquidate() {
    const owed = round2(acct.value.cumulativeLoss);
    try {
      await runLiquidation(owed);
      liquidateFailures = 0;
      pushLog(acct.value, 'system', `破产清算：变卖资产抵债 ${owed}，剩余欠款 ${acct.value.debt}`);
      toastr.error(`破产清算：累计亏损突破 ${BANKRUPTCY_LINE}，交易所已变卖你的资产抵债`);
    } catch (e) {
      liquidateFailures++;
      console.error('[wxhl-cg] 破产自动清算失败（下一跳重试）:', e);
      if (liquidateFailures === 1) {
        toastr.error('破产清算失败（读不到存档变量？）——将每跳重试，详见控制台');
      }
    }
  }

  function scheduleNext() {
    nextTickAt.value = Date.now() + TICK_MS;
  }

  /** 常驻计时：脚本加载即开跳，与面板是否打开无关（用户 2026-10-12 拍板） */
  function startTicker() {
    if (timer) return;
    scheduleNext();
    timer = setInterval(doTick, TICK_MS);
  }

  function stopTicker() {
    if (timer) clearInterval(timer);
    timer = null;
    nextTickAt.value = 0;
  }

  /** 手动跳过：立刻跳一次（内部会重新排下一跳的时间戳） */
  function skipTick() {
    if (timer) doTick();
  }

  function open() {
    panelOpen.value = true;
    refreshUP();
  }

  function close() {
    panelOpen.value = false;
    persist();
  }

  /** 入金：扣 amount UP → 加 ×0.99 交易所币（先扣 UP，失败则币不动） */
  async function depositUP(amount: number) {
    if (exchanging) throw new Error('兑换处理中，请勿重复操作');
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('入金金额必须是正整数');
    exchanging = true;
    try {
      await adjustUP(-amount);
      const credited = round2(amount * (1 - EXCHANGE_FEE));
      acct.value.cash = round2(acct.value.cash + credited);
      acct.value.netInvested = round2(acct.value.netInvested + credited);
      pushLog(acct.value, 'system', `存入 ${amount} UP → ${credited} 币`);
      persist();
      refreshUP();
      toastr.success(`入金成功：${amount} UP → ${credited} 币（手续费 1%）`);
    } finally {
      exchanging = false;
    }
  }

  /** 出金：扣 amount 币 → 加 ×0.99 UP（先加 UP，失败则币不动） */
  async function withdrawUP(amount: number) {
    if (exchanging) throw new Error('兑换处理中，请勿重复操作');
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('出金金额必须是正整数');
    if (acct.value.cash < amount) throw new Error(`现金不足：只有 ${round2(acct.value.cash)} 币`);
    exchanging = true;
    try {
      const upGain = round2(amount * (1 - EXCHANGE_FEE));
      await adjustUP(upGain);
      acct.value.cash = round2(acct.value.cash - amount);
      acct.value.netInvested = round2(acct.value.netInvested - amount);
      pushLog(acct.value, 'system', `取出 ${amount} 币 → ${upGain} UP`);
      persist();
      refreshUP();
      toastr.success(`出金成功：${amount} 币 → ${upGain} UP（手续费 1%）`);
    } finally {
      exchanging = false;
    }
  }

  // ==================== 破产清算 ====================

  /** 快照主卡资产（读不到契约者 → null，UI 阻止破产流程并提示） */
  function snapshotAssets() {
    const r = readContractor();
    if (!r) return null;
    return {
      r,
      bag: (r.c.背包 ?? {}) as Record<string, any>,
      equipment: (r.c.装备 ?? {}) as Record<string, any>,
      skills: (r.c.通用技能 ?? {}) as Record<string, any>,
      job: r.c.职业?.名称 && r.c.职业.名称 !== '无' ? { ...r.c.职业 } : null,
      bloodline: r.c.头部?.血统 ?? null,
      talent: r.c.头部?.天赋?.名称 && r.c.头部.天赋.名称 !== '无' ? { ...r.c.头部.天赋 } : null,
      playerTier: String(r.c.头部?.阶位 ?? '一阶'),
    };
  }

  /** 预览清算（不执行）：持仓按现价估值 + 当前现金 + 主卡资产快照。零债务拒绝（防误点清空现金）。 */
  function previewBankruptcy(): LiquidationResult {
    const owed = round2(acct.value.debt);
    if (owed <= 0) throw new Error('没有待清债务，无需破产清算');
    const snap = snapshotAssets();
    if (!snap) throw new Error('读不到存档变量（契约者不存在），无法清算');
    // 持仓按现价估值（不实际平仓，预览用净值近似）
    let positionsValue = 0;
    for (const [code, p] of Object.entries(acct.value.positions)) {
      positionsValue += p.margin + (p.side === 'long' ? 1 : -1) * (acct.value.prices[code] - p.entryPrice) * p.qty;
    }
    return computeLiquidation({
      positionsProceeds: Math.max(0, Math.round(positionsValue * 100) / 100),
      cash: Math.max(0, acct.value.cash),
      bag: snap.bag,
      equipment: snap.equipment,
      skills: snap.skills,
      job: snap.job,
      bloodline: snap.bloodline,
      talent: snap.talent,
      playerTier: snap.playerTier,
      debt: owed,
    });
  }

  /**
   * 清算核心：强平持仓 → 快照 → 计算 → MVU 写回 → 更新交易所账本。
   * 原子性：先快照交易所账本，任一步 throw 则整体回滚——宁可响亮失败也不半清算。
   */
  async function runLiquidation(owed: number) {
    if (bankruptcing) throw new Error('清算处理中，请勿重复操作');
    if (owed <= 0) throw new Error('没有待清债务，无需破产清算');
    const r = readContractor();
    if (!r) throw new Error('读不到存档变量（契约者不存在），清算中止');
    bankruptcing = true;
    const snapshot = klona(acct.value);
    try {
      // 1. 持仓全部按现价强平（费用照收，亏损累计；force 绕过冻结门禁）
      for (const code of Object.keys(acct.value.positions)) closePosition(acct.value, code, true);
      // 2. 用最新快照计算（现金已含强平所得）
      const snap = snapshotAssets()!;
      const liq = computeLiquidation({
        positionsProceeds: 0, // 已实际强平，所得在现金里
        cash: Math.max(0, acct.value.cash),
        bag: snap.bag,
        equipment: snap.equipment,
        skills: snap.skills,
        job: snap.job,
        bloodline: snap.bloodline,
        talent: snap.talent,
        playerTier: snap.playerTier,
        debt: owed,
      });
      // 3. MVU 写回（装备槽整槽重置为空槽形状，不能只清名称——残留数值会被当装备读）
      for (const name of liq.removedBag) _.unset(r.mvu, ['stat_data', '契约者', '背包', name]);
      for (const slot of liq.clearedSlots) _.set(r.mvu, ['stat_data', '契约者', '装备', slot], { ...EMPTY_EQUIP_SLOT });
      for (const name of liq.removedSkills) _.unset(r.mvu, ['stat_data', '契约者', '通用技能', name]);
      if (liq.clearJob) _.set(r.mvu, ['stat_data', '契约者', '职业'], { 名称: '无' });
      if (liq.clearBloodline) _.set(r.mvu, ['stat_data', '契约者', '头部', '血统'], { 名称: '普通地球人类', 品质: '白色' });
      if (liq.clearTalent) _.set(r.mvu, ['stat_data', '契约者', '头部', '天赋'], { 名称: '无' });
      await commitMvu(r.mvu, r.mid, liq.removedBag.map(n => [['stat_data', '契约者', '背包', n], undefined] as [string[], unknown]));
      // 4. 交易所账本：抵债
      acct.value.cash = liq.returnCash; // 现金先全部抵债，溢出退回
      acct.value.debt = liq.remainingDebt;
      acct.value.cumulativeLoss = 0; // 计数器归零，重新开始
      acct.value.bankruptcyCount++;
      acct.value.frozen = liq.remainingDebt > 0; // 抵不完 ⇒ 冻结，清偿后解冻
      persist();
    } catch (e) {
      acct.value = snapshot; // 回滚交易所账本（MVU 未写成功 = 主卡没动）
      throw e;
    } finally {
      bankruptcing = false;
    }
  }

  /** 手动清算（账上已欠款时）：以现有欠款为待偿额 */
  async function declareBankruptcy() {
    await runLiquidation(round2(acct.value.debt));
  }

  /** 用现金清偿欠款（不足则拒绝）；清偿后解冻。 */
  function repayDebt(amount: number) {
    if (acct.value.debt <= 0) throw new Error('没有待清债务');
    const pay = Math.min(round2(amount), acct.value.debt);
    if (!Number.isFinite(pay) || pay <= 0) throw new Error('清偿金额必须为正');
    if (acct.value.cash < pay) throw new Error(`现金不足：只有 ${round2(acct.value.cash)}`);
    acct.value.cash = round2(acct.value.cash - pay);
    acct.value.debt = round2(acct.value.debt - pay);
    if (acct.value.debt <= 0) {
      acct.value.debt = 0;
      acct.value.frozen = false;
    }
    pushLog(acct.value, 'system', `清偿欠款 ${pay}，剩余欠款 ${acct.value.debt}`);
    persist();
  }

  return {
    acct,
    panelOpen,
    up,
    refreshUP,
    nextTickAt,
    skipTick,
    open,
    close,
    doTick,
    persist,
    startTicker,
    stopTicker,
    placeOrder,
    closeOrder,
    depositUP,
    withdrawUP,
    previewBankruptcy,
    declareBankruptcy,
    repayDebt,
  };
});
