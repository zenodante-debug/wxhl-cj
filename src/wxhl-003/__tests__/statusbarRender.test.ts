// 状态栏渲染器：纯函数，只吐 HTML 字符串。
import { describe, expect, it } from 'vitest';
import { joinPath, renderCareerSection, renderResourceTree, renderSpecialStatusList, statusKind } from '../statusbar/render';

describe('joinPath', () => {
  it('普通键直接拼', () => {
    expect(joinPath('契约者.特殊资源', '职业')).toBe('契约者.特殊资源.职业');
  });
  it('键里的点走方括号写法', () => {
    expect(joinPath('契约者.特殊资源', '魔能.爆裂')).toBe("契约者.特殊资源['魔能.爆裂']");
  });
  it('round-trip：转义后的路径能被 lodash 读回同一条', () => {
    const obj: any = { 职业: { '魔能.爆裂': { 当前: 1 } } };
    expect(_.get(obj, joinPath('职业', '魔能.爆裂') + '.当前')).toBe(1);
    _.set(obj, joinPath('职业', '魔能.爆裂') + '.当前', 7);
    expect(obj.职业['魔能.爆裂'].当前).toBe(7);
  });
});

describe('statusKind', () => {
  it.each([
    ['增益', '增益'],
    ['强化', '增益'],
    ['buff', '增益'],
    ['BUFF', '增益'],
    ['减益', '减益'],
    ['负面', '减益'],
    ['debuff', '减益'],
    ['其他', '其他'],
    ['', '其他'],
  ])('%s → %s', (input, expected) => {
    expect(statusKind(input)).toBe(expected);
  });
  it('认不出（undefined / null）归其他', () => {
    expect(statusKind(undefined)).toBe('其他');
    expect(statusKind(null)).toBe('其他');
  });
});

describe('renderSpecialStatusList', () => {
  it('旧字符串格式：原样显示、标签归其他、内容可编辑', () => {
    const h = renderSpecialStatusList({ 中毒: '每回合掉 3 血' }, '契约者.状态.特殊状态');
    expect(h).toContain('tag-gray');
    expect(h).toContain('其他');
    expect(h).toContain('每回合掉 3 血');
    expect(h).toContain('data-path="契约者.状态.特殊状态.中毒"');
    expect(h).not.toContain('[object Object]');
  });

  it('结构化格式：分类上色 + 说明/层数/持续/来源', () => {
    const h = renderSpecialStatusList(
      {
        狂暴: { 分类: '增益', 说明: '攻击 +30%', 来源: '血统', 持续时间: '3 回合', 层数: 2 },
      },
      '契约者.状态.特殊状态',
    );
    expect(h).toContain('tag-green');
    expect(h).toContain('增益');
    expect(h).toContain('攻击 +30%');
    expect(h).toContain('3 回合');
    expect(h).toContain('血统');
    expect(h).toContain('data-path="契约者.状态.特殊状态.狂暴.层数"');
    expect(h).toContain('层');
  });

  it('缺省字段不渲染：没有层数就没有「层」字', () => {
    const h = renderSpecialStatusList({ 虚弱: { 分类: '减益', 说明: '力气小' } }, 'p');
    expect(h).toContain('tag-red');
    expect(h).not.toContain('层');
    expect(h).not.toContain('持续：');
    expect(h).not.toContain('来源：');
  });

  it('兼容旧字段名 描述 / 效果', () => {
    expect(renderSpecialStatusList({ a: { 描述: '甲' } }, 'p')).toContain('甲');
    expect(renderSpecialStatusList({ b: { 效果: '乙' } }, 'p')).toContain('乙');
  });

  it('空值条目跳过；全空显示「无」', () => {
    expect(renderSpecialStatusList({}, 'p')).toContain('无');
    expect(renderSpecialStatusList({ a: '', b: null, c: undefined }, 'p')).toContain('无');
  });

  it('对象型状态不得渲染成 [object Object]', () => {
    expect(renderSpecialStatusList({ x: { 分类: '增益' } }, 'p')).not.toContain('[object Object]');
  });
});

