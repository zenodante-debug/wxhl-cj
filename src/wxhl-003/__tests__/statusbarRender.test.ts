// 状态栏渲染器：纯函数，只吐 HTML 字符串。
import { describe, expect, it } from 'vitest';
import { joinPath, renderSpecialStatusList, statusKind } from '../statusbar/render';

describe('joinPath', () => {
  it('普通键直接拼', () => {
    expect(joinPath('契约者.特殊资源', '职业')).toBe('契约者.特殊资源.职业');
  });
  it('键里的点被转义，免得 lodash 把它当分隔符', () => {
    expect(joinPath('契约者.特殊资源', '魔能.爆裂')).toBe('契约者.特殊资源.魔能\\.爆裂');
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
