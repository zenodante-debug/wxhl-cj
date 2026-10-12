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
function stubTavern(opts: { failWrite?: boolean; up?: number } = {}) {
  let stored: any = {
    stat_data: {
      契约者: {
        经济: { UP: opts.up ?? 1000 },
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
  return { getStored: () => stored, getUP: () => Number(stored.stat_data.契约者.经济.UP) };
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

// 用户 2026-10-12 确认：主卡 UP 允许为负。交易所侧语义随之钉死——
// 出金把 UP 往 0 回升（合法），入金会加深欠额（拒绝）。
// 说明：这两条是行为钉桩（实现期已按此实现，故首跑即绿），非 TDD 新功能。
describe('负 UP 语义', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('UP 为负时出金照常：UP 向 0 回升', async () => {
    const t = stubTavern({ up: -100 });
    const store = useExchangeStore();
    store.acct.cash = 500;
    await store.withdrawUP(200); // 200×0.99 = 198 → UP 98
    expect(t.getUP()).toBe(98);
    expect(store.acct.cash).toBe(300);
  });

  it('UP 为负时入金被拒绝（会加深欠额），账本与存档都不动', async () => {
    const t = stubTavern({ up: -100 });
    const store = useExchangeStore();
    store.acct.cash = 500;
    await expect(store.depositUP(50)).rejects.toThrow(/UP 不足/);
    expect(t.getUP()).toBe(-100);
    expect(store.acct.cash).toBe(500);
  });
});

// 交易与日报的接线（纯逻辑已在 metrics.test.ts 先行 TDD；这里验 store 有没有真的写日志）
describe('交易写日报', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('开仓 / 平仓各写一条 trade 日志', () => {
    stubTavern();
    const store = useExchangeStore();
    store.acct.cash = 1000;
    store.placeOrder('TGJ', 'long', 2, 5);
    store.closeOrder('TGJ');
    const texts = store.acct.logs.map(l => l.text);
    expect(texts.some(t => t.startsWith('开多 TGJ'))).toBe(true);
    expect(texts.some(t => t.startsWith('平仓 TGJ'))).toBe(true);
    expect(store.acct.logs.every(l => l.kind === 'trade')).toBe(true);
  });
});

// 破产线自动清算（Review Focus 1）
describe('破产线自动清算', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const flush = () => new Promise(r => setTimeout(r, 0));

  it('亏损破线 → 自动变卖抵债：现金先抵、不足部分留债务并冻结', async () => {
    stubTavern(); // MVU 可读可写
    const store = useExchangeStore();
    store.acct.cash = 100;
    store.acct.cumulativeLoss = 300; // 越过 250
    store.doTick();
    await flush();
    expect(store.acct.bankruptcyCount).toBe(1);
    expect(store.acct.cash).toBe(0); // 100 全抵债
    expect(store.acct.debt).toBe(200); // 300 − 100
    expect(store.acct.frozen).toBe(true);
    expect(store.acct.cumulativeLoss).toBe(0); // 计数器归零
  });

  it('MVU 不可写 → 整体回滚、不留脏态，下一跳仍会重试', async () => {
    stubTavern({ failWrite: true });
    const store = useExchangeStore();
    store.acct.cash = 100;
    store.acct.cumulativeLoss = 300;
    store.doTick();
    await flush();
    expect(store.acct.bankruptcyCount).toBe(0);
    expect(store.acct.cash).toBe(100); // 未动
    expect(store.acct.debt).toBe(0);
    expect(store.acct.cumulativeLoss).toBe(300); // 仍超线 ⇒ 下一跳会再试
    // 落盘的只是"跳过之后、清算之前"的状态，没有半清算痕迹
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.debt).toBe(0);
    expect(saved.cash).toBe(100);
    expect(saved.bankruptcyCount).toBe(0);
  });
});
