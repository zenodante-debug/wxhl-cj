import { describe, expect, it } from 'vitest';
import { 施加状态, 状态递减 } from '../engine/status';
import type { 状态条目 } from '../types';

describe('status · 状态管理', () => {
  it('施加状态：添加新状态', () => {
    const 状态列表: 状态条目[] = [];
    const 新状态列表 = 施加状态(状态列表, { 名: '流血', 持续: 3 });

    expect(新状态列表.length).toBe(1);
    expect(新状态列表[0].名).toBe('流血');
    expect(新状态列表[0].持续).toBe(3);
  });

  it('施加状态：同状态不叠加（后覆盖先）', () => {
    const 状态列表: 状态条目[] = [{ 名: '流血', 持续: 3 }];
    const 新状态列表 = 施加状态(状态列表, { 名: '流血', 持续: 5 });

    expect(新状态列表.length).toBe(1);
    expect(新状态列表[0].持续).toBe(5);
  });

  it('施加状态：可叠层状态', () => {
    const 状态列表: 状态条目[] = [{ 名: '灼烧', 持续: 3, 层数: 1 }];
    const 新状态列表 = 施加状态(状态列表, { 名: '灼烧', 持续: 3, 层数: 1 });

    expect(新状态列表.length).toBe(1);
    expect(新状态列表[0].层数).toBe(2);
  });

  it('状态递减：持续回合 -1', () => {
    const 状态列表: 状态条目[] = [{ 名: '流血', 持续: 3 }];
    const 新状态列表 = 状态递减(状态列表);

    expect(新状态列表[0].持续).toBe(2);
  });

  it('状态递减：持续到 0 移除', () => {
    const 状态列表: 状态条目[] = [{ 名: '流血', 持续: 1 }];
    const 新状态列表 = 状态递减(状态列表);

    expect(新状态列表.length).toBe(0);
  });
});
