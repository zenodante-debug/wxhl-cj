import { describe, expect, it } from 'vitest';
import { 构建批量翻译提示词, 解析批量翻译结果 } from '../ai/skillInterpreter';
import { 翻译战斗解释 } from '../store';
import { 翻译缓存版本 } from '../ai/translationCache';
import { 造技能展示 } from '../engine/viewModel';

// ================================================================
// 玩家实例（2026-10-09，自然系·闪闪果实）：
//   「还有一些复杂的情况，这个技能，两个效果（一个效果和一个极意），但是效果内部又分为好几个效果，
//     模型会怎么拆？玩家想要释放具体的效果该怎么用」
//
// 根因：我们的输出契约是「**一个卡面条目 → 一条战斗解释**」。于是模型只能二选一：
// 把三招的规则糊在一条里（玩家**没法单独放其中一招**，冷却与消耗也对不上），或者整体放弃给空壳。
//
// 口径（§1.1）：允许同一个 `编号` 出现**多条**解释，每条是一个独立可用的招；
//   命名：卡面自带名优先，否则 `母技能·说明`，再否则 `条目名·序号`；
//   每条带 `母条目`（**由我们填**，不信模型）只用于界面分组；
//   **组内任何一条不合法 → 该编号整体判失败**（拆了三条只落一条是最难发现的静默丢失）。
// ================================================================

/** 一条合法的战斗解释字段（不含 编号 / 名称） */
const 解释字段 = {
  行动消耗: '主要行动',
  射程: '视线内',
  目标: '单体',
  消耗: '无',
  冷却: 1,
  分类: '基础',
  类型: '主动',
  可预判: true,
  规则: [],
  托管: [],
};

const 一条 = (编号: number, 额外: Record<string, any> = {}) => ({ 编号, ...解释字段, ...额外 });

describe('1 · 一个卡面条目 → 几条独立可用的招', () => {
  it('同一个编号回两条（各带自己的名字）→ 两条技能，母条目 = 卡面条目名', () => {
    const json = JSON.stringify({
      解释: [
        一条(0, { 名称: '光子化身·常驻', 类型: '被动', 行动消耗: '无', 伤害倍率: 0 }),
        一条(0, { 名称: '光子化身·光子镭射', 行动消耗: '主要行动', 伤害倍率: 3.6 }),
      ],
    });

    const 逐条 = 解析批量翻译结果(json, ['光子化身']);

    expect(逐条).toHaveLength(1);
    expect(逐条[0].成功).toBe(true);
    if (逐条[0].成功 !== true) return;

    expect(逐条[0].技能.map(s => s.名称)).toEqual(['光子化身·常驻', '光子化身·光子镭射']);
    expect(逐条[0].技能.map(s => s.母条目)).toEqual(['光子化身', '光子化身']);
    expect(逐条[0].技能[1].解释.伤害倍率).toBe(3.6);
    // 母条目也要落到解释上（界面靠它分组，说明"这几招同源"）
    expect(逐条[0].技能[1].解释.母条目).toBe('光子化身');
  });

  it('两条同编号**不必相邻**（模型把它们分开放也认）', () => {
    const json = JSON.stringify({
      解释: [一条(0, { 名称: 'A' }), 一条(1, { 名称: 'B' }), 一条(0, { 名称: 'C' })],
    });

    const 逐条 = 解析批量翻译结果(json, ['甲', '乙']);

    expect(逐条[0].成功 === true && 逐条[0].技能.map(s => s.名称)).toEqual(['A', 'C']);
    expect(逐条[1].成功 === true && 逐条[1].技能.map(s => s.名称)).toEqual(['B']);
  });

  it('**老形状一个字不变**：一条、没写名字 → 名称 = 卡面条目名', () => {
    const 逐条 = 解析批量翻译结果(JSON.stringify({ 解释: [一条(0)] }), ['斩击']);

    expect(逐条[0].成功 === true && 逐条[0].技能[0].名称).toBe('斩击');
    expect(逐条[0].成功 === true && 逐条[0].技能).toHaveLength(1);
  });

  it('多条但模型忘了起名 → 按序号补后缀（不能重名，重名会在技能表里互相覆盖）', () => {
    const json = JSON.stringify({ 解释: [一条(0), 一条(0)] });

    const 逐条 = 解析批量翻译结果(json, ['木遁']);

    expect(逐条[0].成功 === true && 逐条[0].技能.map(s => s.名称)).toEqual(['木遁·1', '木遁·2']);
  });

  it('名字两边多余空白会修掉', () => {
    const 逐条 = 解析批量翻译结果(JSON.stringify({ 解释: [一条(0, { 名称: '  净世天光  ' })] }), ['八尺琼勾玉']);

    expect(逐条[0].成功 === true && 逐条[0].技能[0].名称).toBe('净世天光');
  });
});

describe('2 · 整组失败的两种情形（绝不能"拆了三条只落一条"）', () => {
  it('组内**任何一条**不合法 → 该编号整体失败', () => {
    const json = JSON.stringify({
      解释: [一条(0, { 名称: '好的一条' }), { 编号: 0, 名称: '坏的一条', 规则: [{}] }],
    });

    const 逐条 = 解析批量翻译结果(json, ['闪闪果实']);

    expect(逐条[0].成功).toBe(false);
    expect(逐条[0].成功 === false && 逐条[0].原因).toContain('字段不合法');
  });

  it('组内两条**重名** → 整体失败并说清是重名（否则技能表里会安静地少一招）', () => {
    const json = JSON.stringify({ 解释: [一条(0, { 名称: '镭射' }), 一条(0, { 名称: '镭射' })] });

    const 逐条 = 解析批量翻译结果(json, ['光子化身']);

    expect(逐条[0].成功).toBe(false);
    expect(逐条[0].成功 === false && 逐条[0].原因).toContain('重名');
  });

  it('漏条目照旧标失败（与其他条目互不影响）', () => {
    const 逐条 = 解析批量翻译结果(JSON.stringify({ 解释: [一条(1)] }), ['甲', '乙']);

    expect(逐条[0].成功).toBe(false);
    expect(逐条[0].成功 === false && 逐条[0].原因).toContain('漏条目');
    expect(逐条[1].成功).toBe(true);
  });
});

