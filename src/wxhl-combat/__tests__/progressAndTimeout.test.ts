import { describe, expect, it } from 'vitest';
import { aiGenerate, 翻译战斗解释 } from '../store';

/** 一份能过「解析翻译结果」的最小合法战斗解释 */
const 合法解释 = () =>
  JSON.stringify({
    行动消耗: '主要行动',
    射程: '近战',
    目标: '单体',
    消耗: '无',
    冷却: 1,
    分类: '基础',
    类型: '主动',
    可预判: true,
    规则: [],
    托管: [],
  });

const 配置 = { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 5000 };

describe('翻译战斗解释 · 进度回调（开战不能无反馈地卡住）', () => {
  it('每个技能开翻前回调一次 (已完成, 总数, 技能名)', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: 配置 });
    (globalThis as any).generateRaw = async () => 合法解释();

    const 记录: Array<[number, number, string]> = [];
    const 结果 = await 翻译战斗解释(
      [{ 名称: '甲' }, { 名称: '乙' }, { 名称: '丙' }],
      (已完成, 总数, 当前) => 记录.push([已完成, 总数, 当前]),
    );

    expect(Object.keys(结果)).toEqual(['甲', '乙', '丙']);
    // 设计：进入每个技能**之前**回调，已完成 = 该技能之前已翻好的数量
    expect(记录).toEqual([
      [0, 3, '甲'],
      [1, 3, '乙'],
      [2, 3, '丙'],
    ]);
  });

  it('不传进度回调也能正常工作（向后兼容）', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: 配置 });
    (globalThis as any).generateRaw = async () => 合法解释();

    const 结果 = await 翻译战斗解释([{ 名称: '甲' }]);
    expect(Object.keys(结果)).toEqual(['甲']);
  });

  it('技能列表为空 → 不回调也不抛错', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: 配置 });
    let 次数 = 0;
    const 结果 = await 翻译战斗解释([], () => 次数++);
    expect(结果).toEqual({});
    expect(次数).toBe(0);
  });
});

describe('aiGenerate · 超时（generateRaw 本身不支持，必须自己兜）', () => {
  it('请求超过 cfg.timeout 未返回 → 抛超时错，不无限等待', async () => {
    (globalThis as any).generateRaw = () => new Promise(() => {}); // 永不 resolve，模拟挂死
    const 开始 = Date.now();
    await expect(aiGenerate({ ...配置, timeout: 50 }, '你好')).rejects.toThrow(/超时/);
    // 上界算术：无 schema 时 aiGenerate 重试 3 次，每次各吃一个 50ms 超时，
    // 重试之间还各睡 2 秒 → 约 3×50 + 2×2000 ≈ 4.1 秒。这里的意义是**有界**
    // （不设超时它会永远挂着），不是某个精确值。
    expect(Date.now() - 开始).toBeLessThan(8000);
  });

  it('正常返回时不受超时影响', async () => {
    (globalThis as any).generateRaw = async () => '连接成功';
    await expect(aiGenerate({ ...配置, timeout: 5000 }, '你好')).resolves.toBe('连接成功');
  });
});
