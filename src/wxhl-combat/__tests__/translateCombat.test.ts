import { describe, expect, it } from 'vitest';
import { 翻译战斗解释 } from '../store';

/** 一份能过「校验战斗解释」的最小合法战斗解释 */
const 合法解释 = (编号: number) =>
  JSON.stringify({
    解释: [
      {
        编号,
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
      },
    ],
  });

const 配置 = { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 5000 };

function 装好环境(引用: { 次数: number }) {
  // 脚本变量表同时充当设置来源与翻译缓存：必须让 replaceVariables 真的留住写入
  // （跨战斗缓存靠它落盘，见 translateCache.test.ts）
  let 变量: any = { 快路: 配置 };
  (globalThis as any).getScriptId = () => 'wxhl-combat';
  (globalThis as any).getVariables = () => 变量;
  (globalThis as any).replaceVariables = (v: any) => {
    变量 = v;
  };
  (globalThis as any).generateRaw = async () => {
    引用.次数++;
    return 合法解释(0);
  };
}

describe('翻译战斗解释 · 整场只调 1 次 AI（实战反馈：逐个技能调太浪费）', () => {
  it('无论多少单位多少效果，都只发 1 次请求', async () => {
    const 引用 = { 次数: 0 };
    装好环境(引用);

    await 翻译战斗解释([
      { id: '契约者', 效果源: [{ 名称: '甲' }, { 名称: '乙' }, { 名称: '丙' }] as any },
      { id: '副本角色.骨卫兵', 效果源: [{ 名称: '丁' }, { 名称: '戊' }] as any },
    ]);

    expect(引用.次数).toBe(1);
  });

  it('效果源全为空 → 根本不调 AI，返回空表与空失败清单', async () => {
    const 引用 = { 次数: 0 };
    装好环境(引用);

    const 结果 = await 翻译战斗解释([{ id: '契约者', 效果源: [] }]);

    expect(引用.次数).toBe(0);
    expect(结果.表).toEqual({ 契约者: {} });
    expect(结果.失败).toEqual([]);
  });

  it('未配置 API → 抛错（且不调用 generateRaw）', async () => {
    const 引用 = { 次数: 0 };
    (globalThis as any).generateRaw = async () => {
      引用.次数++;
      return '';
    };
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: { url: '', apiKey: '', model: '' } });
    (globalThis as any).replaceVariables = () => {};

    await expect(翻译战斗解释([{ id: '契约者', 效果源: [{ 名称: '甲' }] as any }])).rejects.toThrow(
      'API 未配置',
    );
    expect(引用.次数).toBe(0);
  });

  it('单条字段不全 → 该条不进表、其余照常、整批不抛错', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: 配置 });
    (globalThis as any).replaceVariables = () => {};
    // 第 0 条只回编号不回字段（坏），第 1 条正常
    (globalThis as any).generateRaw = async () =>
      JSON.stringify({ 解释: [{ 编号: 0 }, { 编号: 1, 行动消耗: '次要行动', 射程: '自身', 目标: '自身', 消耗: '无', 冷却: 0, 分类: '基础', 类型: '被动', 可预判: false, 规则: [], 托管: [] }] });

    const 结果 = await 翻译战斗解释([
      { id: '契约者', 效果源: [{ 名称: '坏' }, { 名称: '好' }] as any },
    ]);

    expect(结果.表.契约者['好']).toBeDefined();
    expect(结果.表.契约者['坏']).toBeUndefined();
    // 失败项要带**原因**（给玩家看）与**来源**（勾选后重试时直接重发，无需回查）
    expect(结果.失败).toHaveLength(1);
    expect(结果.失败[0].名称).toBe('坏');
    expect(结果.失败[0].原因).toContain('字段不合法');
    expect(结果.失败[0].来源).toBeDefined();
  });

  it('整批请求失败（三次都吐不出 JSON）→ 不抛错，改成每条都失败并带原因', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: 配置 });
    (globalThis as any).replaceVariables = () => {};
    (globalThis as any).generateRaw = async () => '这不是 JSON';

    const 结果 = await 翻译战斗解释([
      { id: '契约者', 效果源: [{ 名称: '甲' }, { 名称: '乙' }] as any },
    ]);

    expect(结果.表.契约者).toEqual({});
    expect(结果.失败).toHaveLength(2);
    for (const f of 结果.失败) {
      expect(f.原因).toContain('整批请求失败');
      expect(f.来源).toBeDefined();
    }
  }, 20000);
});
