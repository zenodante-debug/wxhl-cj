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

  it('某条字段不全 → 该条失败并带**原因**，不因一条坏丢掉整批', () => {
    const json = JSON.stringify({ 解释: [{ 编号: 0 }, 一条解释(1)] });
    const 逐条 = 解析批量翻译结果(json, 2);

    expect(逐条[0].成功).toBe(false);
    expect(逐条[0].成功 === false && 逐条[0].原因).toContain('字段不合法');
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

  it('缺必填字段抛错', () => {
    expect(() => 校验战斗解释({ 行动消耗: '主要行动' })).toThrow('缺少必填字段');
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

  it('真正必填的字段（如 行动消耗）缺了 → 仍然抛错', () => {
    const 缺行动消耗 = 一条解释(0);
    delete (缺行动消耗 as any).行动消耗;

    expect(() => 校验战斗解释(缺行动消耗)).toThrow('行动消耗');
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
    expect(提示词).toMatch(/STR \/ AGI \/ CON \/ PER/);
    expect(提示词).toContain('属性点');
  });

  it('诚实标出还没读的五个修正目标（写了不生效）', () => {
    expect(提示词).toContain('还没读');
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
