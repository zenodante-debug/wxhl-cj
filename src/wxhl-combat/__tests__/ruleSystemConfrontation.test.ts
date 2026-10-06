import { describe, expect, it } from 'vitest';
import { 规则系对抗 } from '../engine/ruleSystemJudge';

describe('ruleSystemJudge · 规则系对抗', () => {
  it('攻击方过，防御方没过 → 攻击方生效', () => {
    const 结果 = 规则系对抗(
      { 属性: { 实际: { STR: 150, AGI: 0, CON: 0, PER: 0 } }, 阶位: '五阶' },  // 攻击方修正 1595
      { 属性: { 实际: { STR: 0, AGI: 0, CON: 10, PER: 0 } }, 阶位: '一阶', 类型: '杂兵' },  // 防御方修正 5
      'STR',
      'CON',
      true,  // 攻击方过了
      false, // 防御方没过
    );

    expect(结果.赢家).toBe('攻击方');
  });

  it('攻击方没过，防御方过 → 防御方生效', () => {
    const 结果 = 规则系对抗(
      { 属性: { 实际: { STR: 10, AGI: 0, CON: 0, PER: 0 } }, 阶位: '一阶' },  // 攻击方修正 5
      { 属性: { 实际: { STR: 0, AGI: 0, CON: 150, PER: 0 } }, 阶位: '五阶', 类型: 'BOSS' },  // 防御方修正 1595
      'STR',
      'CON',
      false, // 攻击方没过
      true,  // 防御方过了
    );

    expect(结果.赢家).toBe('防御方');
  });

  it('都没过 → 正常结算', () => {
    const 结果 = 规则系对抗(
      { 属性: { 实际: { STR: 10, AGI: 0, CON: 0, PER: 0 } }, 阶位: '一阶' },
      { 属性: { 实际: { STR: 0, AGI: 0, CON: 10, PER: 0 } }, 阶位: '一阶', 类型: '杂兵' },
      'STR',
      'CON',
      false,
      false,
    );

    expect(结果.赢家).toBe('无');
  });

  it('都过了 → 拼修正值，攻击方高 → 攻击方赢', () => {
    const 结果 = 规则系对抗(
      { 属性: { 实际: { STR: 150, AGI: 0, CON: 0, PER: 0 } }, 阶位: '五阶' },  // STR修正 1595
      { 属性: { 实际: { STR: 0, AGI: 0, CON: 50, PER: 0 } }, 阶位: '三阶', 类型: '精英' },  // CON修正 180
      'STR',
      'CON',
      true,
      true,
    );

    expect(结果.赢家).toBe('攻击方');
  });

  it('都过了 → 拼修正值，防御方高 → 防御方赢', () => {
    const 结果 = 规则系对抗(
      { 属性: { 实际: { STR: 50, AGI: 0, CON: 0, PER: 0 } }, 阶位: '三阶' },  // STR修正 180
      { 属性: { 实际: { STR: 0, AGI: 0, CON: 150, PER: 0 } }, 阶位: '五阶', 类型: 'BOSS' },  // CON修正 1595
      'STR',
      'CON',
      true,
      true,
    );

    expect(结果.赢家).toBe('防御方');
  });

  it('都过了 → 修正相等 → 掷 1d2', () => {
    // 双方修正都是 180
    const 结果 = 规则系对抗(
      { 属性: { 实际: { STR: 50, AGI: 0, CON: 0, PER: 0 } }, 阶位: '三阶' },
      { 属性: { 实际: { STR: 0, AGI: 0, CON: 50, PER: 0 } }, 阶位: '三阶', 类型: '精英' },
      'STR',
      'CON',
      true,
      true,
    );

    // 掷 1d2，结果只能是攻击方或防御方
    expect(['攻击方', '防御方']).toContain(结果.赢家);
    expect(结果.骰值).toBeDefined();
    expect(结果.骰值).toBeGreaterThanOrEqual(1);
    expect(结果.骰值).toBeLessThanOrEqual(2);
  });
});
