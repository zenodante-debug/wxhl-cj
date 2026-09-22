import { describe, expect, it } from 'vitest';
import { sanitizeDesign, type DesignTarget } from '../blueprintAI';

const 目标: DesignTarget = {
  名称: '狼王牙刃', 成品类型: '装备', 子类: '短剑', 品质: '金色', 阶位: 3,
  核心材料: '深渊魔狼王的牙', 行业: '锻造',
};

/** AI 返回的原始 JSON（模拟） */
function rawAI(patch: Record<string, unknown> = {}) {
  return {
    名称: '狼王牙刃', 品质: '金色', 阶位: 3, 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
    装备基础: '短剑', 描述: '以魔狼之牙锻造的利刃',
    材料: [{ 类别: '怪物素材', 数量: 1, 核心: true }, { 类别: '金属', 数量: 2, 核心: false }],
    效果: [{ 类型: '触发', 描述: '撕咬：命中时附加流血', 伤害百分比: 12, 触发条件: '命中时', 消耗: '每场3次' }],
    ...patch,
  };
}

describe('sanitizeDesign · AI 结果硬校验', () => {
  it('合法输入 → 生成完整图纸数据', () => {
    const r = sanitizeDesign(rawAI(), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.名称).toBe('狼王牙刃');
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.技能要求).toEqual({ 分类: '高级', 等级: 1 }); // 金=高级Lv.1
    expect(r.数据.制作者).toBe('AI');
    expect(r.数据.补全).toBe(false);
  });
  it('超限数值被钳回并记录', () => {
    const r = sanitizeDesign(rawAI({ 效果: [{ 类型: '常驻', 描述: '锋锐', 伤害百分比: 99 }] }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.效果[0].伤害百分比).toBe(27);
    expect(r.clamped.length).toBe(1);
  });
  it('违禁效果 → 拒绝并给理由', () => {
    const r = sanitizeDesign(rawAI({ 效果: [{ 类型: '常驻', 描述: '获得永久无敌' }] }), 目标);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('违禁');
  });
  it('银色品质 → 拒绝（世界书不可制作）', () => {
    const r = sanitizeDesign(rawAI({ 品质: '银色' }), 目标);
    expect(r.ok).toBe(false);
  });
  it('品质/成品类型与目标不符 → 强制回到目标值', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色', 阶位: 5 }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.阶位).toBe(3);
  });
  it('缺材料 → 拒绝', () => {
    const r = sanitizeDesign(rawAI({ 材料: [] }), 目标);
    expect(r.ok).toBe(false);
  });
  it('紫色 = 高级技能 Lv.5', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色' }), { ...目标, 品质: '紫色' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.技能要求).toEqual({ 分类: '高级', 等级: 5 });
  });
});

// 装备基础必须落在真实数值表里：AI 编造的武器名/光谱会流进 buildEquip 产出坏物品
describe('sanitizeDesign · 装备基础参照校验', () => {
  it('子类=法杖（WEAPON_TABLE 键）→ 装备子类「武器」，装备基础原样保留', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '法杖' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('武器');
    expect(r.数据.配方.装备基础).toBe('法杖');
  });
  it('子类=魔杖（WEAPON_TABLE 键）→ 装备子类「武器」（旧三元会误判为防具）', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '魔杖' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('武器');
  });
  it('子类=重装（防具光谱）→ 装备子类「防具」', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '重装' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('防具');
    expect(r.数据.配方.装备基础).toBe('重装');
  });
  it('子类=极轻（防具光谱）→ 装备子类「防具」', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '极轻' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('防具');
  });
  it('子类=不存在的武器 → 拒绝并给理由', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '不存在的武器' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('未知的装备基础');
  });
  it('消耗品 → 装备基础与装备子类一律为空串（AI 编造的基础被丢弃）', () => {
    const r = sanitizeDesign(rawAI({ 装备基础: '不存在的武器' }), { ...目标, 成品类型: '消耗品', 子类: '' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备基础).toBe('');
    expect(r.数据.配方.装备子类).toBe('');
  });
});
