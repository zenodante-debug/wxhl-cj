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
    expect(b.v).toBe(1);
    expect(b.cash).toBe(0);
  });
  it('损坏 JSON → 新账户 + console.warn，不抛错', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = '{broken';
    const b = loadAccount(s);
    expect(b.v).toBe(1);
    expect(b.cash).toBe(0);
  });
  it('版本不符 → 新账户', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = JSON.stringify({ v: 999, cash: 1e6 });
    const b = loadAccount(s);
    expect(b.cash).toBe(0); // 不认旧版数据
  });
});
