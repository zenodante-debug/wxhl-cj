import { describe, expect, it } from 'vitest';
import {
  构建批量翻译提示词,
  校验战斗解释,
  解析翻译结果,
  解析批量翻译结果,
  批量战斗解释_SCHEMA,
  type 待翻译条目,
} from '../ai/skillInterpreter';

const 条目 = (名称: string, 单位 = '契约者'): 待翻译条目 => ({
  单位,
  名称,
  来源: { 名称, 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 阶位: '二阶', 效果: { 碎骨挥击: '造成伤害' } },
});

const 一条解释 = (编号: number, 覆盖: Record<string, any> = {}) => ({
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
  ...覆盖,
});

describe('skillInterpreter · 批量提示词', () => {
  it('一次装下全部条目，每条带编号与归属单位', () => {
    const 提示词 = 构建批量翻译提示词([条目('裂骨重击'), 条目('斩击', '副本角色.骨卫兵')]);

    expect(提示词).toContain('全部 2 条');
    expect(提示词).toContain('【编号 0】契约者 · 裂骨重击');
    expect(提示词).toContain('【编号 1】副本角色.骨卫兵 · 斩击');
    expect(提示词).toContain('碎骨挥击');
  });

  it('带上数值口径与同阶倍率区间表（AI 据此取伤害倍率）', () => {
    const 提示词 = 构建批量翻译提示词([条目('裂骨重击')]);

    expect(提示词).toContain('技能伤害 = 关联属性修正值 × 伤害倍率');
    expect(提示词).toContain('二阶 0.9~1.8');
    expect(提示词).toContain('"技能阶位"');
    expect(提示词).toContain('"伤害倍率"');
  });

  it('schema 只约束「有个 解释 数组」—— 不把可选键塞进 properties（sanitize 会把它们变成必填）', () => {
    const 键集 = Object.keys(批量战斗解释_SCHEMA.value.properties);
    expect(键集).toEqual(['解释']);
    expect(批量战斗解释_SCHEMA.value.required).toEqual(['解释']);
  });
});

describe('skillInterpreter · 批量解析', () => {
  it('按编号对号入座（效果名会跨单位重名，所以只能按编号）', () => {
    const json = JSON.stringify({ 解释: [一条解释(1), 一条解释(0)] });
    const 逐条 = 解析批量翻译结果(json, 2);

    expect(逐条).toHaveLength(2);
    expect(逐条[0].成功).toBe(true);
    expect(逐条[1].成功).toBe(true);
  });

  it('编号越界 / 非整数 → 跳过该条，不越界写入', () => {
    const json = JSON.stringify({ 解释: [一条解释(0), 一条解释(99), 一条解释(-1)] });
    const 逐条 = 解析批量翻译结果(json, 1);

    expect(逐条).toHaveLength(1);
    expect(逐条[0].成功).toBe(true);
  });

  it('某条规则全是垃圾 → 该条失败并带**原因**，不因一条坏丢掉整批', () => {
    // 坏规则**判失败**（响亮的失败 > 安静的空壳）→ 进复核，能一键重翻。
    const json = JSON.stringify({ 解释: [{ 编号: 0, 规则: [{}] }, 一条解释(1)] });
    const 逐条 = 解析批量翻译结果(json, 2);

    expect(逐条[0].成功).toBe(false);
    expect(逐条[0].成功 === false && 逐条[0].原因).toContain('字段不合法');
    expect(逐条[1].成功).toBe(true);
  });

  it('某条**只回了编号**（字段全缺）→ 按默认骨架算成功（玩家的口径：孤零零的效果不该被判失败）', () => {
    const json = JSON.stringify({ 解释: [{ 编号: 0 }, 一条解释(1)] });
    const 逐条 = 解析批量翻译结果(json, 2);

    expect(逐条[0].成功).toBe(true);
    expect(逐条[1].成功).toBe(true);
  });

  it('AI 漏回条目 → 缺的位置标失败并说明是漏条目', () => {
    const json = JSON.stringify({ 解释: [一条解释(0)] });
    const 逐条 = 解析批量翻译结果(json, 3);

    expect(逐条[0].成功).toBe(true);
    expect(逐条[1].成功).toBe(false);
    expect(逐条[1].成功 === false && 逐条[1].原因).toContain('漏条目');
    expect(逐条[2].成功).toBe(false);
  });

  it('没有「解释」数组 → 抛错（交给 aiGenerate 的重试链路）', () => {
    expect(() => 解析批量翻译结果(JSON.stringify({ 别的: [] }), 1)).toThrow('没有 "解释" 数组');
  });

  it('顶层直接是数组也认（有的模型会省掉外层）', () => {
    const 逐条 = 解析批量翻译结果(JSON.stringify([一条解释(0)]), 1);
    expect(逐条[0].成功).toBe(true);
  });
});

describe('skillInterpreter · 单条校验', () => {
  it('合法对象通过', () => {
    expect(校验战斗解释(一条解释(0)).行动消耗).toBe('主要行动');
  });

  it('非关键字段缺失不再抛错（补默认）；真正**没有信息**的输入仍然抛错', () => {
    // 以前这条要九个字段全齐：模型猜漏一个（比如 分类）就整条失败 —— 实战就是这么翻不出来的
    expect(() => 校验战斗解释({ 行动消耗: '主要行动' })).not.toThrow();
    expect(() => 校验战斗解释(null)).toThrow();
    expect(() => 校验战斗解释({ 行动消耗: '无', 规则: [{}] })).toThrow(); // 规则全是垃圾 → 进复核
  });

  it('解析翻译结果：非法 JSON 抛错', () => {
    expect(() => 解析翻译结果('not json')).toThrow();
  });
});

