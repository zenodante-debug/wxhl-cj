import { describe, expect, it } from 'vitest';
import { FEATURE_TAGS, SUB_MODULES, ipHeatOf, rollBuild, rollDie, tierIndexOf } from '../dice';

describe('rollDie', () => {
  it('始终落在 1..faces 内', () => {
    for (const faces of [3, 4, 6, 9, 40, 50]) {
      for (let i = 0; i < 2000; i++) {
        const v = rollDie(faces);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(faces);
      }
    }
  });

  it('1d1 恒为 1', () => {
    for (let i = 0; i < 50; i++) expect(rollDie(1)).toBe(1);
  });

  it('各面都能出现（1d6 掷 6000 次，每面至少 700 次）', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) counts[rollDie(6) - 1]++;
    for (const c of counts) expect(c).toBeGreaterThan(700);
  });
});

describe('骰表', () => {
  it('核心特色标签与副模块各有 50 项', () => {
    expect(FEATURE_TAGS).toHaveLength(50);
    expect(SUB_MODULES).toHaveLength(50);
  });

  it('第 41~50 项是日常标签', () => {
    expect(FEATURE_TAGS[40]).toContain('学园日常');
    expect(FEATURE_TAGS[49]).toContain('温馨家庭');
    expect(SUB_MODULES[40]).toContain('社团存续');
    expect(SUB_MODULES[49]).toContain('黄金日常');
  });
});

describe('ipHeatOf', () => {
  it('按 1-15 / 16-25 / 26-35 / 36-40 分档', () => {
    expect(ipHeatOf(1)).toBe('较冷门');
    expect(ipHeatOf(15)).toBe('较冷门');
    expect(ipHeatOf(16)).toBe('中等');
    expect(ipHeatOf(25)).toBe('中等');
    expect(ipHeatOf(26)).toBe('较热门');
    expect(ipHeatOf(35)).toBe('较热门');
    expect(ipHeatOf(36)).toBe('世界知名');
    expect(ipHeatOf(40)).toBe('世界知名');
  });
});

describe('rollBuild', () => {
  it('新手副本（周期 1）强制和平且不掷副本类型骰', () => {
    for (let i = 0; i < 200; i++) {
      const { build, records } = rollBuild(1, '一阶');
      expect(build.是新手副本).toBe(true);
      expect(build.副本类型).toBe('和平');
      expect(build.副本类型骰).toBeUndefined();
      expect(records.some(r => r.标签 === '副本类型')).toBe(false);
    }
  });

  it('非新手副本会掷副本类型骰，1=和平 2=阵营 3~4=血腥', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const { build } = rollBuild(2, '一阶');
      expect(build.是新手副本).toBe(false);
      expect(build.副本类型骰).toBeGreaterThanOrEqual(1);
      expect(build.副本类型骰).toBeLessThanOrEqual(4);
      // 日常副本（特色标签 41~50）的副本类型已被规则 §6 覆盖为「和平」, 而
      // 副本类型骰 仍保留 D4 原始值, 故原始映射断言只对非日常副本成立。
      // 覆盖行为由下一条用例「日常副本（特色标签 41~50）强制视为和平」断言。
      if (!build.是日常副本) {
        expect(build.副本类型).toBe(
          build.副本类型骰 === 1 ? '和平' : build.副本类型骰 === 2 ? '阵营' : '血腥',
        );
      }
      seen.add(build.副本类型);
    }
    expect(seen).toEqual(new Set(['和平', '阵营', '血腥']));
  });

  it('日常副本（特色标签 41~50）强制视为和平', () => {
    for (let i = 0; i < 20000; i++) {
      const { build } = rollBuild(2, '一阶');
      if (build.是日常副本) {
        expect(build.核心特色标签骰).toBeGreaterThanOrEqual(41);
        expect(build.副本类型).toBe('和平');
        return;
      }
    }
    throw new Error('20000 次都没掷出日常副本，骰表可能有问题');
  });

  it('时间限制落在 3~14 天', () => {
    for (let i = 0; i < 2000; i++) {
      const { build } = rollBuild(3, '一阶');
      expect(build.时间限制天).toBeGreaterThanOrEqual(3);
      expect(build.时间限制天).toBeLessThanOrEqual(14);
    }
  });

  it('记录的骰值与其映射一致', () => {
    const { build, records } = rollBuild(5, '一阶');
    const tag = records.find(r => r.标签 === '核心特色标签')!;
    expect(tag.骰值).toBe(build.核心特色标签骰);
    expect(tag.映射).toBe(build.核心特色标签);
  });

  it('周期为 1 但已非一阶 → 不是新手副本', () => {
    for (let i = 0; i < 200; i++) {
      const { build } = rollBuild(1, '二阶');
      expect(build.是新手副本).toBe(false);
      expect(build.副本类型骰).toBeGreaterThanOrEqual(1);   // 会正常掷 D4
    }
  });

  it('一阶但周期不为 1 → 不是新手副本', () => {
    for (let i = 0; i < 200; i++) {
      expect(rollBuild(2, '一阶').build.是新手副本).toBe(false);
    }
  });

  it('阶位写成 1阶 也认', () => {
    expect(rollBuild(1, '1阶').build.是新手副本).toBe(true);
  });

  it('tierIndexOf 归一两种写法, 未知返回 -1', () => {
    expect(tierIndexOf('一阶')).toBe(0);
    expect(tierIndexOf('1阶')).toBe(0);
    expect(tierIndexOf('五阶')).toBe(4);
    expect(tierIndexOf('5阶')).toBe(4);
    expect(tierIndexOf('超脱')).toBe(-1);
    expect(tierIndexOf('')).toBe(-1);
  });
});
