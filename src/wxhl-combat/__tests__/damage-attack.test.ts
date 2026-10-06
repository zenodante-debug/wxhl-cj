import { describe, expect, it } from 'vitest';
import { 攻击结算 } from '../engine/damage';

describe('damage · 攻击结算', () => {
  it('普通攻击：命中 → 扣 HP', () => {
    const 攻方 = {
      属性: { 实际: { STR: 45, AGI: 16, CON: 30, PER: 16 } },
      阶位: '二阶',
    };
    const 守方 = {
      属性: { 实际: { STR: 20, AGI: 10, CON: 15, PER: 10 } },
      阶位: '一阶',
      HP_当前: 96,
      HP_最大: 96,
      闪避值: 10,
      防御: 5,
    };

    const 结果 = 攻击结算(攻方, 守方);

    expect(结果.命中).toBeDefined();
    if (结果.命中) {
      expect(结果.伤害).toBeGreaterThan(0);
      expect(结果.HP_新值).toBeLessThan(守方.HP_当前);
    }
  });

  it('未命中 → 不扣 HP', () => {
    const 攻方 = {
      属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } },
      阶位: '一阶',
    };
    const 守方 = {
      属性: { 实际: { STR: 50, AGI: 50, CON: 50, PER: 50 } },
      阶位: '五阶',
      HP_当前: 100,
      HP_最大: 100,
      闪避值: 999,
      防御: 50,
    };

    const 结果 = 攻击结算(攻方, 守方);

    if (!结果.命中) {
      expect(结果.HP_新值).toBe(守方.HP_当前);
    }
  });
});
