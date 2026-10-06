import { describe, expect, it } from 'vitest';
import { 翻译战斗解释 } from '../store';

describe('translateCombat · 技能翻译接线', () => {
  it('API 未配置 → 抛「请先在设置里配置 API」（Review Focus 5）', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: { url: '', apiKey: '', model: '' } });

    await expect(翻译战斗解释([{ 名称: '裂骨重击' }])).rejects.toThrow('API 未配置');
  });

  it('AI 返回合法翻译 → 解析为战斗解释映射', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: { url: 'https://a.b', apiKey: 'k', model: 'm' } });
    (globalThis as any).generateRaw = async () =>
      JSON.stringify({
        行动消耗: '主要行动', 射程: '近战', 目标: '单体', 消耗: '无',
        冷却: 1, 分类: '基础', 类型: '主动', 可预判: true, 规则: [], 托管: [],
      });

    const 结果 = await 翻译战斗解释([{ 名称: '裂骨重击', 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 消耗: '无', 冷却: '1回合', 射程: '近战', 目标: '单体', 效果: {} }]);
    expect(结果['裂骨重击'].行动消耗).toBe('主要行动');
  });

  it('AI 前两次返回非 JSON、第三次合法 → 重试后成功（非法 JSON 重试链路）', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: { url: 'https://a.b', apiKey: 'k', model: 'm' } });
    let 次数 = 0;
    (globalThis as any).generateRaw = async () => {
      次数++;
      if (次数 < 3) return '这不是 JSON';
      return JSON.stringify({
        行动消耗: '主要行动', 射程: '近战', 目标: '单体', 消耗: '无',
        冷却: 1, 分类: '基础', 类型: '主动', 可预判: true, 规则: [], 托管: [],
      });
    };

    const 结果 = await 翻译战斗解释([{ 名称: '裂骨重击' }]);
    expect(结果['裂骨重击'].行动消耗).toBe('主要行动');
    expect(次数).toBe(3);
  });
});
