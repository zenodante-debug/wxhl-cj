import { describe, expect, it } from 'vitest';
import { 翻译战斗解释, 整理翻译缓存, 翻译缓存条目数, 清空翻译缓存 } from '../store';
import { 效果指纹, 稳定序列化, 翻译缓存版本 } from '../ai/translationCache';

// ================================================================
// 跨战斗翻译缓存（spec §10.2「缓存：整场战斗有效。技能升级才失效。」）
//
// 关键设计：缓存键是**内容指纹**，不是技能名 ——
// 技能升级 / 换装备 / 效果文本被改写之后，同名条目的指纹就变了，自动重翻。
// ================================================================

const 配置 = { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 5000 };

/** 一条合法的战斗解释（去掉 编号） */
const 解释字段 = {
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
};

/** 效果源（效果不同 → 指纹不同） */
const 来源 = (名称: string, 效果: any = { 描述: '造成伤害' }) => ({
  名称,
  类型: '主动',
  行动类型: '主要行动',
  关联属性: 'STR',
  阶位: '二阶',
  消耗: '无',
  冷却: '1',
  射程: '近战',
  目标: '单体',
  效果,
});

/**
 * 有状态环境：脚本变量表同时充当「设置来源」与「缓存存储」，
 * 所以 `replaceVariables` 必须真的把变量留住，第二次调用才看得到缓存。
 */
function 装好环境() {
  const 引用 = { 次数: 0, 提示词: [] as string[] };
  let 变量: any = { 快路: 配置 };

  (globalThis as any).getScriptId = () => 'wxhl-combat';
  (globalThis as any).getVariables = () => 变量;
  (globalThis as any).replaceVariables = (v: any) => {
    变量 = v;
  };
  (globalThis as any).generateRaw = async (cfg: any) => {
    引用.次数++;
    引用.提示词.push(cfg.user_input);
    // 按提示词里的编号逐条回，避免「漏条目」干扰
    const 编号们 = [...String(cfg.user_input).matchAll(/【编号 (\d+)】/g)].map(m => Number(m[1]));
    return JSON.stringify({ 解释: 编号们.map(编号 => ({ 编号, ...解释字段 })) });
  };

  return {
    引用,
    取变量: () => 变量,
    设变量: (v: any) => {
      变量 = v;
    },
    取缓存: () => 变量?.翻译缓存,
  };
}

describe('跨战斗翻译缓存', () => {
  it('首次：全未命中 → 调 1 次 AI，并把结果按指纹写进缓存', async () => {
    const h = 装好环境();

    const r = await 翻译战斗解释([{ id: '契约者', 效果源: [来源('甲'), 来源('乙')] as any }]);

    expect(h.引用.次数).toBe(1);
    expect(r.缓存).toEqual({ 命中: 0, 待翻: 2 });
    expect(r.表.契约者.甲).toBeDefined();
    expect(h.取缓存().版本).toBe(翻译缓存版本);
    expect(Object.keys(h.取缓存().条目)).toHaveLength(2);
  });

  it('第二次同样的一套技能 → **一次 AI 都不调**，全从缓存来', async () => {
    const h = 装好环境();
    const 单位 = [{ id: '契约者', 效果源: [来源('甲'), 来源('乙')] as any }];

    await 翻译战斗解释(单位);
    const r = await 翻译战斗解释(单位);

    expect(h.引用.次数).toBe(1); // 没有第二次请求
    expect(r.缓存).toEqual({ 命中: 2, 待翻: 0 });
    expect(r.失败).toEqual([]);
    expect(r.表.契约者.乙).toBeDefined();
  });

  it('技能升级（效果文本变了）→ 只有那一条重翻，其余照旧命中', async () => {
    const h = 装好环境();

    await 翻译战斗解释([{ id: '契约者', 效果源: [来源('甲', { 描述: '旧' }), 来源('乙')] as any }]);
    const r = await 翻译战斗解释([
      { id: '契约者', 效果源: [来源('甲', { 描述: '新' }), 来源('乙')] as any },
    ]);

    expect(h.引用.次数).toBe(2);
    expect(r.缓存).toEqual({ 命中: 1, 待翻: 1 });
    // 第二次请求里只有升级过的那条
    expect(h.引用.提示词[1]).toContain('甲');
    expect(h.引用.提示词[1]).not.toContain('【编号 1】');
  });

  it('全命中时**不需要 API** —— 不该因为「API 未配置」把开战拦下来', async () => {
    const h = 装好环境();
    const 单位 = [{ id: '契约者', 效果源: [来源('甲')] as any }];
    await 翻译战斗解释(单位);

    h.设变量({ 快路: { url: '', apiKey: '', model: '', timeout: 5000 }, 翻译缓存: h.取缓存() });

    const r = await 翻译战斗解释(单位);
    expect(r.缓存).toEqual({ 命中: 1, 待翻: 0 });
    expect(h.引用.次数).toBe(1);
  });

  it('翻译失败**不入缓存**（否则下次会拿一个空翻译当命中）', async () => {
    const h = 装好环境();
    (globalThis as any).generateRaw = async () => '这不是 JSON';

    const r = await 翻译战斗解释([{ id: '契约者', 效果源: [来源('甲')] as any }]);

    expect(r.失败).toHaveLength(1);
    expect(h.取缓存()).toBeUndefined();
  });

  it('缓存版本不符 → 视为空缓存，重新翻译（提示词/口径改过就靠这个整体失效）', async () => {
    const h = 装好环境();
    const 单位 = [{ id: '契约者', 效果源: [来源('甲')] as any }];
    await 翻译战斗解释(单位);

    // 伪造一份旧版本缓存
    h.设变量({ ...h.取变量(), 翻译缓存: { 版本: 翻译缓存版本 - 1, 条目: h.取缓存().条目 } });

    const r = await 翻译战斗解释(单位);

    expect(r.缓存).toEqual({ 命中: 0, 待翻: 1 });
    expect(h.引用.次数).toBe(2);
  });

  it('写缓存是**合并写**：不会顺手抹掉同 scope 的其它脚本变量（如进行中的战斗状态）', async () => {
    const h = 装好环境();
    h.设变量({ 快路: 配置, 战斗: { 进行中: true } });

    await 翻译战斗解释([{ id: '契约者', 效果源: [来源('甲')] as any }]);

    expect(h.取变量().战斗).toEqual({ 进行中: true });
    expect(h.取变量().翻译缓存).toBeDefined();
  });
});

