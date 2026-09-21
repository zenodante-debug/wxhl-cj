import { describe, expect, it } from 'vitest';
import type { Bag } from '../../market/settle';
import { STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES } from '../recipes';
import { autoPick, computeDC, executeCraft, fluctuate, judgeRoll, validateCraft, type CraftInput } from '../craft';

const 锻造武器白 = TEMPLATE_RECIPES.find(r => r.名称 === '锻造·武器（白色）')!;
const 锻造武器蓝 = TEMPLATE_RECIPES.find(r => r.名称 === '锻造·武器（蓝色）')!;
const 治疗药剂 = STANDARD_GOODS_RECIPES.find(r => r.名称 === '基础治疗药剂')!;

function makeInput(patch: Partial<CraftInput> = {}): CraftInput {
  return {
    配方: 锻造武器白,
    阶位: 1,
    子类型: '短剑',
    副属性: 'AGI',
    数量: 1,
    核心材料: { 物品名: '精铁', 数量: 2 },
    辅料: [{ 物品名: '兽骨', 数量: 3 }],
    缺图纸: false,
    越阶材料: false,
    劣质材料: false,
    设施: { 修正: 0, 仅白色: false, 标签: '回廊主城设施' },
    制作者: {
      姓名: '老狼',
      阶位上限: 3,
      基础属性: { STR: 8, AGI: 6, CON: 6, PER: 7 },
      属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 },
      技能: { 分类: '基础', 阶位: 3, 等级: 3 },
      职业名: '无',
    },
    ...patch,
  };
}

const bag: Bag = {
  精铁: { 名称: '精铁', 描述: '好铁', 数量: 5 },
  兽骨: { 名称: '兽骨', 描述: '', 数量: 3 },
  月光草: { 名称: '月光草', 描述: '', 数量: 9 },
};

describe('computeDC · 世界书公式', () => {
  it('白一阶无修正 = 10', () => {
    expect(computeDC('白色', 1, []).最终).toBe(10);
  });
  it('金三阶 = floor(20×(1+2/1.4)) = 48', () => {
    expect(computeDC('金色', 3, []).最终).toBe(48);
  });
  it('蓝二阶缺图纸+5 = floor(20×(1+1/1.4)) = 34', () => {
    expect(computeDC('蓝色', 2, [{ 项: '缺图纸', 值: 5 }]).最终).toBe(34);
  });
});

describe('judgeRoll · 五档判定', () => {
  it('自然1恒大失败，自然20恒杰作（优先于总值）', () => {
    expect(judgeRoll(1, 99, 10)).toBe('大失败');
    expect(judgeRoll(20, 5, 30)).toBe('杰作');
  });
  it('总值分档：<DC 失败 / DC~DC+5 成功 / DC+5~DC+10 精制', () => {
    expect(judgeRoll(5, 9, 10)).toBe('失败');
    expect(judgeRoll(5, 10, 10)).toBe('成功');
    expect(judgeRoll(5, 14, 10)).toBe('成功');
    expect(judgeRoll(5, 15, 10)).toBe('精制');
  });
});

