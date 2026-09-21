import { describe, expect, it } from 'vitest';
import {
  applyBuildOverrides,
  ERAS,
  FEATURE_TAGS,
  GENRES,
  rollBuild,
  SUB_MODULES,
  type BuildRoll,
  type RollRecord,
} from '../dice';

/** 手工构造一份确定性的非新手、非日常构建骰，避免依赖随机数 */
function makeBuild(over: Partial<BuildRoll> = {}): BuildRoll {
  return {
    副本类型: '血腥',
    副本类型骰: 3,
    媒介来源: '动漫作品',
    题材大类: '奇幻/神话',
    时代背景: '现代/当代',
    核心特色标签: FEATURE_TAGS[0],
    核心特色标签骰: 1,
    副模块: SUB_MODULES[0],
    副模块骰: 1,
    IP热度: '较冷门',
    IP热度骰: 3,
    时间限制天: 7,
    是新手副本: false,
    是日常副本: false,
    ...over,
  };
}

function makeRecords(): RollRecord[] {
  return [
    { 标签: '副本类型', 表达式: '1d4', 骰值: 3, 映射: '血腥' },
    { 标签: '媒介来源', 表达式: '1d6', 骰值: 2, 映射: '动漫作品' },
    { 标签: '题材大类', 表达式: '1d6', 骰值: 1, 映射: '奇幻/神话' },
    { 标签: '时代背景', 表达式: '1d6', 骰值: 4, 映射: '现代/当代' },
    { 标签: '核心特色标签', 表达式: '1d50', 骰值: 1, 映射: FEATURE_TAGS[0] },
    { 标签: '副模块', 表达式: '1d50', 骰值: 1, 映射: SUB_MODULES[0] },
    { 标签: 'IP热度', 表达式: '1d40', 骰值: 3, 映射: '较冷门' },
    { 标签: '时间限制', 表达式: '1d12+2', 骰值: 5, 映射: '7天' },
  ];
}

