import { describe, expect, it } from 'vitest';
import { 构建收尾提示词 } from '../ai/aftermath';
import type { 结算步骤 } from '../types';

describe('aftermath · 收尾正文', () => {
  it('构建收尾提示词：包含战报', () => {
    const 步骤列表: 结算步骤[] = [
      { 类: '攻击', 内容: '玩家命中敌人，造成 16 点伤害', 单位: '玩家' },
      { 类: '攻击', 内容: '敌人攻击玩家，造成 8 点伤害', 单位: '敌人' },
      { 类: '击杀', 内容: '敌人被击杀', 单位: '敌人' },
    ];

    const 提示词 = 构建收尾提示词(步骤列表);

    expect(提示词).toContain('玩家命中敌人');
    expect(提示词).toContain('敌人被击杀');
  });
});