describe('skillInterpreter · 可空列表字段兜底（实战：模型省略了「托管」）', () => {
  it('缺「托管」→ 兜底 []，不判失败（乌尔奇奥拉 15 项全因这个被丢）', () => {
    const 没有托管 = 一条解释(0);
    delete (没有托管 as any).托管;

    expect(校验战斗解释(没有托管).托管).toEqual([]);
  });

  it('缺「规则」→ 兜底 []，不判失败', () => {
    const 没有规则 = 一条解释(0);
    delete (没有规则 as any).规则;

    expect(校验战斗解释(没有规则).规则).toEqual([]);
  });

  it('行动消耗缺了**不再抛错**：被动类补「无」、主动类补「免费行动」（与引擎归一化同一口径）', () => {
    const 缺行动消耗_被动 = 一条解释(0, { 类型: '被动' });
    delete (缺行动消耗_被动 as any).行动消耗;
    expect(校验战斗解释(缺行动消耗_被动).行动消耗).toBe('无');

    const 缺行动消耗_主动 = 一条解释(0);
    delete (缺行动消耗_主动 as any).行动消耗;
    缺行动消耗_主动.类型 = '主动';
    expect(校验战斗解释(缺行动消耗_主动).行动消耗).toBe('免费行动');
  });
});

describe('skillInterpreter · 提示词必须教模型用上引擎真正执行的那十一个触发点', () => {
  const 提示词 = 构建批量翻译提示词([条目('终焉信标')]);

  it('11 个触发点全部写清楚（现在引擎全都执行了）', () => {
    for (const 点 of ['常驻','进入战斗','回合开始','回合结束','使用时','攻击时','命中时','受击时','被命中后','击杀时','资源变化时']) {
      expect(提示词).toContain(点);
    }
  });

  it('「条件」怎么写（HP比例 / 当前HP / 自身资源）', () => {
    expect(提示词).toContain('条件怎么写');
    expect(提示词).toContain('HP比例');
    expect(提示词).toContain('当前HP');
  });

  it('「防御」与四维属性点能改（重骑士那种换属性效果）', () => {
    expect(提示词).toContain('防御');
    expect(提示词).toMatch(/STR\/AGI\/CON\/PER/);
    expect(提示词).toContain('属性点');
  });

  it('数值修正目标全部说明「改的是哪个数」（现在全都真的读了）', () => {
    for (const 目标 of ['伤害','最终乘区','减伤','命中','闪避','防御','反应动作','次要行动','主要行动','移动距离','攻击倍率','基础伤害骰']) {
      expect(提示词).toContain(目标);
    }
    expect(提示词).not.toContain('还没读');
  });

  it('属性点 vs 修正值两条通道讲清楚（修正值通道不再乘位阶系数）', () => {
    expect(提示词).toContain('STR修正');
    expect(提示词).toContain('AGI修正');
    expect(提示词).toContain('属性点 vs 修正值');
    expect(提示词).toContain('不再乘位阶系数');
  });

  it('行动类型怎么填：反应动作 / 免费行动 / 装备主动效果都有明确口径', () => {
    expect(提示词).toContain('行动类型怎么填');
    expect(提示词).toContain('反应动作');
    expect(提示词).toContain('打断'); // 打断类要加约定词条
    expect(提示词).toContain('装备/道具的主动效果');
  });

  it('「额外行动」两种写法按卡面文本分流（主要行动+1 vs 额外行动回合）', () => {
    expect(提示词).toContain('额外行动回合');
    expect(提示词).toContain('额外获得一次主要行动');
    expect(提示词).toContain('按卡面文本分流');
  });

  it('变身/阶段切换类有完整配方（一次性 + 回满血 + 全属性翻倍 + 整场持续）', () => {
    expect(提示词).toContain('变身 / 阶段切换类技能怎么写');
    expect(提示词).toContain('已二阶段'); // 一次性靠词条 + 条件分支
    expect(提示词).toContain('当前HP');
    expect(提示词).toContain('最大HP'); // 回满血
    expect(提示词).toContain('持续必须写 999'); // 变身是整场，不是默认 2 回合
  });

  it('「卡面没写就怎么填」的决定表在（孤零零的效果不该靠模型瞎猜字段）', () => {
    expect(提示词).toContain('卡面没写就怎么填');
    expect(提示词).toContain('其余一律 基础'); // 分类的兜底（全引擎没人读的字段，别再让模型漏）
    expect(提示词).toContain('其余一律 true'); // 可预判的兜底
    expect(提示词).toContain('绝对不允许跳过编号'); // 缺条目的兜底：再不会拆也给默认骨架
  });

  it('「该次攻击最终伤害×N」→ 用「最终乘区」（不是「伤害」那种递减乘区）', () => {
    expect(提示词).toContain('最终乘区');
    expect(提示词).toMatch(/填 4 = ×5|填 N−1/);
  });

  it('追加攻击写「次数」，范围伤害写「半径」（引擎按一维距离结算）', () => {
    expect(提示词).toContain('追加攻击');
    expect(提示词).toContain('范围伤害');
    expect(提示词).toContain('半径');
  });

  it('受击时的视角写清楚：作用域「攻击者」= 打他的人', () => {
    expect(提示词).toMatch(/受击时.*被命中后/s);
    expect(提示词).toContain('打他的人');
  });
});
