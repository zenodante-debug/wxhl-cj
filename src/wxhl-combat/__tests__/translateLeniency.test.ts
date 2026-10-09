import { describe, expect, it } from 'vitest';
import { 校验战斗解释, 解析批量翻译结果 } from '../ai/skillInterpreter';
import { aiGenerate } from '../store';

// ================================================================
// 玩家反馈（第二轮）：
//   「ds 还是给我报错模型返回不合法的 json，明明之前我试了一下是可以的」
//
// 查下来是我前几轮把校验收得太紧造出来的**新失败来源**：
//   规则条目有、但结构不完整（DeepSeek 常给 `{}` / 空动作 / 没名字的规则系判定）
//   → 以前"成功但没效果"，现在**整条判失败** → 复核里一堆红 → 看起来就是"翻译又坏了"。
// 玩家的口径是「宁可要个能用的骨架」：那就**不判失败**，把坏条目丢掉、把条数报出来
//（详情面板与开战日志都会说"另有 N 条被忽略"），翻译永远"成功"。
//
// 另一条：DeepSeek 的**推理模型**把内容全放在 reasoning_content 里、正文是空的 ——
// 我们只读正文，于是拿到空串去解析，报一句"非法 JSON"（玩家只会以为是我们坏了）。
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

describe('翻译校验 · 规则全是坏的不再判失败（宁可给个能用的骨架）', () => {
  it('规则条目全是垃圾 → **照样成功**，规则清空 + 报出忽略了几条', () => {
    const 解释 = 校验战斗解释({ ...基础, 规则: [{}, {}, {}] });

    expect(解释.规则).toEqual([]);
    expect(解释.忽略的规则).toBe(3); // 面板与开战日志据此提示"另有 N 条被忽略"
  });

  it('没名字的规则系判定（DeepSeek 常见）→ 剪掉动作但不判失败', () => {
    const 解释 = 校验战斗解释({
      ...基础,
      规则: [{ 触发: '使用时', 作用域: '自身', 动作: [{ 类: '规则系判定', 目标: '攻击目标' }] }],
    });

    expect(解释.规则).toEqual([]);
    expect(解释.忽略的规则).toBe(1);
  });

  it('批量翻译：一条坏规则不再让这条进"失败清单"（少了复核里的满屏红）', () => {
    const json = JSON.stringify({
      解释: [
        { 编号: 0, ...基础, 规则: [{}] },
        { 编号: 1, ...基础, 规则: [] },
      ],
    });

    const 逐条 = 解析批量翻译结果(json, 2);

    expect(逐条[0].成功).toBe(true);
    expect(逐条[1].成功).toBe(true);
  });

  it('**真的不是对象**还是失败（那才是不可救的）', () => {
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