describe('整理翻译缓存 · 进战斗时按名单裁剪', () => {
  it('不在本次名单里的条目被清掉（技能删了/换了装备）', async () => {
    const h = 装好环境();
    await 翻译战斗解释([{ id: '契约者', 效果源: [来源('甲'), 来源('乙')] as any }]);

    const 结果 = await 整理翻译缓存([{ id: '契约者', 效果源: [来源('甲')] as any }]);

    expect(结果).toEqual({ 保留: 1, 清理: 1 });
    expect(Object.keys(h.取缓存().条目)).toHaveLength(1);
  });

  it('没有任何清理 → 不动变量（避免每次开战都改写脚本变量）', async () => {
    const h = 装好环境();
    const 单位 = [{ id: '契约者', 效果源: [来源('甲')] as any }];
    await 翻译战斗解释(单位);
    const 写前 = h.取变量();

    const 结果 = await 整理翻译缓存(单位);

    expect(结果).toEqual({ 保留: 1, 清理: 0 });
    expect(h.取变量()).toBe(写前); // 同一个对象引用 = 没写
  });

  it('空缓存 → 0/0，不抛错', async () => {
    const h = 装好环境();
    expect(await 整理翻译缓存([{ id: '契约者', 效果源: [] }])).toEqual({ 保留: 0, 清理: 0 });
    expect(h.取缓存()).toBeUndefined();
  });
});

describe('设置页的清空出口', () => {
  it('条目数如实反映缓存；清空后归零并强制重翻', async () => {
    const h = 装好环境();
    const 单位 = [{ id: '契约者', 效果源: [来源('甲'), 来源('乙')] as any }];
    await 翻译战斗解释(单位);
    expect(翻译缓存条目数()).toBe(2);

    await 清空翻译缓存();

    expect(翻译缓存条目数()).toBe(0);
    const r = await 翻译战斗解释(单位);
    expect(r.缓存).toEqual({ 命中: 0, 待翻: 2 });
    expect(h.引用.次数).toBe(2);
  });

  it('没有缓存时条目数为 0，不抛错', () => {
    const h = 装好环境();
    expect(h.取缓存()).toBeUndefined();
    expect(翻译缓存条目数()).toBe(0);
  });
});

describe('效果指纹 · 只认内容', () => {
  it('键序不同 → 同一个指纹', () => {
    expect(效果指纹({ a: 1, b: 2 })).toBe(效果指纹({ b: 2, a: 1 }));
  });

  it('内容变了 → 指纹变了', () => {
    expect(效果指纹({ 效果: { 描述: '旧' } })).not.toBe(效果指纹({ 效果: { 描述: '新' } }));
  });

  it('嵌套对象的键序也无关', () => {
    expect(效果指纹({ 效果: { a: 1, b: { c: 2, d: 3 } } })).toBe(
      效果指纹({ 效果: { b: { d: 3, c: 2 }, a: 1 } }),
    );
  });

  it('数组**保序**（规则列表的顺序有语义）', () => {
    expect(效果指纹({ 规则: [1, 2] })).not.toBe(效果指纹({ 规则: [2, 1] }));
  });

  it('指纹带版本号 —— 版本一涨，所有旧指纹都不再命中', () => {
    expect(效果指纹({ a: 1 })).toContain(`v${翻译缓存版本}:`);
  });

  it('稳定序列化：undefined 键被忽略，不影响与缺键的相等性', () => {
    expect(稳定序列化({ a: 1, b: undefined })).toBe(稳定序列化({ a: 1 }));
  });
});
