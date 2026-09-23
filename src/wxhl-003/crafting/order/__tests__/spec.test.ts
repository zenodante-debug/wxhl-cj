import { describe, expect, it } from 'vitest';
import { ORDER_ITEM_MAX, 成品体积检查, 需求单Schema, 需求单摘要 } from '../spec';

describe('需求单 schema', () => {
  it('缺省值：子类/品质空串、阶位 0（=不限）、两个文本空', () => {
    const s = 需求单Schema.parse({ 名称: '狼牙短剑', 成品类型: '装备' });
    expect(s.装备子类).toBe('');
    expect(s.品质).toBe('');
    expect(s.阶位).toBe(0);
    expect(s.效果要求).toBe('');
    expect(s.说明).toBe('');
  });
  it('阶位接受字符串数字（AI/表单可能传字符串）', () => {
    expect(需求单Schema.parse({ 名称: 'x', 成品类型: '道具', 阶位: '3' }).阶位).toBe(3);
  });
  it('成品类型非法 → 抛错', () => {
    expect(() => 需求单Schema.parse({ 名称: 'x', 成品类型: '法宝' })).toThrow();
  });
});

describe('需求单摘要（列表与卡片共用，必须稳定）', () => {
  it('装备：子类/品质/阶位齐全', () => {
    expect(需求单摘要(需求单Schema.parse({ 名称: '狼牙短剑', 成品类型: '装备', 装备子类: '武器', 品质: '金色', 阶位: 2 })))
      .toBe('狼牙短剑｜装备·武器·金色·二阶');
  });
  it('不限品质阶位时只留名称与类型', () => {
    expect(需求单摘要(需求单Schema.parse({ 名称: '随便什么', 成品类型: '道具' })))
      .toBe('随便什么｜道具');
  });
  it('只填了部分细节时不留空档', () => {
    expect(需求单摘要(需求单Schema.parse({ 名称: 'x', 成品类型: '装备', 装备子类: '饰品' })))
      .toBe('x｜装备·饰品');
  });
});

describe('成品体积检查（Review Focus 2，客户端侧）', () => {
  it('超过 4096 字节 → 返回原因', () => {
    const 巨物 = { 名称: 'x'.repeat(5000), 数量: 1 };
    expect(成品体积检查(巨物)).toContain('过大');
  });
  it('正常物品 → null', () => {
    expect(成品体积检查({ 名称: '狼牙短剑', 数量: 1 })).toBeNull();
  });
  it('阈值与市场同口径', () => {
    expect(ORDER_ITEM_MAX).toBe(4096);
  });
});
