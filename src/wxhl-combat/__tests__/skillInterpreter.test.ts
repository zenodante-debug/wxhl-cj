import { describe, expect, it } from 'vitest';
import { 构建翻译提示词, 解析翻译结果 } from '../ai/skillInterpreter';

describe('skillInterpreter · 技能翻译', () => {
  it('构建翻译提示词：包含技能信息', () => {
    const 技能 = {
      名称: '裂骨重击',
      类型: '主动',
      行动类型: '主要行动',
      关联属性: 'STR',
      消耗: '无',
      冷却: '1回合',
      效果: { 碎骨挥击: '造成STR修正×0.3的物理伤害并附加流血状态' },
    };

    const 提示词 = 构建翻译提示词(技能);

    expect(提示词).toContain('裂骨重击');
    expect(提示词).toContain('主要行动');
    expect(提示词).toContain('碎骨挥击');
  });

  it('解析翻译结果：合法的战斗解释', () => {
    const json = JSON.stringify({
      行动消耗: '主要行动',
      射程: '近战',
      目标: '单体',
      消耗: '无',
      冷却: 1,
      分类: '基础',
      类型: '主动',
      可预判: true,
      规则: [
        {
          触发: '命中时',
          作用域: '攻击目标',
          动作: [{ 类: '施加状态', 名: '流血', 持续: 3 }],
        },
      ],
      托管: [],
    });

    const 结果 = 解析翻译结果(json);

    expect(结果.行动消耗).toBe('主要行动');
    expect(结果.规则.length).toBe(1);
    expect(结果.规则[0].触发).toBe('命中时');
  });

  it('解析翻译结果：非法 JSON 应该抛错', () => {
    expect(() => 解析翻译结果('not json')).toThrow();
  });

  it('解析翻译结果：缺少必填字段应该抛错', () => {
    const json = JSON.stringify({
      行动消耗: '主要行动',
      // 缺少其他必填字段
    });

    expect(() => 解析翻译结果(json)).toThrow();
  });
});
