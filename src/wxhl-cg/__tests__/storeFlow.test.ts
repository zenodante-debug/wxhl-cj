// 终审修复 pass 的 store 级测试：C1 零负债破产守卫 / I3 半清算回滚 / I4 防重入。
// MVU/toastr/localStorage 全部是桩——不碰真酒馆。
import { beforeEach, describe, expect, it } from 'vitest';
import { useExchangeStore, STORAGE_KEY } from '../store';
import { createAccount } from '../engine/types';
import { openPosition } from '../engine/trading';

function memStorage() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

/** 搭一个可用的契约者 MVU 存档；failWrite 时 replaceMvuData 抛错 */
function stubTavern(opts: { failWrite?: boolean } = {}) {
  let stored: any = {
    stat_data: {
      契约者: {
        经济: { UP: 1000 },
        背包: {},
        装备: {},
        通用技能: {},
        职业: { 名称: '无' },
        头部: { 阶位: '一阶', 血统: { 名称: '普通地球人类' }, 天赋: { 名称: '无' } },
      },
    },
  };
  (globalThis as any).Mvu = {
    getMvuData: () => klona(stored),
    replaceMvuData: async (mvu: any) => {
      if (opts.failWrite) throw new Error('MVU 写回失败');
      stored = klona(mvu);
    },
  };
  (globalThis as any).toastr = { success() {}, warning() {}, error() {}, info() {} };
  (globalThis as any).localStorage = memStorage();
  return { getStored: () => stored };
}

describe('终审修复：C1/I3/I4', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('C1：零负债时申请破产直接拒绝，现金分毫不动', async () => {
    stubTavern();
    const store = useExchangeStore();
    store.acct.cash = 1480; // 只有现金、无任何债务
    expect(() => store.previewBankruptcy()).toThrow(/无需清算|没有.*债务/);
    await expect(store.declareBankruptcy()).rejects.toThrow(/无需清算|没有.*债务/);
    expect(store.acct.cash).toBe(1480);
  });

  it('I3：MVU 写回失败 → 交易所账本回滚（持仓/现金复原），错误上抛', async () => {
    stubTavern({ failWrite: true });
    const store = useExchangeStore();
    store.acct.cash = 2000;
    store.acct.debt = 500;
    openPosition(store.acct, 'TGJ', 'long', 1, 1); // 持仓：保证金 100 佣金 1
    const cashBefore = store.acct.cash;
    const posBefore = klona(store.acct.positions);
    await expect(store.declareBankruptcy()).rejects.toThrow(/写回失败|清算中止/);
    expect(store.acct.cash).toBe(cashBefore);
    expect(store.acct.positions).toEqual(posBefore);
    expect(store.acct.debt).toBe(500);
    // 且没有持久化脏态：清算失败后什么都没落盘
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('I4：出金防重入——并发第二次调用拒绝', async () => {
    stubTavern();
    // 让 adjustUP 的 MVU 写变慢，制造重叠窗口
    let release: () => void;
    const gate = new Promise<void>(r => (release = r));
    const origReplace = (globalThis as any).Mvu.replaceMvuData;
    (globalThis as any).Mvu.replaceMvuData = async (mvu: any) => {
      await gate;
      return origReplace(mvu);
    };
    const store = useExchangeStore();
    store.acct.cash = 1000;
    const p1 = store.withdrawUP(500);
    await expect(store.withdrawUP(500)).rejects.toThrow(/处理中/);
    release!();
    await p1;
    expect(store.acct.cash).toBe(500); // 只扣了一次
  });
});
