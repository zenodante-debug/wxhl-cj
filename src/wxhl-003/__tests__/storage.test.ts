import { beforeEach, describe, expect, it } from 'vitest';
import { deposit, loadStorage, saveStorage, withdraw, STORAGE_KEY } from '../statusbar/storage';

/** 假 localStorage（内存版） */
let store: Record<string, string>;
beforeEach(() => {
  store = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
});

describe('储藏室 · localStorage 读写', () => {
  it('空 → {}；损坏 JSON → {}；非对象（数组）→ {}', () => {
    expect(loadStorage()).toEqual({});
    store[STORAGE_KEY] = '{坏了';
    expect(loadStorage()).toEqual({});
    store[STORAGE_KEY] = '[1,2]';
    expect(loadStorage()).toEqual({});
  });

  it('saveStorage → loadStorage 往返一致', () => {
    saveStorage({ 圣剑: { 名称: '圣剑', 数量: 1 } });
    expect(loadStorage()).toEqual({ 圣剑: { 名称: '圣剑', 数量: 1 } });
  });

  it('localStorage 抛错也不炸（读{}、写静默）', () => {
    (globalThis as any).localStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadStorage()).toEqual({});
    expect(() => saveStorage({ a: 1 })).not.toThrow();
  });
});

describe('储藏室 · 存入（整堆、同名堆叠）', () => {
  it('新物品：整堆入，缺数量按 1', () => {
    const s = deposit({}, '治疗药剂', { 名称: '治疗药剂', 数量: 5 });
    expect(s.治疗药剂.数量).toBe(5);
    const s2 = deposit({}, '圣剑', { 名称: '圣剑' });
    expect(s2.圣剑.数量).toBe(1);
  });

  it('同名再存：数量相加、不改原对象', () => {
    const base = { 治疗药剂: { 名称: '治疗药剂', 数量: 3 } };
    const s = deposit(base, '治疗药剂', { 名称: '治疗药剂', 数量: 4 });
    expect(s.治疗药剂.数量).toBe(7);
    expect(base.治疗药剂.数量).toBe(3); // 原对象未被改
  });
});

describe('储藏室 · 取出', () => {
  it('取出整堆并返回；储藏室不再含该物品', () => {
    const base = { 圣剑: { 名称: '圣剑', 数量: 2 }, 药剂: { 名称: '药剂', 数量: 9 } };
    const w = withdraw(base, '圣剑')!;
    expect(w.item.数量).toBe(2);
    expect(w.next.圣剑).toBeUndefined();
    expect(w.next.药剂.数量).toBe(9);
    expect(base.圣剑).toBeDefined(); // 原对象未被改
  });

  it('取出不存在的物品 → null', () => {
    expect(withdraw({}, '没有')).toBeNull();
  });
});
