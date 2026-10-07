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

describe('buffMapper · 数值修正（上 buff 的数字要能写回 MVU）', () => {
  it('带数值修正的状态 → 字符串里出现 @修正 段', () => {
    const 串 = buff转字符串({ 名: '强化咆哮', 持续: 2, 数值修正: { 伤害: 0.3 } });
    expect(串).toContain('@修正=伤害:0.3');
  });

  it('往返一致：数值修正被读回来', () => {
    const 原 = { 名: '强化咆哮', 持续: 2, 数值修正: { 伤害: 0.3, 减伤: -0.2 } };
    const 回 = 字符串转buff('强化咆哮', buff转字符串(原));

    expect(回.数值修正).toEqual({ 伤害: 0.3, 减伤: -0.2 });
    expect(回.持续).toBe(2);
  });

  it('**普通状态的字符串格式不变**（不破既有格式）', () => {
    expect(buff转字符串({ 名: '灼烧', 持续: 3, 层数: 2 })).toBe('2层|持续3回合');
    expect(buff转字符串({ 名: '定身', 持续: 1, 词条: ['禁位移'] })).toBe('持续1回合|禁位移');
  });

  it('没有数值修正时不写空段', () => {
    expect(buff转字符串({ 名: '定身', 持续: 1 })).toBe('持续1回合');
    expect(字符串转buff('定身', '持续1回合').数值修正).toBeUndefined();
  });

  it('数值修正与词条共存，两者都读得回来', () => {
    const 回 = 字符串转buff('强化咆哮', buff转字符串({ 名: '强化咆哮', 持续: 2, 数值修正: { 伤害: 0.3 }, 词条: ['不可净化'] }));

    expect(回.数值修正).toEqual({ 伤害: 0.3 });
    expect(回.词条).toEqual(['不可净化']);
  });

  it('坏值（非数字）被丢掉，不污染数值修正', () => {
    expect(字符串转buff('x', '持续2回合|@修正=伤害:abc').数值修正).toBeUndefined();
  });
});
