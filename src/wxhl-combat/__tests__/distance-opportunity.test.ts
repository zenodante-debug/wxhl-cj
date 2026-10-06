import { describe, expect, it } from 'vitest';
import { 借机攻击判定 } from '../engine/distance';

describe('distance · 借机攻击', () => {
  it('从贴身(0米)脱离到近距(5米) → 不触发借机攻击（还在近战带内）', () => {
    expect(借机攻击判定(0, 5, {})).toBe(false);
  });

  it('从近距(8米)脱离到中距(15米) → 触发借机攻击', () => {
    expect(借机攻击判定(8, 15, {})).toBe(true);
  });

  it('从中距(15米)到远距(60米) → 不触发借机攻击', () => {
    expect(借机攻击判定(15, 60, {})).toBe(false);
  });

  it('从远距(60米)到超远距(400米) → 不触发借机攻击', () => {
    expect(借机攻击判定(60, 400, {})).toBe(false);
  });

  it('用位移技能脱离 → 免除借机攻击', () => {
    expect(借机攻击判定(0, 5, { 位移技能: '弧光步' })).toBe(false);
  });

  it('对方已用过反应动作 → 免除借机攻击', () => {
    expect(借机攻击判定(0, 5, { 对方反应已用: true })).toBe(false);
  });

  it('对方被控/失能 → 免除借机攻击', () => {
    expect(借机攻击判定(0, 5, { 对方被控: true })).toBe(false);
  });

  it('以次要行动做脱离准备 → 免除借机攻击', () => {
    expect(借机攻击判定(0, 5, { 脱离准备: true })).toBe(false);
  });
});
