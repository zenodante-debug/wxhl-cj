import { describe, expect, it } from 'vitest';
import { buff转字符串, 字符串转buff } from '../engine/buffMapper';
import type { 状态条目 } from '../types';

describe('buffMapper · buff 与特殊状态互转', () => {
  it('buff → 字符串：单层无词条', () => {
    const buff: 状态条目 = { 名: '流血', 持续: 3 };
    const 字符串 = buff转字符串(buff);

    expect(字符串).toBe('持续3回合');
  });

  it('buff → 字符串：多层', () => {
    const buff: 状态条目 = { 名: '灼烧', 持续: 3, 层数: 2 };
    const 字符串 = buff转字符串(buff);

    expect(字符串).toBe('2层|持续3回合');
  });

  it('buff → 字符串：带词条', () => {
    const buff: 状态条目 = { 名: '元素崩坏', 持续: 5, 词条: ['禁回复HP', '禁回复MP'] };
    const 字符串 = buff转字符串(buff);

    expect(字符串).toContain('持续5回合');
    expect(字符串).toContain('禁回复HP');
    expect(字符串).toContain('禁回复MP');
  });

  it('字符串 → buff：单层无词条', () => {
    const buff = 字符串转buff('流血', '持续3回合');

    expect(buff.名).toBe('流血');
    expect(buff.持续).toBe(3);
    expect(buff.层数).toBeUndefined();
  });

  it('字符串 → buff：多层', () => {
    const buff = 字符串转buff('灼烧', '2层|持续3回合');

    expect(buff.名).toBe('灼烧');
    expect(buff.持续).toBe(3);
    expect(buff.层数).toBe(2);
  });
});
