import { describe, expect, it } from 'vitest';
import { composeRewardText, itemTypeOf, qualityOf, rollRewards } from '../dice';

describe('qualityOf / itemTypeOf', () => {
  const 支线品质 = [[1, '白色'], [4, '蓝色'], [6, '金色']] as const;
  const 支线类型 = [[4, '消耗品'], [7, '装备'], [9, '技能卷轴']] as const;

  it('按区间右端点取档', () => {
    expect(qualityOf(支线品质, 1)).toBe('白色');
    expect(qualityOf(支线品质, 2)).toBe('蓝色');
    expect(qualityOf(支线品质, 4)).toBe('蓝色');
    expect(qualityOf(支线品质, 5)).toBe('金色');
    expect(qualityOf(支线品质, 6)).toBe('金色');
  });

  it('类型区间同理', () => {
    expect(itemTypeOf(支线类型, 1)).toBe('消耗品');
    expect(itemTypeOf(支线类型, 4)).toBe('消耗品');
    expect(itemTypeOf(支线类型, 5)).toBe('装备');
    expect(itemTypeOf(支线类型, 7)).toBe('装备');
    expect(itemTypeOf(支线类型, 8)).toBe('技能卷轴');
    expect(itemTypeOf(支线类型, 9)).toBe('技能卷轴');
  });

  it('超出区间时抛出而不是静默返回错误值', () => {
    expect(() => qualityOf(支线品质, 7)).toThrow();
  });
});

describe('rollRewards', () => {
  it('数量正确: 主线 1 / 支线 3 / 隐藏 2 / 成就 6', () => {
    const { rewards } = rollRewards();
    expect(rewards.支线).toHaveLength(3);
    expect(rewards.隐藏).toHaveLength(2);
    expect(rewards.成就).toHaveLength(6);
  });

  it('共掷出 53 个奖励骰', () => {
    const { records } = rollRewards();
    expect(records).toHaveLength(53);
  });

  it('各奖励项的数值落在规则区间内', () => {
    for (let i = 0; i < 500; i++) {
      const { rewards } = rollRewards();
      expect(rewards.主线.up).toBeGreaterThanOrEqual(251);
      expect(rewards.主线.up).toBeLessThanOrEqual(350);
      expect(rewards.主线.exp).toBeGreaterThanOrEqual(151);
      expect(rewards.主线.exp).toBeLessThanOrEqual(250);

      for (const s of rewards.支线) {
        expect(s.up).toBeGreaterThanOrEqual(51);
        expect(s.up).toBeLessThanOrEqual(200);
        expect(s.exp).toBeGreaterThanOrEqual(21);
        expect(s.exp).toBeLessThanOrEqual(50);
      }
      for (const h of rewards.隐藏) {
        expect(h.up).toBeGreaterThanOrEqual(301);
        expect(h.up).toBeLessThanOrEqual(500);
        expect(h.rp).toBeGreaterThanOrEqual(1);
        expect(h.rp).toBeLessThanOrEqual(3);
      }
      // ★ 固定 1 RP; ★★ 1~3; ★★★ 2~4; ★★★★ 3~5; ★★★★★ 4~6; ★★★★★★ 5~7
      expect(rewards.成就[0].rp).toBe(1);
      expect(rewards.成就[1].rp).toBeGreaterThanOrEqual(1);
      expect(rewards.成就[1].rp).toBeLessThanOrEqual(3);
      expect(rewards.成就[2].rp).toBeGreaterThanOrEqual(2);
      expect(rewards.成就[2].rp).toBeLessThanOrEqual(4);
      expect(rewards.成就[3].rp).toBeGreaterThanOrEqual(3);
      expect(rewards.成就[3].rp).toBeLessThanOrEqual(5);
      expect(rewards.成就[4].rp).toBeGreaterThanOrEqual(4);
      expect(rewards.成就[4].rp).toBeLessThanOrEqual(6);
      expect(rewards.成就[5].rp).toBeGreaterThanOrEqual(5);
      expect(rewards.成就[5].rp).toBeLessThanOrEqual(7);
    }
  });

  it('成就 UP 随梯度递增（区间不重叠）', () => {
    const { rewards } = rollRewards();
    for (let i = 1; i < 6; i++) {
      expect(rewards.成就[i].up).toBeGreaterThan(rewards.成就[i - 1].up);
    }
  });

  it('★★★★ 及以上只会出蓝/金/紫/银, 不会出白', () => {
    for (let i = 0; i < 3000; i++) {
      const { rewards } = rollRewards();
      for (const a of rewards.成就.slice(3)) expect(a.quality).not.toBe('白色');
    }
  });

  it('★★★★★★ 的类型只会是 装备/技能卷轴/特殊', () => {
    for (let i = 0; i < 3000; i++) {
      const { rewards } = rollRewards();
      expect(['装备', '技能卷轴', '特殊']).toContain(rewards.成就[5].itemType);
    }
  });
});

describe('composeRewardText', () => {
  it('主线格式: UP + EXP', () => {
    expect(
      composeRewardText({ up: 342, exp: 187, rp: 0, quality: '蓝色', itemType: '装备' }, ''),
    ).toBe('342 UP + 187 EXP');
  });

  it('带 RP 时插入 RP 段', () => {
    expect(
      composeRewardText({ up: 400, exp: 200, rp: 2, quality: '金色', itemType: '消耗品' }, '圣水'),
    ).toBe('400 UP + 200 EXP + 2 RP + 【金色】消耗品：圣水');
  });

  it('无物品名时省略物品段', () => {
    expect(
      composeRewardText({ up: 400, exp: 200, rp: 2, quality: '金色', itemType: '消耗品' }, ''),
    ).toBe('400 UP + 200 EXP + 2 RP');
  });
});
