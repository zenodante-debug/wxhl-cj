// ================================================================
// 回廊交易所 · pinia store：驱动引擎 + localStorage 持久化。
// 所有副作用集中在本层；引擎（engine/）保持纯净。
// z / defineStore / ref / klona / toastr 由 unplugin-auto-import 提供。
// ================================================================
import { createAccount, type ExchangeAccount } from './engine/types';
import { tickMarket } from './engine/market';

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

export const useExchangeStore = defineStore('wxhl-cg', () => {
  const acct = ref<ExchangeAccount>(loadAccount(localStorage));
  const panelOpen = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function persist() {
    saveAccount(localStorage, klona(acct.value));
  }

  /** 推进一跳并持久化。引擎 throw 时响亮失败并停表。 */
  function doTick() {
    try {
      tickMarket(acct.value);
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

  function open() {
    panelOpen.value = true;
    startTicker();
  }

  function close() {
    panelOpen.value = false;
    stopTicker();
    persist();
  }

  return { acct, panelOpen, open, close, doTick, persist, startTicker, stopTicker };
});