describe('3 · 缓存必须存**列表**（只存一条 = 第二场战斗少一招）', () => {
  const 配置 = { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 5000 };
  const 来源 = (名称: string) => ({
    名称,
    类型: '主动',
    行动类型: '主要行动',
    关联属性: 'STR',
    阶位: '二阶',
    消耗: '无',
    冷却: '1',
    射程: '近战',
    目标: '单体',
    效果: { 描述: '造成伤害' },
  });

  /** 编号 0 回**两条**（一格多招），编号 1 回一条 */
  function 装好环境() {
    const 引用 = { 次数: 0 };
    let 变量: any = { 快路: 配置 };

    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => 变量;
    (globalThis as any).replaceVariables = (v: any) => {
      变量 = v;
    };
    (globalThis as any).generateRaw = async (cfg: any) => {
      引用.次数++;
      const 编号们 = [...String(cfg.user_input).matchAll(/【编号 (\d+)】/g)].map(m => Number(m[1]));
      return JSON.stringify({
        解释: 编号们.flatMap(编号 =>
          编号 === 0
            ? [一条(0, { 名称: '闪闪·常驻', 类型: '被动', 行动消耗: '无' }), 一条(0, { 名称: '闪闪·镭射' })]
            : [一条(编号)],
        ),
      });
    };

    return { 引用, 取缓存: () => 变量?.翻译缓存 };
  }

  it('第一次：一个条目落**两条**技能，缓存里也是两条', async () => {
    const h = 装好环境();

    const r = await 翻译战斗解释([
      { id: '契约者', 效果源: [来源('闪闪果实'), 来源('别的')] as any },
    ]);

    expect(r.表.契约者['闪闪·常驻']).toBeDefined();
    expect(r.表.契约者['闪闪·镭射']).toBeDefined();
    expect(r.表.契约者['别的']).toBeDefined();
    expect(r.失败).toEqual([]);

    const 条目 = h.取缓存().条目;
    const 闪闪的 = Object.entries(条目).find(([, v]: any) => Array.isArray(v) && v.length === 2);
    expect(闪闪的).toBeDefined();
  });

  it('第二次：全命中缓存 → **两条都还在**，一次 AI 都不调', async () => {
    const h = 装好环境();
    const 单位 = [{ id: '契约者', 效果源: [来源('闪闪果实'), 来源('别的')] as any }];

    await 翻译战斗解释(单位);
    const r = await 翻译战斗解释(单位);

    expect(h.引用.次数).toBe(1);
    expect(r.缓存).toEqual({ 命中: 2, 待翻: 0 });
    expect(r.表.契约者['闪闪·常驻']).toBeDefined(); // ← 只存一条的话这里会 undefined
    expect(r.表.契约者['闪闪·镭射']).toBeDefined();
  });

  it('缓存版本撞过（本批改了口径）—— 老缓存视为空、重翻一次', () => {
    expect(翻译缓存版本).toBeGreaterThan(1);
  });
});

describe('5 · 详情面板按母条目分组（"这几招同源"）', () => {
  const 解释 = (额外: Record<string, any> = {}) => ({ ...解释字段, 伤害倍率: 0, ...额外 }) as any;

  it('同源的几招**挨在一起**，组首带标记与条数', () => {
    const 展示 = 造技能展示({
      别的: 解释(),
      '光子化身·常驻': 解释({ 母条目: '光子化身', 类型: '被动', 行动消耗: '无' }),
      '光子化身·光子镭射': 解释({ 母条目: '光子化身' }),
    });

    const 光子 = 展示.filter(d => d.母条目 === '光子化身');
    expect(光子).toHaveLength(2);
    expect(光子[0].组首).toBe(true);
    expect(光子[1].组首).toBe(false);
    expect(光子[0].同源条数).toBe(2);

    // 两条必须**相邻**（中间不能插进别的技能）
    const i = 展示.findIndex(d => d.名 === '光子化身·常驻');
    expect(展示[i + 1]?.母条目).toBe('光子化身');
  });

  it('没有母条目的照旧按名字排序，分组字段给中性默认（**老行为一字不变**）', () => {
    const 展示 = 造技能展示({ 丙: 解释(), 甲: 解释(), 乙: 解释() });

    expect(展示.map(d => d.名)).toEqual(['丙', '乙', '甲'].sort((a, b) => a.localeCompare(b)));
    expect(展示.every(d => d.母条目 === '' && d.组首 === false && d.同源条数 === 1)).toBe(true);
  });

  it('空技能表 → 空数组', () => {
    expect(造技能展示(undefined)).toEqual([]);
  });
});

describe('6 · 提示词要说清"一格多招"怎么拆、怎么命名', () => {
  const 提示词 = 构建批量翻译提示词([]);

  it('允许同一编号多条 + 名称命名约定（母技能·说明）', () => {
    expect(提示词).toContain('同一个编号可以出现多条');
    expect(提示词).toContain('名称');
    expect(提示词).toContain('母技能');
  });
});
