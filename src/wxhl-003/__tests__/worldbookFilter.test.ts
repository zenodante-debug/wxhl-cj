import { describe, expect, it } from 'vitest';
import { filterWorldbookEntries } from '../store';

const 条目 = [
  { name: '副本角色生成规则', content: 'A', enabled: true },
  { name: '技能模版和限制', content: 'B', enabled: true },
  { name: '某个关灯条目', content: 'C', enabled: false },
  { name: '装备与消耗品系统', content: 'D' },   // enabled 缺省 = 启用
];

describe('filterWorldbookEntries', () => {
  it('filter 为 null / undefined 时 = 整本全取（只按 enabled 过滤）', () => {
    for (const f of [null, undefined]) {
      const r = filterWorldbookEntries(条目, f);
      expect(r.map(e => e.name)).toEqual(['副本角色生成规则', '技能模版和限制', '装备与消耗品系统']);
    }
  });

  it('filter 为空数组时什么都不取（用户全不选）', () => {
    expect(filterWorldbookEntries(条目, [])).toEqual([]);
  });

  it('filter 指定条目时只取这些，且仍排除 enabled:false', () => {
    expect(filterWorldbookEntries(条目, ['技能模版和限制', '某个关灯条目']).map(e => e.name))
      .toEqual(['技能模版和限制']);
  });

  it('filter 里有不存在的条目名时静默忽略', () => {
    expect(filterWorldbookEntries(条目, ['不存在的东西', '技能模版和限制']).map(e => e.name))
      .toEqual(['技能模版和限制']);
  });
});
