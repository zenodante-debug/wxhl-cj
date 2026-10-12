// ================================================================
// 回廊交易所 · pinia store：驱动引擎 + localStorage 持久化。
// 所有副作用集中在本层；引擎（engine/）保持纯净。
// z / defineStore / ref / klona / toastr 由 unplugin-auto-import 提供。
// ================================================================
import { createAccount, round2, type ExchangeAccount } from './engine/types';
import { tickMarket } from './engine/market';
import { closePosition, tickTrading } from './engine/trading';
import {
  HIGH_INTEREST_REPAY_MULT,
  loanOffer,
  repayDebt,
  repayLoan,
  takeHighInterestLoan,
  takeLoan,
  tickLoan,
} from './engine/loan';
import { computeLiquidation, type LiquidationResult } from './engine/bankruptcy';
import { estateValue, inheritanceTax, settleInheritance, transferFee } from './engine/inheritance';
import { adjustUP, commitMvu, readContractor } from './mvu';

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
  tick: z.number(),
  loan: z.any().nullable(),
  loanState: z.enum(['none', 'normal', 'delinquent']),
  debt: z.number(),
  bankruptcyCount: z.number(),
  deathMarked: z.boolean(),
  cumulativeLoss: z.number(),
  frozen: z.boolean(),
  news: z.any().nullable(),
  newsCooldown: z.number(),
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
    return parsed.data as ExchangeAccount;
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
  let timer: ReturnType<typeof setInterval> | null = null;

  function persist() {
    saveAccount(localStorage, klona(acct.value));
  }

  /** 推进一跳：行情 → 交易结算（利息/强平），然后持久化。引擎 throw 时响亮失败并停表。 */
  function doTick() {
    try {
      tickMarket(acct.value);
      const r = tickTrading(acct.value);
      if (r.liquidated.length) toastr.warning(`强平：${r.liquidated.join('、')} 已按现价强制平仓`);
      tickLoan(acct.value);
      persist();
    } catch (e) {
      console.error('[wxhl-cg] 行情跳动失败，计时器已停止:', e);
      toastr.error('交易所行情引擎出错，已停止跳动（详见控制台）');
      stopTicker();
    }
  }

  function startTicker() {
    if (timer) return;
    timer = setInterval(doTick, TICK_MS);
  }

  function stopTicker() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  /** 打开 app：有死亡标记先结算遗产税（响亮提示），再开面板 */
  function open() {
    if (acct.value.deathMarked) {
      const r = settleInheritance(acct.value);
      toastr.warning(
        `前任契约者已陨落。遗产税 ${r.tax} + 过户费 ${r.fee} 已扣缴${acct.value.debt > 0 ? '，不足部分转为债务' : ''}`,
      );
      persist();
    }
    panelOpen.value = true;
    startTicker();
  }

  function close() {
    panelOpen.value = false;
    stopTicker();
    persist();
  }

  /** 入金：扣 amount UP → 加 ×0.99 交易所币（先扣 UP，失败则币不动） */
  async function depositUP(amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('入金金额必须是正整数');
    await adjustUP(-amount);
    acct.value.cash = round2(acct.value.cash + round2(amount * (1 - EXCHANGE_FEE)));
    persist();
    toastr.success(`入金成功：${amount} UP → ${round2(amount * (1 - EXCHANGE_FEE))} 币（手续费 1%）`);
  }

  /** 出金：扣 amount 币 → 加 ×0.99 UP（先加 UP，失败则币不动） */
  async function withdrawUP(amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('出金金额必须是正整数');
    if (acct.value.cash < amount) throw new Error(`现金不足：只有 ${round2(acct.value.cash)} 币`);
    const upGain = round2(amount * (1 - EXCHANGE_FEE));
    await adjustUP(upGain);
    acct.value.cash = round2(acct.value.cash - amount);
    persist();
    toastr.success(`出金成功：${amount} 币 → ${upGain} UP（手续费 1%）`);
  }

  // ==================== 借贷 ====================

  function borrow(amount: number) {
    takeLoan(acct.value, amount);
    persist();
    toastr.success(`借款 ${amount} 到账，到期第 ${acct.value.loan!.dueTick} 跳`);
  }

  function borrowHigh() {
    takeHighInterestLoan(acct.value);
    persist();
    toastr.warning('高利贷到账 500——还 2.5 倍，利息每跳递增，好自为之');
  }

  function repay() {
    repayLoan(acct.value);
    persist();
    toastr.success('借款已还清');
  }

  function payDebt(amount: number) {
    repayDebt(acct.value, amount);
    persist();
    toastr.success(acct.value.debt <= 0 ? '债务已清，账户解冻' : `已还 ${amount}，剩余债务 ${acct.value.debt}`);
  }

  // ==================== 破产清算 ====================

  /** 当前欠款总额 = debt + 未还借款（高利贷 2.5 倍+利息） */
  function totalOwed(): number {
    const loan = acct.value.loan;
    const loanOwed = loan
      ? loan.highInterest
        ? loan.principal * HIGH_INTEREST_REPAY_MULT + loan.accrued
        : loan.principal * (1 + loan.rate)
      : 0;
    return round2(acct.value.debt + loanOwed);
  }

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

  /** 预览清算（不执行）：持仓按现价估值 + 当前现金 + 主卡资产快照 */
  function previewBankruptcy(): LiquidationResult {
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
      debt: totalOwed(),
    });
  }

  /** 执行破产清算：强平持仓 → 快照 → 计算 → MVU 写回 → 更新交易所账本。任一步 throw 则中断（响亮失败）。 */
  async function declareBankruptcy() {
    const r = readContractor();
    if (!r) throw new Error('读不到存档变量（契约者不存在），清算中止');
    // 1. 持仓全部按现价强平（费用照收，亏损累计）
    for (const code of Object.keys(acct.value.positions)) closePosition(acct.value, code);
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
      debt: totalOwed(),
    });
    // 3. MVU 写回
    for (const name of liq.removedBag) _.unset(r.mvu, ['stat_data', '契约者', '背包', name]);
    for (const slot of liq.clearedSlots) _.set(r.mvu, ['stat_data', '契约者', '装备', slot, '名称'], '无');
    for (const name of liq.removedSkills) _.unset(r.mvu, ['stat_data', '契约者', '通用技能', name]);
    if (liq.clearJob) _.set(r.mvu, ['stat_data', '契约者', '职业'], { 名称: '无' });
    if (liq.clearBloodline) _.set(r.mvu, ['stat_data', '契约者', '头部', '血统'], { 名称: '普通地球人类', 品质: '白色' });
    if (liq.clearTalent) _.set(r.mvu, ['stat_data', '契约者', '头部', '天赋'], { 名称: '无' });
    await commitMvu(r.mvu, r.mid, liq.removedBag.map(n => [['stat_data', '契约者', '背包', n], undefined] as [string[], unknown]));
    // 4. 交易所账本：抵债
    acct.value.cash = liq.returnCash; // 现金先全部抵债，溢出退回
    acct.value.debt = liq.remainingDebt;
    acct.value.loan = null;
    acct.value.cumulativeLoss = 0;
    acct.value.bankruptcyCount++;
    if (liq.remainingDebt <= 0) {
      acct.value.frozen = false;
      acct.value.loanState = 'none';
    }
    persist();
  }

  // ==================== 遗产税 ====================

  function markDeath() {
    acct.value.deathMarked = true;
    persist();
    toastr.warning('已宣告本局终结——下次打开交易所将扣缴遗产税');
  }

  const inheritancePreview = computed(() => {
    const e = estateValue(acct.value);
    return { estate: e, tax: inheritanceTax(e), fee: transferFee(e) };
  });

  return {
    acct,
    panelOpen,
    open,
    close,
    doTick,
    persist,
    startTicker,
    stopTicker,
    depositUP,
    withdrawUP,
    borrow,
    borrowHigh,
    repay,
    payDebt,
    loanOffer: () => loanOffer(acct.value),
    previewBankruptcy,
    declareBankruptcy,
    markDeath,
    inheritancePreview,
  };
});