describe('fluctuate · 成功档波动', () => {
  it('基准10在[8,10]内', () => {
    for (let i = 0; i < 100; i++) {
      const v = fluctuate(10, Math.random);
      expect(v).toBeGreaterThanOrEqual(8);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
  it('基准1不会因取整恒为0', () => {
    expect(fluctuate(1, () => 0.5)).toBe(1);
  });
  it('非正基准原样返回', () => {
    expect(fluctuate(0, Math.random)).toBe(0);
    expect(fluctuate(-3, Math.random)).toBe(-3);
  });
});

describe('autoPick · 辅料自动拣选', () => {
  const codex = { 精铁: { 类别: '金属' as const, 品质: '白色' as const, 阶位: 1 } };
  it('按类别拣选并排除核心', () => {
    const picks = autoPick(bag, codex, '金属', 4, ['兽骨']);
    expect(picks).toEqual([{ 物品名: '精铁', 数量: 4 }]);
  });
  it('任意类别拣一切；数量不足返回 null', () => {
    expect(autoPick(bag, codex, '任意', 3, ['精铁'])?.length).toBeGreaterThan(0);
    expect(autoPick(bag, codex, '金属', 99, [])).toBeNull();
  });
});

describe('validateCraft · 前置校验', () => {
  it('金/紫配方拦截（v2 开放）', () => {
    const 金配方 = { ...锻造武器白, 品质: '金色' as const, 名称: '锻造·武器（金色）' };
    expect(validateCraft(makeInput({ 配方: 金配方 }), bag)[0]).toContain('v2');
  });
  it('阶位超过契约者/技能上限', () => {
    expect(validateCraft(makeInput({ 阶位: 4 }), bag)[0]).toContain('阶位');
    expect(validateCraft(makeInput({ 阶位: 4, 制作者: { ...makeInput().制作者, 阶位上限: 5 } }), bag)[0]).toContain('技能阶位');
  });
  it('未掌握生活技能', () => {
    const no = makeInput();
    no.制作者.技能 = undefined;
    expect(validateCraft(no, bag)[0]).toContain('锻造');
  });
  it('技能等级不足做蓝色', () => {
    const input = makeInput({ 配方: 锻造武器蓝 });
    input.制作者.技能 = { 分类: '基础', 阶位: 3, 等级: 1 };
    expect(validateCraft(input, bag)[0]).toContain('Lv');
  });
  it('野外仅可做白色', () => {
    const input = makeInput({ 配方: 锻造武器蓝, 设施: { 修正: 3, 仅白色: true, 标签: '野外简陋环境' } });
    expect(validateCraft(input, bag)[0]).toContain('白色');
  });
  it('材料不足', () => {
    expect(validateCraft(makeInput({ 核心材料: { 物品名: '精铁', 数量: 99 } }), bag)[0]).toContain('精铁');
  });
  it('一切就绪返回空', () => {
    expect(validateCraft(makeInput(), bag)).toEqual([]);
  });
});

describe('executeCraft · 制作执行', () => {
  it('成功：扣全部材料，产出精铁短剑（波动数值）', () => {
    const out = executeCraft(makeInput(), 3, () => 0.5); // 3+8+3=14，DC10 ≤ 14 < 15
    expect(out.结果).toBe('成功');
    expect(out.检定值).toBe(3 + 8 + 3);
    expect(out.扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '兽骨', 数量: 3 },
    ]);
    const p = out.新增[0] as any;
    expect(p.名称).toBe('精铁短剑');
    expect(p.类型).toBe('武器');
    expect(p.伤害骰).toBe('2d6');
    expect(p.主属性).toBe('STR');
    expect(p.副属性).toBe('AGI');
    expect(out.HP伤害).toBe(0);
  });
  it('精制：数值取满值', () => {
    const out = executeCraft(makeInput(), 15, () => 0.5); // 15+8+3=26 ≥ DC+5
    expect(out.结果).toBe('精制');
    expect((out.新增[0] as any).主属性加成).toBe(1);
  });
  it('杰作：品质升档（白→蓝，骰面 d6→d8），署名刻印', () => {
    const out = executeCraft(makeInput(), 20, () => 0.5);
    expect(out.结果).toBe('杰作');
    const p = out.新增[0] as any;
    expect(p.品质).toBe('蓝色');
    expect(p.伤害骰).toBe('2d8');
    expect(p.描述).toContain('老狼');
  });
  it('野外设施下杰作不升档：保持白色，仍取满值+署名刻印', () => {
    const out = executeCraft(makeInput({ 设施: { 修正: 3, 仅白色: true, 标签: '野外简陋环境' } }), 20, () => 0.5);
    expect(out.结果).toBe('杰作');
    const p = out.新增[0] as any;
    expect(p.品质).toBe('白色');
    expect(p.伤害骰).toBe('2d6');
    expect(p.描述).toContain('署名');
    expect(p.描述).toContain('老狼');
  });
  it('失败：核心损毁50%（向上取整），辅料保留，产出灰色废料', () => {
    const out = executeCraft(makeInput({ 配方: 锻造武器蓝 }), 2, () => 0.5); // 2+8+3=13 < DC15
    expect(out.结果).toBe('失败');
    expect(out.扣减).toEqual([{ 物品名: '精铁', 数量: 1 }]);
    expect((out.新增[0] as any).名称).toBe('灰色废料');
  });
  it('大失败：材料全毁，HP伤害=阶位×10', () => {
    const out = executeCraft(makeInput(), 1, () => 0.5);
    expect(out.结果).toBe('大失败');
    expect(out.扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '兽骨', 数量: 3 },
    ]);
    expect(out.新增).toEqual([]);
    expect(out.HP伤害).toBe(10);
  });
  it('消耗品批量×3：成品数量3、带自制标记，恢复量=固定值×阶位+修正×阶位系数', () => {
    const input = makeInput({
      配方: 治疗药剂,
      子类型: '',
      数量: 3,
      核心材料: { 物品名: '月光草', 数量: 6 },
      辅料: [],
    });
    const out = executeCraft(input, 12, () => 0.99); // 12+7+3=22 精制
    expect(out.结果).toBe('精制');
    const p = out.新增[0] as any;
    expect(p.名称).toBe('基础治疗药剂');
    expect(p.数量).toBe(3);
    expect(p.自制).toBe(true);
    expect(p.描述).toContain('22'); // 20×1 + 2×1
  });
});
