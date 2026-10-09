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
    // 第 0 条的规则是空对象（结构不完整 → 判失败的那种），第 1 条正常
    (globalThis as any).generateRaw = async () =>
      JSON.stringify({ 解释: [{ 编号: 0, 规则: [{}] }, { 编号: 1, 行动消耗: '次要行动', 射程: '自身', 目标: '自身', 消耗: '无', 冷却: 0, 分类: '基础', 类型: '被动', 可预判: false, 规则: [], 托管: [] }] });

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

describe('翻译战斗解释 · 按批量大小切块（一次回复装不下就切块，不并发、不分效果）', () => {
  const 解释字段 = { 行动消耗: '主要行动', 射程: '近战', 目标: '单体', 消耗: '无', 冷却: 1, 分类: '基础', 类型: '主动', 可预判: true, 规则: [], 托管: [] };

  /** 编号化 mock：按提示词里的编号逐条回 */
  function 装编号mock(引用: { 次数: number }, 失败当含?: string) {
    let 变量: any = { 快路: 配置 };
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => 变量;
    (globalThis as any).replaceVariables = (v: any) => {
      变量 = v;
    };
    (globalThis as any).generateRaw = async (cfg: any) => {
      引用.次数++;
      const 全文 = String(cfg.user_input);
      if (失败当含 && 全文.includes(失败当含)) throw new Error('这批被拒');
      const 编号们 = [...全文.matchAll(/【编号 (\d+)】/g)].map(m => Number(m[1]));
      return JSON.stringify({ 解释: 编号们.map(编号 => ({ 编号, ...解释字段 })) });
    };
  }

  const 效果们 = (单位: string, n: number) => ({
    id: 单位,
    效果源: Array.from({ length: n }, (_, i) => ({ 名称: `${单位}·效果${i}` })) as any,
  });

  it('总数 ≤ 上限（10 项）→ 整场一次调用', async () => {
    const 引用 = { 次数: 0 };
    装编号mock(引用);

    const r = await 翻译战斗解释([效果们('契约者', 6), 效果们('副本角色.骨卫兵', 4)]);

    expect(引用.次数).toBe(1); // 10 项，一批搞定
    expect(r.失败).toEqual([]);
  });

  it('单角色 12 个效果 > 上限 → 拆成 2 批、顺序发 2 次（不是按效果逐条发）', async () => {
    const 引用 = { 次数: 0 };
    装编号mock(引用);

    const r = await 翻译战斗解释([效果们('副本角色.骨卫兵', 12)]);

    expect(引用.次数).toBe(2); // 12 = 10 + 2，两批
    expect(Object.keys(r.表['副本角色.骨卫兵'])).toHaveLength(12);
    expect(r.失败).toEqual([]);
  });

  it('某一批失败不拖垮其它批', async () => {
    const 引用 = { 次数: 0 };
    装编号mock(引用, '坏条目');

    // 契约者 8 项（含「坏条目」）一批 → 失败；骨卫兵 8 项另一批 → 成功（8+8=16 超上限）
    const r = await 翻译战斗解释([
      { id: '契约者', 效果源: [{ 名称: '坏条目' }, ...效果们('契约者', 7).效果源] as any },
      效果们('副本角色.骨卫兵', 8),
    ]);

    expect(Object.keys(r.表['副本角色.骨卫兵'])).toHaveLength(8); // 那批好
    expect(r.失败).toHaveLength(8); // 契约者这批 8 项全败
    expect(r.失败.every(f => f.单位 === '契约者')).toBe(true);
    // 失败批重试 3 次 + 成功批 1 次 = 4；若把失败拖垮整批会更多或全失败
    expect(引用.次数).toBe(4);
  }, 30000);
});
