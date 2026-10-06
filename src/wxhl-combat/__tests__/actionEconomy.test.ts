import { describe, expect, it } from 'vitest';
import { 行动槽消耗, 行动槽重置 } from '../engine/actionEconomy';
import type { 行动槽 } from '../types';

describe('actionEconomy · 行动槽', () => {
  it('回合开始重置行动槽', () => {
    const 槽: 行动槽 = { 主要: 0, 次要: 0, 移动: 0, 反应: 0, 免费: 999 };
    const 新槽 = 行动槽重置(槽);

    expect(新槽.主要).toBe(1);
    expect(新槽.次要).toBe(1);
    expect(新槽.移动).toBe(1);
    expect(新槽.反应).toBe(1);
  });

  it('使用主要行动扣 1', () => {
    const 槽: 行动槽 = { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 };
    const 新槽 = 行动槽消耗(槽, '主要行动');

    expect(新槽.主要).toBe(0);
    expect(新槽.次要).toBe(1);
  });

  it('使用次要行动扣 1', () => {
    const 槽: 行动槽 = { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 };
    const 新槽 = 行动槽消耗(槽, '次要行动');

    expect(新槽.次要).toBe(0);
  });

  it('使用移动扣 1', () => {
    const 槽: 行动槽 = { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 };
    const 新槽 = 行动槽消耗(槽, '移动');

    expect(新槽.移动).toBe(0);
  });

  it('使用反应动作扣 1', () => {
    const 槽: 行动槽 = { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 };
    const 新槽 = 行动槽消耗(槽, '反应动作');

    expect(新槽.反应).toBe(0);
  });

  it('行动槽不足应该抛错', () => {
    const 槽: 行动槽 = { 主要: 0, 次要: 1, 移动: 1, 反应: 1, 免费: 999 };

    expect(() => 行动槽消耗(槽, '主要行动')).toThrow('行动槽不足');
  });
});
