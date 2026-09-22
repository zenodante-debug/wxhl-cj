import { describe, expect, it } from 'vitest';
import { checkEffects, clampEffect, descaleCap, type EffectEntry } from '../effectRules';

describe('descaleCap · 常驻/触发/消耗上限', () => {
  it('一阶常驻 = 表值；触发/消耗 = 2 倍', () => {
    expect(descaleCap(1, '常驻')).toEqual({ 命中闪避: 6, 伤害百分比: 13, 属性加成: 1 });
    expect(descaleCap(1, '触发')).toEqual({ 命中闪避: 12, 伤害百分比: 26, 属性加成: 2 });
  });
  it('三阶常驻 = 13/27/3', () => {
    expect(descaleCap(3, '常驻')).toEqual({ 命中闪避: 13, 伤害百分比: 27, 属性加成: 3 });
  });
  it('五阶触发 = 40/80/12', () => {
    expect(descaleCap(5, '触发')).toEqual({ 命中闪避: 40, 伤害百分比: 80, 属性加成: 12 });
  });
});

describe('clampEffect · 超限钳回', () => {
  it('三阶常驻伤害 40% → 钳到 27%，并记录', () => {
    const e: EffectEntry = { 类型: '常驻', 描述: '锋锐', 伤害百分比: 40 };
    const r = clampEffect(e, 3);
    expect(r.entry.伤害百分比).toBe(27);
    expect(r.clamped.length).toBe(1);
  });
  it('触发类缺触发条件 → 降级为常驻并按常驻上限钳', () => {
    const e: EffectEntry = { 类型: '触发', 描述: '血怒', 伤害百分比: 50 };
    const r = clampEffect(e, 3);
    expect(r.entry.类型).toBe('常驻');
    expect(r.entry.伤害百分比).toBe(27);
    expect(r.clamped.some(s => s.includes('触发条件'))).toBe(true);
  });
  it('触发类写明条件则按 2 倍上限', () => {
    const e: EffectEntry = { 类型: '触发', 描述: '血怒', 伤害百分比: 50, 触发条件: '生命低于30%', 消耗: '每场2次' };
    expect(clampEffect(e, 3).entry.伤害百分比).toBe(50);
  });
  it('未填数值字段不受影响', () => {
    const e: EffectEntry = { 类型: '常驻', 描述: '纯风味' };
    expect(clampEffect(e, 1).clamped).toEqual([]);
  });
});

describe('checkEffects · 违禁与条数', () => {
  it('超过 2 条直接拒', () => {
    const 效果: EffectEntry[] = [
      { 类型: '常驻', 描述: 'a' }, { 类型: '常驻', 描述: 'b' }, { 类型: '常驻', 描述: 'c' },
    ];
    expect(checkEffects(效果, 1).ok).toBe(false);
  });
  it('无条件即死 / 永久无敌 被拒', () => {
    expect(checkEffects([{ 类型: '常驻', 描述: '无条件即死' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '获得永久无敌' }], 3).ok).toBe(false);
  });
  it('含条件与消耗的即死类通过', () => {
    const e: EffectEntry = { 类型: '消耗', 描述: '斩杀：目标生命低于15%时即死', 触发条件: '目标生命低于15%', 消耗: '每场1次' };
    expect(checkEffects([e], 4).ok).toBe(true);
  });
  it('违禁判定不被消耗字样解除（硬子句 + 消耗不豁免）', () => {
    // 消耗类描述里几乎必带「每场」，不得因此洗白即死
    expect(checkEffects([{ 类型: '消耗', 描述: '即死', 消耗: '每场1次' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '无条件即死，消耗1点体力' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '永久无敌；每回合开始时发动' }], 3).ok).toBe(false);
  });
  it('条件写在「触发条件」字段同样豁免即死禁令（AI 输出契约）', () => {
    // 描述只写效果本身、条件与消耗写在独立字段——这是 Task 4 的 AI 输出契约
    const e: EffectEntry = { 类型: '消耗', 描述: '即死', 触发条件: '目标生命低于15%', 消耗: '每场1次' };
    expect(checkEffects([e], 3).ok).toBe(true);
    // 同上但条件缺失 → 仍拒（消耗字段不豁免）
    expect(checkEffects([{ 类型: '消耗', 描述: '即死', 消耗: '每场1次' }], 3).ok).toBe(false);
  });
  it('无敌按「回合」限次豁免，消耗字样不得豁免', () => {
    expect(checkEffects([{ 类型: '常驻', 描述: '永久无敌；每回合开始时发动' }], 3).ok).toBe(false);
    // 消耗类词不得豁免无敌禁令（无「永久」硬子句时靠守卫兜住）
    expect(checkEffects([{ 类型: '常驻', 描述: '永久无敌，消耗1点MP' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '无敌，消耗1点MP' }], 3).ok).toBe(false);
    // 世界书约束：限定明确回合数的无敌是合法写法 → 放行
    expect(checkEffects([{ 类型: '常驻', 描述: '无敌3回合' }], 3).ok).toBe(true);
    expect(checkEffects([{ 类型: '常驻', 描述: '无敌，持续2回合' }], 3).ok).toBe(true);
  });
  it('必中核心/弱点/要害双向都算违禁，写明条件才放行', () => {
    expect(checkEffects([{ 类型: '常驻', 描述: '核心弱点必中' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '必中核心弱点' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '攻击要害，必中' }], 3).ok).toBe(false);
    // 只有消耗、没有条件 → 不豁免
    expect(checkEffects([{ 类型: '消耗', 描述: '攻击要害，必中（每场1次）', 消耗: '每场1次' }], 3).ok).toBe(false);
    // 条件写在「触发条件」字段 → 放行
    const 合法: EffectEntry = { 类型: '消耗', 描述: '攻击要害，必中', 触发条件: '目标暴露时', 消耗: '每场1次' };
    expect(checkEffects([合法], 3).ok).toBe(true);
  });
  it('合法效果返回钳制后的列表', () => {
    const r = checkEffects([{ 类型: '常驻', 描述: '锋锐', 伤害百分比: 99 }], 1);
    expect(r.ok).toBe(true);
    expect(r.效果[0].伤害百分比).toBe(13);
    expect(r.clamped.length).toBe(1);
  });
});