describe('renderResourceTree', () => {
  const 无 = new Set<string>();

  it('空对象 → 暂无资源', () => {
    expect(renderResourceTree({}, 'p', 无, 'k')).toContain('暂无资源');
  });

  it('带 当前/上限 的条目：显示计数与单位', () => {
    const h = renderResourceTree(
      { 职业: { 充能: { 当前: 2, 上限: 3, 单位: '层', 恢复方式: '短休' } } },
      '契约者.特殊资源', 无, 'k',
    );
    expect(h).toContain('充能');
    expect(h).toContain('data-path="契约者.特殊资源.职业.充能.当前"');
    expect(h).toContain('data-path="契约者.特殊资源.职业.充能.上限"');
    expect(h).toContain('短休');
  });

  it('缺 当前 → 显示未记录', () => {
    const h = renderResourceTree({ g: { r: { 上限: 5 } } }, 'p', 无, 'k');
    expect(h).toContain('未记录');
  });

  it('嵌套对象 → 折叠块，标题带条数', () => {
    const h = renderResourceTree({ 血统: { 龙裔: { 龙息: { 当前: 1, 上限: 1 } } } }, 'p', 无, 'k');
    expect(h).toContain('mate-sub');
    expect(h).toContain('data-sub-key="k.血统"');
    expect(h).toContain('龙息');
  });

  it('数组 → 折叠块，标题带长度', () => {
    const h = renderResourceTree({ 列表: [10, 20] }, 'p', 无, 'k');
    expect(h).toContain('(2)');
    expect(h).toContain('10');
    expect(h).toContain('20');
  });

  it('标量 → 一行 名称：值', () => {
    const h = renderResourceTree({ 备注: '随便写点' }, 'p', 无, 'k');
    expect(h).toContain('备注');
    expect(h).toContain('随便写点');
  });

  it('空值条目整条跳过，不产生空行', () => {
    const h = renderResourceTree({ a: null, b: '', c: {}, d: [] }, 'p', 无, 'k');
    expect(h).not.toContain('skill-line');
  });

  it('键名含点：data-path 里被转义，且不产生错层', () => {
    const h = renderResourceTree({ 职业: { '魔能.爆裂': { 当前: 1, 上限: 1 } } }, '契约者.特殊资源', 无, 'k');
    expect(h).toContain('data-path="契约者.特殊资源.职业[\'魔能.爆裂\'].当前"');
  });

  it('默认折叠：未展开时带 collapsed / hidden', () => {
    const h = renderResourceTree({ g: { a: { 当前: 1, 上限: 1 } } }, 'p', 无, 'k');
    expect(h).toContain('collapsed');
    expect(h).toContain('hidden');
  });

  it('已展开：根块与分组块都不带 collapsed', () => {
    const h = renderResourceTree({ g: { a: { 当前: 1, 上限: 1 } } }, 'p', new Set(['k', 'k.g']), 'k');
    expect(h).not.toContain('collapsed');
  });

  it('畸形值不抛异常', () => {
    expect(() => renderResourceTree({ a: new Date() } as any, 'p', 无, 'k')).not.toThrow();
    expect(() => renderResourceTree(null, 'p', 无, 'k')).not.toThrow();
  });
});

describe('renderCareerSection', () => {
  const 无 = new Set<string>();

  it('职业简介：渲染成一行且可编辑', () => {
    const h = renderCareerSection({ 职业简介: '以短休换爆发' }, '契约者.职业', 无, 'k');
    expect(h).toContain('职业简介');
    expect(h).toContain('以短休换爆发');
    expect(h).toContain('data-path="契约者.职业.职业简介"');
  });

  it('职业简介缺省时显示「无」', () => {
    const h = renderCareerSection({}, '契约者.职业', 无, 'k');
    expect(h).toContain('职业简介');
  });

  it('扁平职业特性：文字叶节点直接显示', () => {
    const h = renderCareerSection({ 职业特性: { 坚韧: '受到的伤害 -1' } }, '契约者.职业', 无, 'k');
    expect(h).toContain('坚韧');
    expect(h).toContain('受到的伤害 -1');
  });

  it('嵌套职业特性：分组折叠，递归出子节点', () => {
    const h = renderCareerSection(
      { 职业特性: { 龙裔系: { 龙鳞: '防御 +2', 龙息: '每场一次' } } },
      '契约者.职业', 无, 'k',
    );
    expect(h).toContain('mate-sub');
    expect(h).toContain('龙裔系');
    expect(h).toContain('龙鳞');
    expect(h).toContain('龙息');
  });

  it('兼容旧写法 {效果: "..."}', () => {
    const h = renderCareerSection({ 职业特性: { 坚韧: { 效果: '减伤 1' } } }, '契约者.职业', 无, 'k');
    expect(h).toContain('减伤 1');
  });

  it('职业技能与传承技能各自成块', () => {
    const h = renderCareerSection(
      { 职业技能: { 斩击: { 名称: '斩击', 等级: 1 } }, 传承技能: { 祖传: { 名称: '祖传' } } },
      '契约者.职业', 无, 'k',
    );
    expect(h).toContain('职业技能');
    expect(h).toContain('斩击');
    expect(h).toContain('传承技能');
    expect(h).toContain('祖传');
  });

  it('空职业不抛异常', () => {
    expect(() => renderCareerSection(null, 'p', 无, 'k')).not.toThrow();
    expect(() => renderCareerSection({}, 'p', 无, 'k')).not.toThrow();
  });
});
