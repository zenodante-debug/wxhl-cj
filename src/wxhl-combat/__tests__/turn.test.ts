import { describe, expect, it } from 'vitest';
import { 推进 } from '../engine/turn';
import type { 战斗状态 } from '../types';

describe('turn · 回合状态机', () => {
  it('开始回合：回合数 +1', () => {
    const 状态: 战斗状态 = {
      进行中: true,
      回合: 1,
      先攻: ['玩家', '敌人'],
      单位: {},
      待决: null,
      领域: [],
    };

    const { 状态: 新状态 } = 推进(状态, { 类: '开始回合' });

    expect(新状态.回合).toBe(2);
  });

  it('开始回合：清空待决点', () => {
    const 状态: 战斗状态 = {
      进行中: true,
      回合: 1,
      先攻: ['玩家', '敌人'],
      单位: {},
      待决: { 类: '防御', 攻方: '敌人', 守方: '玩家', 伤害: 10 },
      领域: [],
    };

    const { 状态: 新状态 } = 推进(状态, { 类: '开始回合' });

    expect(新状态.待决).toBe(null);
  });
});
