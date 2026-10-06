import { describe, expect, it } from 'vitest';
import { 规则系判定 } from '../engine/ruleSystemJudge';

describe('ruleSystemJudge · 规则系能力判定', () => {
  it('判定值 = 1d20 + 关联属性修正', () => {
    // 一阶 STR=10 → STR修正 = 5
    // 1d20 范围 1~20，所以判定值范围 6~25
    for (let i = 0; i < 100; i++) {
      const 结果 = 规则系判定('穿透', { 属性: { 实际: { STR: 10, AGI: 0, CON: 0, PER: 0 } }, 阶位: '一阶' }, { 属性: { 实际: { STR: 0, AGI: 0, CON: 10, PER: 0 } }, 阶位: '一阶', 类型: '杂兵' });
      expect(结果.判定值).toBeGreaterThanOrEqual(6);
      expect(结果.判定值).toBeLessThanOrEqual(25);
    }
  });

  it('对抗目标 = (基础DC + 目标属性修正) × 类型系数 + 目标属性修正', () => {
    // 目标：一阶杂兵，CON=10 → CON修正 = 5
    // 基础DC = 35，类型系数 = 0.6
    // 对抗目标 = (35 + 5) × 0.6 + 5 = 29
    const 结果 = 规则系判定('穿透', { 属性: { 实际: { STR: 50, AGI: 0, CON: 0, PER: 0 } }, 阶位: '一阶' }, { 属性: { 实际: { STR: 0, AGI: 0, CON: 10, PER: 0 } }, 阶位: '一阶', 类型: '杂兵' });

    expect(结果.对抗目标).toBe(29);
  });

  it('判定值 ≥ 对抗目标 → 成功', () => {
    // 攻击方：五阶 STR=150 → STR修正 = 1595
    // 防御方：一阶杂兵 CON=10 → CON修正 = 5，对抗目标 = 29
    const 结果 = 规则系判定('穿透', { 属性: { 实际: { STR: 150, AGI: 0, CON: 0, PER: 0 } }, 阶位: '五阶' }, { 属性: { 实际: { STR: 0, AGI: 0, CON: 10, PER: 0 } }, 阶位: '一阶', 类型: '杂兵' });

    expect(结果.成功).toBe(true);
  });

  it('判定值 < 对抗目标 → 失败', () => {
    // 攻击方：一阶 STR=10 → STR修正 = 5
    // 防御方：五阶 BOSS CON=150 → CON修正 = 1595，对抗目标 = (1925 + 1595) × 1.2 + 1595 = 5819
    const 结果 = 规则系判定('穿透', { 属性: { 实际: { STR: 10, AGI: 0, CON: 0, PER: 0 } }, 阶位: '一阶' }, { 属性: { 实际: { STR: 0, AGI: 0, CON: 150, PER: 0 } }, 阶位: '五阶', 类型: 'BOSS' });

    expect(结果.成功).toBe(false);
  });
});
