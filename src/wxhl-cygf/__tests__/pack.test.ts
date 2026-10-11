import { describe, expect, it } from 'vitest';
import { ContentPack, ExtensionPack } from '../pack';
import { BuildPayload } from '../pack/build';
import { CharacterPayload } from '../pack/character';

const manifestBase = {
  format: 'wxhl-mod@1',
  id: 'pack-001',
  name: '雾中列车',
  version: '1.0.0',
  author: { name: '测试作者', discord: 'test#0001' },
};

const greenEntry = { name: '列车时刻表', content: '……正文……', keys: ['雾中列车', '列车'] };

describe('ExtensionPack · 扩展包', () => {
  it('绿灯条目（带关键词）→ 通过', () => {
    const pack = ExtensionPack.parse({ ...manifestBase, type: 'extension', worldbookEntries: [greenEntry] });
    expect(pack.worldbookEntries[0].position).toBe('after_char');
    expect(pack.worldbookEntries[0].probability).toBe(100);
  });

  it('绿灯条目没给关键词 → 拒绝（绿灯必须能被触发）', () => {
    const result = ExtensionPack.safeParse({
      ...manifestBase,
      type: 'extension',
      worldbookEntries: [{ name: 'x', content: 'y' }],
    });
    expect(result.success).toBe(false);
  });

  it('蓝灯条目（constant: true）无关键词 → 通过', () => {
    const result = ExtensionPack.safeParse({
      ...manifestBase,
      type: 'extension',
      worldbookEntries: [{ name: 'x', content: 'y', constant: true }],
    });
    expect(result.success).toBe(true);
  });

  it('worldbookEntries 为空数组 → 拒绝', () => {
    expect(ExtensionPack.safeParse({ ...manifestBase, type: 'extension', worldbookEntries: [] }).success).toBe(false);
  });
});

describe('BuildPayload · 构筑载荷（对齐主卡实体结构）', () => {
  const build = {
    构筑名: '重装堡垒',
    定位: '物理破坏配合高容错换血',
    属性基础: { STR: 10, AGI: 5, CON: 12, PER: 6 },
    通用技能: { 横扫: { 类型: '主动', 消耗: '10MP' } },
    装备: { 主武器: { 名称: '斩首大剑', 伤害骰: '2d6', 倍率: 1.5 } },
  };

  it('合法构筑 → 通过，缺省字段填默认', () => {
    const parsed = BuildPayload.parse(build);
    expect(parsed.装备.主武器.名称).toBe('斩首大剑');
    expect(parsed.装备.头部.名称).toBe('无');
    expect(parsed.天赋.名称).toBe('无');
    expect(parsed.背包建议).toEqual({});
  });

  it('缺构筑名/定位 → 拒绝', () => {
    expect(BuildPayload.safeParse({ ...build, 构筑名: '' }).success).toBe(false);
    expect(BuildPayload.safeParse({ ...build, 定位: '' }).success).toBe(false);
  });

  it('二次 parse 幂等', () => {
    const once = BuildPayload.parse(build);
    expect(BuildPayload.parse(once)).toEqual(once);
  });
});

describe('CharacterPayload · 同人角色载荷', () => {
  const character = {
    构筑名: '雾中剑客',
    定位: '高闪避叠加流血',
    外貌: '……',
    背景: '……',
  };

  it('合法角色 → 通过，建议类型默认 其他契约者', () => {
    const parsed = CharacterPayload.parse(character);
    expect(parsed.建议类型).toBe('其他契约者');
    expect(parsed.属性基础.STR).toBe(5);
  });

  it('缺外貌/背景 → 拒绝', () => {
    expect(CharacterPayload.safeParse({ ...character, 外貌: '' }).success).toBe(false);
    expect(CharacterPayload.safeParse({ ...character, 背景: '' }).success).toBe(false);
  });
});

describe('ContentPack · 联合判别', () => {
  it('按 type 分发到对应 schema', () => {
    const ext = ContentPack.safeParse({ ...manifestBase, type: 'extension', worldbookEntries: [greenEntry] });
    expect(ext.success).toBe(true);
    const bad = ContentPack.safeParse({ ...manifestBase, type: 'build' });
    expect(bad.success).toBe(false); // build 缺 build 载荷
  });

  it.each([
    ['format 不对', { ...manifestBase, format: 'wxhl-mod@0', type: 'extension', worldbookEntries: [greenEntry] }],
    ['version 不是 x.y.z', { ...manifestBase, version: 'v1', type: 'extension', worldbookEntries: [greenEntry] }],
    ['未知 type', { ...manifestBase, type: 'script', worldbookEntries: [greenEntry] }],
  ])('%s → 拒绝', (_label, data) => {
    expect(ContentPack.safeParse(data).success).toBe(false);
  });
});
