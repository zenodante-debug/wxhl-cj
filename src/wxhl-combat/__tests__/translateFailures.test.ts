import { describe, expect, it } from 'vitest';
import { 校验战斗解释, 解析批量翻译结果 } from '../ai/skillInterpreter';
import { aiGenerate } from '../store';

/** 新签名要的是「条目名数组」（子技能兜底命名 + 填 `母条目`）；这里只关心编号对号入座 */
const 条目名 = (n: number) => Array.from({ length: n }, (_, i) => `条目${i + 1}`);

// ================================================================
// 翻译失败与 AI 空正文（两种"看起来像坏了"的情况，分开处理）
//
// 一、**坏规则判失败**（口径曾短暂放宽过，已回退）
//   玩家反馈「ds 老是报不合法 json」时，我一度把「规则全是坏条目」改成不判失败
//   （清空规则 + 只记忽略数）。玩家一眼看出代价：那是把**响亮的失败**换成**安静的空壳** ——
//   技能在战斗里什么都不做、还会进翻译缓存被永久复用。已回退：
//   规则全是坏条目 → **判失败** → 进复核清单，能一键重翻（部分坏仍保留好的 + 记忽略数）。
//
// 二、**空正文要点名**：推理模型（deepseek-reasoner 之类）把内容全放在思考(reasoning)里、
//   正文是空的 —— 我们只读正文，拿到空串去解析就会报一句含糊的"非法 JSON"。
// ================================================================

const 基础 = {
  行动消耗: '无',
  射程: '自身',
  目标: '自身',
  消耗: '无',
  冷却: 0,
  分类: '基础',
  类型: '被动',
  可预判: false,
};

describe('坏规则 → 判失败（进复核，能重翻）', () => {
  it('规则条目全是垃圾 → 抛错（安静的空壳比响亮的失败糟得多）', () => {
    expect(() => 校验战斗解释({ ...基础, 规则: [{}, {}, {}] })).toThrow(/不完整|重翻/);
  });

  it('没名字的规则系判定（DeepSeek 常见）→ 同样是坏规则', () => {
    expect(() =>
      校验战斗解释({
        ...基础,
        规则: [{ 触发: '使用时', 作用域: '自身', 动作: [{ 类: '规则系判定', 目标: '攻击目标' }] }],
      }),
    ).toThrow();
  });

  it('部分坏部分好 → 保留好的、记忽略数（不整条失败）', () => {
    const 解释 = 校验战斗解释({
      ...基础,
      规则: [
        { 触发: '常驻', 作用域: '自身', 动作: [{ 类: '数值修正', 目标: '防御', 量: { 源: '常数', 系数: 3 } }] },
        {},
      ],
    });

    expect(解释.规则).toHaveLength(1);
    expect(解释.忽略的规则).toBe(1);
  });

  it('批量翻译：坏的那条进失败清单（带原因），其余照常', () => {
    const json = JSON.stringify({
      解释: [
        { 编号: 0, ...基础, 规则: [{}] },
        { 编号: 1, ...基础, 规则: [] },
      ],
    });

    const 逐条 = 解析批量翻译结果(json, 条目名(2));

    expect(逐条[0].成功).toBe(false);
    expect(逐条[0].成功 === false && 逐条[0].原因).toContain('字段不合法');
    expect(逐条[1].成功).toBe(true);
  });

  it('**完全不是对象**也判失败（不可救的那种）', () => {
    expect(() => 校验战斗解释(null)).toThrow();
    expect(() => 校验战斗解释('一段文字' as any)).toThrow();
  });
});

describe('AI 调用 · 空正文（推理模型把内容放进 reasoning）要说人话', () => {
  it('generateRaw 返回空串 → 报错点名"空正文/思考模式"，不是含糊的"非法 JSON"', async () => {
    (globalThis as any).generateRaw = async () => '';

    await expect(
      aiGenerate({ url: 'https://a.b', apiKey: 'k', model: 'deepseek-reasoner', timeout: 30000 }, '翻译', {
        name: 'x',
        value: {},
      }),
    ).rejects.toThrow(/空|思考|reasoning/);
  });

  it('只有空白字符也算空', async () => {
    (globalThis as any).generateRaw = async () => '   \n  ';

    await expect(
      aiGenerate({ url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 }, '翻译', { name: 'x', value: {} }),
    ).rejects.toThrow(/空|思考|reasoning/);
  });
});
