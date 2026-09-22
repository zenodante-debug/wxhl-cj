import { describe, expect, it } from 'vitest';
import type { Bag } from '../../market/settle';
import { STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES, 配方Schema, type 配方 } from '../recipes';
import { autoPick, computeDC, executeCraft, fluctuate, judgeRoll, validateCraft, 难度分档, type CraftInput, type 难度档位 } from '../craft';

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
    核心材料: [{ 物品名: '精铁', 数量: 2 }],
    辅料: [{ 物品名: '兽骨', 数量: 3 }],
    缺图纸: false,
    图纸持有: false,
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

describe('难度分档 · 开工前的难度明示（与 judgeRoll 逐点一致）', () => {
  it('表驱动：档位与「成功所需最小 d20」都对得上', () => {
    // [检定值上限, DC, 期望档, 期望需骰]
    const 表: [number, number, 难度档位['档'], number][] = [
      [80, 30, '必成', 2], // 上限远超 DC：d20=2 就够
      [48, 30, '必成', 2], // 必成档的下边界：需骰 = 2（DC = 上限 − 18）
      [47, 30, '靠骰运', 3], // 再低一点就必须掷 3+
      [50, 48, '靠骰运', 18], // 高档位长区间
      [31, 30, '靠骰运', 19], // 靠骰运档的上边界：需骰 = 19
      [30, 30, '仅自然20', 21], // 上限 = DC：2..19 全失败
      [28, 30, '仅自然20', 21], // 上限 < DC：终审举的「花 UP 买图纸却发现做不出来」场景
      [20, 48, '仅自然20', 21],
    ];
    for (const [上限, dc, 档, 需骰] of 表) {
      expect(难度分档(上限, dc)).toEqual({ 档, 需骰 });
      // 引擎侧逐点校验：需骰 就是 2..19 里第一个不出「失败」的骰面（d20 的检定值 = d20 + 上限 − 20）
      let 实 = 21;
      for (let d = 2; d <= 19; d++) {
        if (judgeRoll(d, d + 上限 - 20, dc) !== '失败') {
          实 = d;
          break;
        }
      }
      expect(实).toBe(需骰);
      // 自然 20 恒杰作：再难的图纸也留一口气（所以「仅自然20」不等于做不出来）
      expect(judgeRoll(20, 20 + 上限 - 20, dc)).toBe('杰作');
      // 自然 1 恒大失败：连「必成」档也不是稳成，文案与配色都不许写成「必成无风险」
      expect(judgeRoll(1, 1 + 上限 - 20, dc)).toBe('大失败');
    }
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
  it('图纸不作为自动拣选的辅料（任意类别 + 启发式归档都不该放行它）', () => {
    // 图纸·狼王牙刃 会被启发式按「牙」字归入怪物素材，而模板配方辅料需求是「任意」——
    // 修复前：键序在精铁之前，先烧掉 3 张图纸再补 1 精铁
    const 图Bag: Bag = {
      '图纸·狼王牙刃': { 名称: '图纸·狼王牙刃', 描述: '图纸', 数量: 3 },
      精铁: { 名称: '精铁', 描述: '好铁', 数量: 5 },
    };
    const 图Codex = { '图纸·狼王牙刃': { 类别: '怪物素材' as const, 品质: '金色' as const, 阶位: 3 } };
    expect(autoPick(图Bag, 图Codex, '任意', 4, [])).toEqual([{ 物品名: '精铁', 数量: 4 }]);
  });
  it('图纸可被显式指定为核心材料（不经 autoPick，不受排除影响）', () => {
    const 图Bag: Bag = {
      '图纸·狼王牙刃': { 名称: '图纸·狼王牙刃', 描述: '图纸', 数量: 3 },
      兽骨: { 名称: '兽骨', 描述: '', 数量: 3 },
    };
    const input = makeInput({ 核心材料: [{ 物品名: '图纸·狼王牙刃', 数量: 3 }] });
    expect(validateCraft(input, 图Bag)).toEqual([]);
    const out = executeCraft(input, 3, () => 0.5);
    expect((out.新增[0] as any).名称).toBe('图纸·狼王牙刃短剑'); // 核心材料名原样参与命名
  });
});

describe('validateCraft · 前置校验', () => {
  it('金/紫配方不再一律拦截：图纸在手+技能+职业可制作，缺图纸不阻断（走降档）', () => {
    const 金配方 = { ...锻造武器白, 品质: '金色' as const, 名称: '锻造·武器（金色）' };
    const 就绪 = makeInput({
      配方: 金配方,
      图纸持有: true,
      制作者: { ...makeInput().制作者, 职业名: '锻造师', 技能: { 分类: '高级', 阶位: 3, 等级: 3 } },
    });
    expect(validateCraft(就绪, bag)).toEqual([]);
    // 缺图纸不再阻断开工：由 executeCraft 走「强制降档 + DC+5」（v2 语义）
    expect(validateCraft({ ...就绪, 图纸持有: false }, bag)).toEqual([]);
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
    expect(validateCraft(makeInput({ 核心材料: [{ 物品名: '精铁', 数量: 99 }] }), bag)[0]).toContain('精铁');
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
  it('道具批量×3：成品数量3、带自制标记，恢复量=固定值×阶位+修正×阶位系数', () => {
    const input = makeInput({
      配方: 治疗药剂,
      子类型: '',
      数量: 3,
      核心材料: [{ 物品名: '月光草', 数量: 6 }],
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

// ================================================================
// v2：金/紫绘制 —— 图纸校验 / 缺图纸降档 / 效果落装
// 数值口径：金三阶 DC = floor(20×(1+2/1.4)) = 48；缺图纸再 +5 = floor(25×(1+2/1.4)) = 60
// ================================================================
const 金配方: 配方 = {
  名称: '狼王牙刃', 来源: '图纸', 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
  品质: '金色', 阶位: 3, 装备基础: '狼牙短刃', 成品名: '狼王牙刃',
  材料: [{ 类别: '金属', 数量: 2, 核心: true }],
  技能要求: { 分类: '高级', 等级: 1 }, 批量上限: 1,
  描述: '狼牙磨成的短剑，嗜血成性。',
  效果: [{ 类型: '触发', 描述: '撕咬：命中时附加流血', 伤害百分比: 12, 触发条件: '命中时', 消耗: '每场3次' }],
  // 装备夹具：v2.1 新增的道具/模板字段取 schema 默认值。
  // 装备基础「狼牙短刃」是自由文本种类名（只参与命名/显示），数值改由 参照模板 决定；
  // 本夹具 参照模板 为空 → 回落制作时选的 子类型（金输入传「短剑」，见下方 6d10 断言）
  参照模板: '', 道具类型: '其他', 道具固定值: 0, 关联属性: 'PER', 设计要求: '',
};

/** 金三阶 DC=48（缺图纸 60）——检定值 = d20 + 行业属性 + 技能等级，制作者须有够得着门槛的属性。
 *  这里给 STR 45（而非 makeInput 的 8）是**有意的**：世界书公式 floor[(基础DC+修正)×(1+(阶位-1)/1.4)]
 *  下金/紫高位 DC 远高于常规属性+技能所能达到的范围（8+3+20=31 < 48 恒失败），高门槛是设计本意；
 *  测试用超高属性隔离「图纸持有 / 缺图纸降档」这条逻辑本身，不是笔误。 */
function 金输入(图纸持有: boolean, 技能等级 = 1, 职业名 = '锻造师'): CraftInput {
  return makeInput({
    配方: 金配方, 阶位: 3, 子类型: '短剑',
    核心材料: [{ 物品名: '精铁', 数量: 2 }], 辅料: [],
    图纸持有,
    制作者: {
      ...makeInput().制作者,
      姓名: '老狼', 阶位上限: 5, 职业名,
      基础属性: { STR: 45, AGI: 6, CON: 6, PER: 7 },
      技能: { 分类: '高级', 阶位: 5, 等级: 技能等级 },
    },
  });
}

/** 紫配方输入：借金输入的匠人，把技能抬到 Lv.5（紫的技能门槛） */
function 紫输入(图纸持有 = true, 技能等级 = 5): CraftInput {
  const i = 金输入(图纸持有, 技能等级, '锻造师');
  i.配方 = { ...金配方, 品质: '紫色', 技能要求: { 分类: '高级', 等级: 5 } };
  return i;
}

describe('金紫制作 · 图纸与降档', () => {
  it('图纸在手 + 高级技能 + 职业 → 可制作', () => {
    expect(validateCraft(金输入(true), bag)).toEqual([]);
  });
  it('无图纸 → 可强行开工（不阻断），但走降档路径', () => {
    expect(validateCraft(金输入(false), bag)).toEqual([]);
  });
  it('技能等级不足（金需 Lv.1，紫需 Lv.5）→ 阻断', () => {
    expect(validateCraft(紫输入(true, 3), bag, 3)[0]).toContain('Lv.5');
  });
  it('无对应职业 → 阻断', () => {
    expect(validateCraft(金输入(true, 1, '无'), bag)[0]).toContain('职业');
  });
  // Task 6：技能校验改由 checkSkill 统一判定，**分类**由此第一次被真正检查
  //（v2.1 前只比 等级：基础系 Lv.9 也能过金图纸写着的「高级技能 Lv.1」）
  it('金图纸要高级技能：基础系 Lv.9 照样拦（旧版只看等级会放行）', () => {
    const i = 金输入(true, 9);
    i.制作者.技能 = { ...i.制作者.技能!, 分类: '基础' };
    const errs = validateCraft(i, bag);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('高级');
    expect(errs[0]).toContain('基础');
  });
  it('高级可代基础：高级技能做白/蓝配方不被拦（单向「上兼容下」）', () => {
    const input = makeInput({ 配方: 锻造武器蓝 });
    input.制作者.技能 = { 分类: '高级', 阶位: 3, 等级: 3 };
    expect(validateCraft(input, bag)).toEqual([]);
  });
  // 照裁定：分类要求由**品质**推导，不信任配方自带的 技能要求.分类
  //（该字段由品质完全决定，存一份既能被撒谎又是冗余数据）
  it('坏图纸谎报分类：金图纸把 技能要求.分类 写成「基础」→ 仍按品质要高级（读该字段的闸门会形同虚设）', () => {
    const i = 金输入(true, 1);
    i.配方 = { ...金配方, 技能要求: { 分类: '基础', 等级: 1 } }; // AI/GM 直写背包的坏图纸
    i.制作者.技能 = { ...i.制作者.技能!, 分类: '基础', 等级: 9 }; // 基础系 Lv.9：旧口径下会放行
    const errs = validateCraft(i, bag);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('高级');
  });
  it('反向同样走品质：白配方谎报「高级」→ 基础系玩家照样开工（旧口径会误拦）', () => {
    const input = makeInput({ 配方: { ...锻造武器白, 技能要求: { 分类: '高级', 等级: 1 } } });
    expect(validateCraft(input, bag)).toEqual([]);
  });
  // spec §6.1：紫 = 高级技能 Lv.5 + 职业 + 高阶材料（核心材料档案阶位 ≥ 配方阶位）
  it('紫色配方 + 核心材料阶位 3 = 配方阶位 3 → 可制作', () => {
    expect(validateCraft(紫输入(), bag, 3)).toEqual([]);
  });
  it('紫色配方 + 核心材料阶位 1 < 配方阶位 3 → 阻断（理由含「高阶材料」）', () => {
    const errs = validateCraft(紫输入(), bag, 1);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('高阶材料');
  });
  it('紫色配方 + 未传核心材料档位（调用方无材料档案）→ 按不满足处理（fail-closed）', () => {
    expect(validateCraft(紫输入(), bag)).toEqual([expect.stringContaining('高阶材料')]);
  });
  it('金色配方无高阶材料要求：核心材料阶位 1 也通过', () => {
    expect(validateCraft(金输入(true), bag, 1)).toEqual([]);
  });
  it('图纸在手：DC 无缺图纸修正，成品带效果、用配方指定名与风味描述', () => {
    const out = executeCraft(金输入(true), 15, () => 0.5); // 15+45+1=61 ≥ DC48+5 → 精制
    expect(out.结果).toBe('精制');
    expect(out.DC.修正).toEqual([]);
    const p = out.新增[0] as any;
    expect(p.名称).toBe('狼王牙刃');
    expect(p.品质).toBe('金色');
    expect(p.伤害骰).toBe('6d10'); // 短剑三阶 6d6，金色 +2 档骰面
    expect(p.效果['撕咬：命中时附加流血']).toContain('流血');
    expect(p.描述).toContain('嗜血成性');
  });
  it('缺图纸：DC+5 且成品降一档（金→蓝）', () => {
    const out = executeCraft(金输入(false), 15, () => 0.5); // 61 vs DC60 → 成功
    expect(out.结果).toBe('成功');
    expect(out.DC.修正).toEqual([{ 项: '缺图纸', 值: 5 }]);
    const p = out.新增[0] as any;
    expect(p.品质).toBe('蓝色');
    expect(p.名称).toBe('狼王牙刃'); // 降档不影响图纸指定名
  });
  // 以下两条钉住被本次改动触及、但 v1 无覆盖的两条支路
  it('防具：数值取自 配方.参照模板（自由文本的 装备基础 不再参与查表）', () => {
    // 装备基础 故意给一个非光谱的自由文本：v2.1 起它只用于显示/命名，数值一律看 参照模板
    const 甲配方: 配方 = { ...锻造武器白, 名称: '狼皮重甲', 装备子类: '防具', 装备基础: '轻型兽皮甲', 参照模板: '重装' };
    const out = executeCraft(makeInput({ 配方: 甲配方, 子类型: '轻装' }), 3, () => 0.5); // 3+8+3=14 → 成功
    const p = out.新增[0] as any;
    expect(p.类型).toBe('防具');
    expect(p.装备防御).toBe(4); // 重装白 = 4；若误用子类型 轻装 则为 1
    expect(p.名称).toBe('精铁重甲'); // 成品名为空 → 回落「核心材料名+光谱词」
    expect(p.效果).toEqual({});
  });
  it('道具：配方.描述（图纸风味文案）落进成品描述', () => {
    const input = makeInput({
      配方: { ...治疗药剂, 描述: '实验室里熬出的淡蓝药液。' },
      子类型: '', 核心材料: [{ 物品名: '月光草', 数量: 2 }], 辅料: [],
    });
    const out = executeCraft(input, 12, () => 0.99); // 12+7+3=22 精制
    const p = out.新增[0] as any;
    expect(p.描述).toContain('淡蓝药液');
    expect(p.描述).toContain('22');
  });
});

// ================================================================
// v2.1：数值一律由配方自带的结构化字段决定（装备看 参照模板 / 道具看 道具类型+道具固定值），
// 名称优先 配方.成品名 —— AI 自创的装备种类与道具才能自由命名，同时数值不失控
// ================================================================
describe('v2.1 制作修订', () => {
  it('饰品：数值走 attrBonus(饰品)，无伤害骰无防闪不负重', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '指环', 来源: '图纸', 行业: '锻造', 成品类型: '装备', 装备子类: '饰品',
        品质: '蓝色', 阶位: 1, 装备基础: '寒铁指环', 参照模板: '', 成品名: '寒铁指环',
        材料: [{ 类别: '金属', 数量: 1, 核心: true }],
        技能要求: { 分类: '基础', 等级: 3 },
      }),
      核心材料: [{ 物品名: '精铁', 数量: 1 }],
      辅料: [],
    });
    // 一阶蓝色饰品的主加成基准就是 0（世界书加成表如此），故掷自然 20 走杰作升档到金色，
    // 断言才盯得住「数值确实取自 attrBonus('饰品')」而不是别处
    const p = executeCraft(input, 20, () => 0.5).新增[0] as any;
    expect(p.类型).toBe('饰品');
    expect(p.名称).toBe('寒铁指环');
    expect(p.主属性加成).toBeGreaterThan(0);
    expect(p.伤害骰).toBe('无');
    expect(p.倍率).toBe(0);
    expect(p.装备防御).toBe(0);
    expect(p.装备闪避).toBe(0);
    expect(p.负重).toBe(0);
    expect(p.穿戴门槛).toContain('主属性≥9'); // 轻装金色基准 = 9（中装 10 / 重装 12 都不是）
  });
  it('装备种类自由：名称用自由文本，数值取参照模板', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '浮游炮', 来源: '图纸', 行业: '工程', 成品类型: '装备', 装备子类: '武器',
        品质: '蓝色', 阶位: 1, 装备基础: '浮游炮', 参照模板: '突击步枪', 成品名: '浮游炮',
        材料: [{ 类别: '金属', 数量: 2, 核心: true }],
        技能要求: { 分类: '基础', 等级: 3 },
      }),
      核心材料: [{ 物品名: '精铁', 数量: 2 }],
      辅料: [],
    });
    const p = executeCraft(input, 10, () => 0.5).新增[0] as any;
    expect(p.名称).toBe('浮游炮');
    expect(p.伤害骰).toBe('3d8'); // 突击步枪一阶白=3d6，蓝+1级→d8
  });
  it('道具自定义：AI 给的类型/固定值决定成品数值，且效果落装', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '狼血秘药', 来源: '图纸', 行业: '炼金', 成品类型: '道具', 品质: '金色', 阶位: 1,
        道具类型: '恢复HP', 道具固定值: 45, 关联属性: 'PER', 成品名: '狼血秘药',
        材料: [{ 类别: '草药', 数量: 2, 核心: true }],
        技能要求: { 分类: '高级', 等级: 1 },
        效果: [{ 类型: '常驻', 描述: '饮下后短暂提升感知' }],
      }),
      核心材料: [{ 物品名: '月光草', 数量: 2 }],
      辅料: [],
    });
    const p = executeCraft(input, 15, () => 0.99).新增[0] as any; // 15+7+3=25 ≥ DC20+5 → 精制
    expect(p.名称).toBe('狼血秘药');
    expect(p.效果['饮下后短暂提升感知']).toBeDefined();
    expect(p.描述).toContain('47'); // 45×1阶 + PER修正2×阶位系数1（固定值×阶位 + 修正×阶位系数）
  });
  it('道具：成品名为空 → 回落配方名（标准配方不因新增命名规则改名）', () => {
    const input = makeInput({
      配方: 治疗药剂, 子类型: '', 核心材料: [{ 物品名: '月光草', 数量: 2 }], 辅料: [],
    });
    expect((executeCraft(input, 12, () => 0.99).新增[0] as any).名称).toBe('基础治疗药剂');
  });
  it('爆炸物：骰数由品质决定，道具固定值是附加固定伤害而非骰数的替代', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '烈性炸药包', 来源: '图纸', 行业: '工程', 成品类型: '道具', 品质: '蓝色', 阶位: 1,
        道具类型: '爆炸物', 道具固定值: 30, 关联属性: 'PER', 成品名: '烈性炸药包',
        材料: [{ 类别: '火药', 数量: 2, 核心: true }],
        技能要求: { 分类: '基础', 等级: 3 },
      }),
      核心材料: [{ 物品名: '精铁', 数量: 2 }],
      辅料: [],
    });
    const p = executeCraft(input, 10, () => 0.5).新增[0] as any; // 10+7+3=20 ≥ DC10+5 → 精制
    expect(p.描述).toContain('4d6'); // 蓝色 = 4 骰（品质决定骰数；固定值 30 绝不参与骰数）
    expect(p.描述).not.toContain('30d6'); // 旧口径（固定值当骰数）会产出 30d6 —— 那正是被裁定去掉的高估
    expect(p.描述).toContain('+30'); // 固定值作为独立加法项出现（附加伤害）
    expect(p.描述).toContain('+30+2'); // 其后是 PER修正2×阶位系数1（两项分开呈现，合计 32）
  });
  it('非法数值模板：武器与防具都给可读报错（不撞 undefined）', () => {
    const 坏刀: 配方 = { ...锻造武器白, 名称: '坏刀', 装备子类: '武器', 参照模板: '光剑' };
    expect(() => executeCraft(makeInput({ 配方: 坏刀 }), 3, () => 0.5)).toThrow('未知武器或阶位：光剑');
    const 坏甲: 配方 = { ...锻造武器白, 名称: '坏甲', 装备子类: '防具', 参照模板: '板甲' };
    expect(() => executeCraft(makeInput({ 配方: 坏甲, 子类型: '轻装' }), 3, () => 0.5)).toThrow('未知防具光谱：板甲');
  });
  it('多核心材料：失败时每件各损毁一半（世界书：每种核心材料损毁 50%）', () => {
    const input = makeInput({
      配方: 锻造武器蓝, // DC 15：2+8+3=13 < 15 → 失败
      核心材料: [{ 物品名: '精铁', 数量: 2 }, { 物品名: '兽骨', 数量: 3 }],
      辅料: [],
    });
    const out = executeCraft(input, 2, () => 0.5);
    expect(out.结果).toBe('失败');
    expect(out.扣减).toEqual([
      { 物品名: '精铁', 数量: 1 },
      { 物品名: '兽骨', 数量: 2 },
    ]);
  });
  it('多核心材料：大失败时核心与辅料全部损毁，且扣减顺序为 核心→辅料', () => {
    const input = makeInput({
      核心材料: [{ 物品名: '精铁', 数量: 2 }, { 物品名: '兽骨', 数量: 3 }],
      辅料: [{ 物品名: '月光草', 数量: 4 }],
    });
    expect(executeCraft(input, 1, () => 0.5).扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '兽骨', 数量: 3 },
      { 物品名: '月光草', 数量: 4 },
    ]);
  });
});