describe('applyBuildOverrides', () => {
  it('覆盖四个属性：build 字段更新，对应记录标记「自选」且骰值为表内序号', () => {
    const { build, records } = applyBuildOverrides(makeBuild(), makeRecords(), {
      题材大类: GENRES[2],
      时代背景: ERAS[0],
      核心特色标签: FEATURE_TAGS[9],
      副模块: SUB_MODULES[20],
    });

    expect(build.题材大类).toBe(GENRES[2]);
    expect(build.时代背景).toBe(ERAS[0]);
    expect(build.核心特色标签).toBe(FEATURE_TAGS[9]);
    expect(build.核心特色标签骰).toBe(10);
    expect(build.副模块).toBe(SUB_MODULES[20]);
    expect(build.副模块骰).toBe(21);

    for (const [标签, 骰值, 映射] of [
      ['题材大类', 3, GENRES[2]],
      ['时代背景', 1, ERAS[0]],
      ['核心特色标签', 10, FEATURE_TAGS[9]],
      ['副模块', 21, SUB_MODULES[20]],
    ] as const) {
      const rec = records.find(r => r.标签 === 标签);
      expect(rec, 标签).toBeDefined();
      expect(rec!.表达式).toBe('自选');
      expect(rec!.骰值).toBe(骰值);
      expect(rec!.映射).toBe(映射);
    }
    // 未覆盖的记录原样保留，总条数不变
    expect(records.find(r => r.标签 === '副本类型')!.表达式).toBe('1d4');
    expect(records.find(r => r.标签 === 'IP热度')!.映射).toBe('较冷门');
    expect(records).toHaveLength(8);
  });

  it('未覆盖的项保持掷骰结果', () => {
    const { build, records } = applyBuildOverrides(makeBuild(), makeRecords(), { 副模块: SUB_MODULES[7] });
    expect(build.副模块).toBe(SUB_MODULES[7]);
    expect(build.题材大类).toBe('奇幻/神话');
    expect(build.核心特色标签骰).toBe(1);
    expect(records.find(r => r.标签 === '题材大类')!.表达式).toBe('1d6');
  });

  it('自选日常标签（41~50）触发日常调和规则：强制和平并补覆盖记录', () => {
    const { build, records } = applyBuildOverrides(makeBuild(), makeRecords(), {
      核心特色标签: FEATURE_TAGS[44], // 骰值 45 ≥ 41 → 日常
    });
    expect(build.是日常副本).toBe(true);
    expect(build.副本类型).toBe('和平');
    expect(build.副本类型被日常规则覆盖).toBe(true);
    const cover = records.find(r => r.标签 === '副本类型（日常规则覆盖）');
    expect(cover).toBeDefined();
    expect(cover!.骰值).toBe(45);
  });

  it('从日常覆盖回非日常标签：恢复原始副本类型骰并移除覆盖记录', () => {
    const dailyBuild = makeBuild({
      副本类型: '和平',
      副本类型被日常规则覆盖: true,
      核心特色标签: FEATURE_TAGS[44],
      核心特色标签骰: 45,
      是日常副本: true,
    });
    const dailyRecords = [
      ...makeRecords().map(r => (r.标签 === '副本类型' ? { ...r, 映射: '和平' } : r)),
      { 标签: '副本类型（日常规则覆盖）', 表达式: '规则 §6', 骰值: 45, 映射: '日常副本强制视为和平' },
    ];
    const { build, records } = applyBuildOverrides(dailyBuild, dailyRecords, {
      核心特色标签: FEATURE_TAGS[0], // 骰值 1 → 非日常
    });
    expect(build.是日常副本).toBe(false);
    expect(build.副本类型).toBe('血腥'); // 从 副本类型骰=3 恢复
    expect(build.副本类型被日常规则覆盖).toBeUndefined();
    expect(records.some(r => r.标签 === '副本类型（日常规则覆盖）')).toBe(false);
  });

  it('日常换日常：仍为日常且保持和平', () => {
    const { build } = applyBuildOverrides(
      makeBuild({ 副本类型: '和平', 副本类型被日常规则覆盖: true, 核心特色标签骰: 45, 是日常副本: true }),
      makeRecords(),
      { 核心特色标签: FEATURE_TAGS[48] },
    );
    expect(build.是日常副本).toBe(true);
    expect(build.副本类型).toBe('和平');
    expect(build.副本类型被日常规则覆盖).toBe(true);
  });

  it('非法值（不在骰表内）直接抛错', () => {
    expect(() => applyBuildOverrides(makeBuild(), makeRecords(), { 副模块: '不存在的模块' })).toThrow();
    expect(() => applyBuildOverrides(makeBuild(), makeRecords(), { 题材大类: '魔幻' })).toThrow();
  });

  it('不修改传入的 build 与 records（纯函数）', () => {
    const build = makeBuild();
    const records = makeRecords();
    const snapshot = JSON.stringify({ build, records });
    applyBuildOverrides(build, records, { 副模块: SUB_MODULES[9], 核心特色标签: FEATURE_TAGS[44] });
    expect(JSON.stringify({ build, records })).toBe(snapshot);
  });

  it('覆盖媒介来源：build 字段更新，记录标记「自选」', () => {
    const { build, records } = applyBuildOverrides(makeBuild(), makeRecords(), {
      媒介来源: '电子游戏',
    });
    expect(build.媒介来源).toBe('电子游戏');
    const rec = records.find(r => r.标签 === '媒介来源');
    expect(rec).toBeDefined();
    expect(rec!.表达式).toBe('自选');
    expect(rec!.骰值).toBe(3); // MEDIA_SOURCES 中「电子游戏」为第 3 项
    expect(rec!.映射).toBe('电子游戏');
    // 其余字段不受影响
    expect(build.题材大类).toBe('奇幻/神话');
  });

  it('媒介来源非法值抛错', () => {
    expect(() => applyBuildOverrides(makeBuild(), makeRecords(), { 媒介来源: '口耳相传' })).toThrow();
  });

  it('与 rollBuild 集成：覆盖后日常标记与标签骰值一致', () => {
    for (let i = 0; i < 50; i++) {
      const rolled = rollBuild(5, '二阶');
      const { build } = applyBuildOverrides(rolled.build, rolled.records, {
        核心特色标签: FEATURE_TAGS[i % 50],
      });
      expect(build.是日常副本).toBe(build.核心特色标签骰 >= 41);
      if (build.是日常副本) expect(build.副本类型).toBe('和平');
    }
  });
});
