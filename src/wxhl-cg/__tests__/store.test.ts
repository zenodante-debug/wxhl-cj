import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { loadAccount, saveAccount, STORAGE_KEY, type StorageLike } from '../store';

function memStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('持久化', () => {
  it('round-trip：存出去能原样读回', () => {
    const s = memStorage();
    const a = createAccount();
    a.cash = 123.45;
    a.tick = 7;
    saveAccount(s, a);
    const b = loadAccount(s);
    expect(b.cash).toBe(123.45);
    expect(b.tick).toBe(7);
    expect(b.prices['TGJ']).toBe(100);
  });
  it('空存储 → 新账户', () => {
    const b = loadAccount(memStorage());
    expect(b.v).toBe(3);
    expect(b.cash).toBe(0);
  });
  it('损坏 JSON → 新账户 + console.warn，不抛错', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = '{broken';
    const b = loadAccount(s);
    expect(b.v).toBe(3);
    expect(b.cash).toBe(0);
  });
  it('版本不符 → 新账户', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = JSON.stringify({ v: 999, cash: 1e6 });
    const b = loadAccount(s);
    expect(b.cash).toBe(0); // 不认的版本
  });

  // 终审 C1：改 schema 必须带迁移，否则老存档被静默清空
  it('v1 老存档 → 迁移到最新版，现金/持仓/价格/计数全部保留', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = JSON.stringify({
      v: 1,
      cash: 500,
      positions: { TGJ: { side: 'long', qty: 2, entryPrice: 100, leverage: 5, margin: 40 } },
      prices: { TGJ: 120 },
      priceHistory: { TGJ: [100, 120] },
      tick: 9,
      loan: null,
      loanState: 'none',
      debt: 0,
      bankruptcyCount: 1,
      deathMarked: false,
      cumulativeLoss: 30,
      frozen: false,
      news: null,
      newsCooldown: 3,
    });
    const b = loadAccount(s);
    expect(b.v).toBe(3);
    expect(b.cash).toBe(500);
    // 老 record 形状拆成一笔一行并补上 id/code
    expect(b.positions).toHaveLength(1);
    expect(b.positions[0]).toMatchObject({ code: 'TGJ', side: 'long', qty: 2, entryPrice: 100, margin: 40 });
    expect(typeof b.positions[0].id).toBe('string');
    expect(b.prices['TGJ']).toBe(120);
    expect(b.tick).toBe(9);
    expect(b.bankruptcyCount).toBe(1);
    expect(b.cumulativeLoss).toBe(30);
    expect(b.logs).toEqual([]);
    expect(b.openPrices['TGJ']).toBe(120); // 开盘基准 = 迁移时价
    // 迁移点起算盈亏：净投入 = 迁移时的现金 + 持仓权益（debt 不计）
    expect(b.netInvested).toBe(580); // 500 + (保证金 40 + 浮盈 40)
    expect('loan' in b).toBe(false);
  });

  it('v2 存档 → 持仓拆成一笔一行，其余字段原样保留', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = JSON.stringify({
      v: 2,
      cash: 300,
      positions: {
        TGJ: { side: 'long', qty: 2, entryPrice: 100, leverage: 5, margin: 40 },
        FM: { side: 'short', qty: 5, entryPrice: 40, leverage: 2, margin: 100 },
      },
      prices: { TGJ: 110, FM: 42 },
      priceHistory: { TGJ: [100, 110], FM: [40, 42] },
      openPrices: { TGJ: 105, FM: 41 },
      tick: 12,
      netInvested: 900,
      debt: 0,
      bankruptcyCount: 0,
      cumulativeLoss: 0,
      frozen: false,
      news: null,
      newsCooldown: 3,
      logs: [{ tick: 3, time: '10:00:00', kind: 'trade', text: '开多 TGJ' }],
    });
    const b = loadAccount(s);
    expect(b.v).toBe(3);
    expect(b.positions).toHaveLength(2);
    expect(b.positions.map(p => p.code).sort()).toEqual(['FM', 'TGJ']);
    expect(b.netInvested).toBe(900); // v2 已有 netInvested，不重算
    expect(b.logs).toHaveLength(1);
    expect(b.openPrices['TGJ']).toBe(110); // 加载时重新快照（覆盖存档里的 105）
  });
});
