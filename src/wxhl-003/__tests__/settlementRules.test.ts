import { describe, expect, it } from 'vitest';
import { parseRewardText } from '../settlementRules';

describe('parseRewardText', () => {
  it('解析标准的奖励文本', () => {
    expect(parseRewardText('50 UP + 100 EXP + 3 RP + 【金色】武器：某物'))
      .toEqual({ UP: 50, EXP: 100, RP: 3 });
  });

  it('没有 RP 段时 RP 记 0', () => {
    expect(parseRewardText('250 UP + 500 EXP')).toEqual({ UP: 250, EXP: 500, RP: 0 });
  });

  it('「无」与空串表示没有奖励, 记全 0（不是格式错误）', () => {
    expect(parseRewardText('无')).toEqual({ UP: 0, EXP: 0, RP: 0 });
    expect(parseRewardText('')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  it('数字为 0 也照常解析', () => {
    expect(parseRewardText('0 UP + 0 EXP')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  // 关键: 格式非法必须抛错, 绝不静默当 0 —— 静默当 0 会让玩家少拿奖励且无人察觉
  it('格式非法时抛错', () => {
    expect(() => parseRewardText('随便一段没有数字的文字')).toThrow();
    expect(() => parseRewardText('UP + 100 EXP')).toThrow();
    expect(() => parseRewardText('50 UP + 100 EXP + 3 RP + 【金色】武器：某物 + 尾巴')).toThrow();
  });

  it('抛出的错误里带上原始文本, 便于定位是哪一条任务', () => {
    expect(() => parseRewardText('坏掉的奖励')).toThrow(/坏掉的奖励/);
  });
});

import { computeSettlement } from '../settlementRules';

/** 固定的假骰子: 永远掷出「最大值」, 让断言可写死 */
const 满骰 = () => (面数: number) => 面数;
/** 永远掷出 1 */
const 壹骰 = () => () => 1;

const 基准输入 = {
  评价等级: 'S' as const,
  击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
  濒死次数: 0,
  副本天数: 3,
  基础EXP汇总: 100,
  基础UP汇总: 50,
  完成的支线数: 2,
  隐藏任务数: 2,
  成就星数: [1, 3, 6],
  天赋试炼次数: 1,
  职业专属支线条数: 2,
  CR: 5,
  阶位: '三阶',
  旧周期: 3,
  旧资格分: 100,
  现实日期: '2025年5月10日',
};

describe('computeSettlement · 资格分', () => {
  it('评价分 + 击杀分 + 任务分', () => {
    const r = computeSettlement(基准输入, 满骰());
    expect(r.资格分_评价).toBe(50);        // S
    expect(r.资格分_击杀).toBe(2 * 5 + 1 * 15 + 1 * 30);  // 55
    expect(r.资格分_任务).toBe(2 * 5 + 2 * 20 + 3 * 10);   // 80
    expect(r.资格分_本次).toBe(50 + 55 + 80);              // 185
  });
});

describe('computeSettlement · 倍率', () => {
  it('最终EXP = 基础 × 评价 × CR × 位阶', () => {
    const r = computeSettlement(基准输入, 满骰());
    expect(r.评价倍率).toBe(2.0);
    expect(r.CR态度).toBe('关注');
    expect(r.CR奖励倍率).toBe(1.5);
    expect(r.位阶修正).toBe(3);            // 三阶
    expect(r.最终EXP).toBe(100 * 2.0 * 1.5 * 3);   // 900
    expect(r.最终UP).toBe(50 * 2.0 * 1.5 * 3);     // 450
  });

  it('CR 取 Math.floor 后分档（2.5 落到 2 → 漠视）', () => {
    expect(computeSettlement({ ...基准输入, CR: 2.5 }, 满骰()).CR态度).toBe('漠视');
    expect(computeSettlement({ ...基准输入, CR: 3.0 }, 满骰()).CR态度).toBe('观察');
    expect(computeSettlement({ ...基准输入, CR: 9.9 }, 满骰()).CR态度).toBe('期待');
    expect(computeSettlement({ ...基准输入, CR: 10 }, 满骰()).CR态度).toBe('炼狱');
  });

  it('D 级 ×0.7, 一阶位阶修正 ×1', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'D', CR: 1, 阶位: '一阶' }, 满骰());
    expect(r.评价倍率).toBe(0.7);
    expect(r.最终EXP).toBe(Math.round(100 * 0.7 * 1.0 * 1));
  });
});

describe('computeSettlement · RP', () => {
  it('隐藏任务掷满 + 成就按星数 + S级+3 + 隐藏BOSS掷满 + 天赋试炼掷满 + 炼狱附加', () => {
    // 满骰: 隐藏任务 2×3=6, 成就 1+3+6=10, S级 +3, 隐藏BOSS 1×4=4, 天赋试炼 1×2=2
    // CR=5 非炼狱 → 附加 0
    expect(computeSettlement(基准输入, 满骰()).RP).toBe(6 + 10 + 3 + 4 + 2);
  });

  it('非 S 级没有 +3', () => {
    expect(computeSettlement({ ...基准输入, 评价等级: 'A' }, 满骰()).RP).toBe(6 + 10 + 4 + 2);
  });

  it('炼狱(CR=10) 才有通关附加', () => {
    expect(computeSettlement({ ...基准输入, CR: 10 }, 满骰()).RP).toBe(6 + 10 + 3 + 4 + 2 + 3);
  });

  it('掷 1 时取下限', () => {
    // 隐藏 2×1=2, 成就 10, S级 3, 隐藏BOSS 1×2=2, 天赋试炼 1×1=1
    expect(computeSettlement(基准输入, 壹骰()).RP).toBe(2 + 10 + 3 + 2 + 1);
  });
});

describe('computeSettlement · PEXP', () => {
  it('(100 + Σ掷50~100) × 评价倍率', () => {
    // 满骰: 2 条 × 100 = 200 → (100+200) × 2.0 = 600
    expect(computeSettlement(基准输入, 满骰()).PEXP).toBe(600);
    // 壹骰: 2 条 × 50 = 100 → (100+100) × 2.0 = 400
    expect(computeSettlement(基准输入, 壹骰()).PEXP).toBe(400);
  });
});

describe('computeSettlement · CR / 周期 / 时间 / 资格分', () => {
  it('CR 变动与回廊态度', () => {
    expect(computeSettlement({ ...基准输入, 评价等级: 'S', CR: 5 }, 满骰()).更新后CR).toBe(5.5);
    expect(computeSettlement({ ...基准输入, 评价等级: 'B', CR: 5 }, 满骰()).CR变动).toBe(0);
    expect(computeSettlement({ ...基准输入, 评价等级: 'D', CR: 5 }, 满骰()).更新后CR).toBe(4.5);
  });

  it('CR 达到或超过 10 时回调至 3', () => {
    expect(computeSettlement({ ...基准输入, 评价等级: 'S', CR: 10 }, 满骰()).更新后CR).toBe(3);
    expect(computeSettlement({ ...基准输入, 评价等级: 'S', CR: 9.8 }, 满骰()).更新后CR).toBe(3);
  });

  it('更新后回廊态度按变动后的 CR 查表', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'S', CR: 6.8 }, 满骰());
    expect(r.更新后CR).toBe(7.3);
    expect(r.更新后回廊态度).toBe('重视');
  });

  it('周期 10 + 1 = 1', () => {
    expect(computeSettlement({ ...基准输入, 旧周期: 3 }, 满骰()).新周期).toBe(4);
    expect(computeSettlement({ ...基准输入, 旧周期: 10 }, 满骰()).新周期).toBe(1);
  });

  it('现实日期加上副本天数（含跨月）', () => {
    expect(computeSettlement({ ...基准输入, 副本天数: 3 }, 满骰()).新现实日期).toBe('2025年5月13日');
    expect(computeSettlement({ ...基准输入, 现实日期: '2025年5月30日', 副本天数: 3 }, 满骰()).新现实日期).toBe('2025年6月2日');
    expect(computeSettlement({ ...基准输入, 现实日期: '2025年12月30日', 副本天数: 3 }, 满骰()).新现实日期).toBe('2026年1月2日');
  });

  it('现实日期格式不认识时不猜, 返回空串', () => {
    expect(computeSettlement({ ...基准输入, 现实日期: '不知道' }, 满骰()).新现实日期).toBe('');
  });

  it('资格分累加', () => {
    expect(computeSettlement({ ...基准输入, 旧资格分: 100 }, 满骰()).新资格分).toBe(100 + 185);
  });
});

import { SettlementGenResultSchema } from '../settlementRules';

/**
 * 回归钉子（Ruling 8）: Task 1 的 schema 此前只有一份临时冒烟, 没有正式覆盖。
 * 以下每条断言都**随 schema 一起会红** —— 兜底值被改、枚举被放宽、必填被去掉,
 * 都会在这里断, 不是「必然成立」的形式。
 */
describe('SettlementGenResultSchema', () => {
  it('最小输入（只给评价等级）时其余字段全部兜底', () => {
    const r = SettlementGenResultSchema.parse({ 评价等级: 'F' });
    expect(r.击杀).toEqual({ 精英: 0, BOSS: 0, 隐藏BOSS: 0 });
    expect(r.掉落物品).toEqual([]);
    expect(r.称号).toBeNull();
    expect(r.评价依据).toBe('');
  });

  it('击杀只给一部分时, 缺的项各自兜底为 0（不是整块归零）', () => {
    expect(SettlementGenResultSchema.parse({ 评价等级: 'F', 击杀: { 精英: 2 } }).击杀)
      .toEqual({ 精英: 2, BOSS: 0, 隐藏BOSS: 0 });
  });

  it('评价等级的枚举含 F, 且不含 E', () => {
    expect(SettlementGenResultSchema.parse({ 评价等级: 'F' }).评价等级).toBe('F');
    expect(SettlementGenResultSchema.safeParse({ 评价等级: 'E' }).success).toBe(false);
  });

  it('掉落物品的名称必须非空、数量必须 >= 1', () => {
    const 输入 = (物品: Record<string, unknown>) =>
      ({ 评价等级: 'A', 掉落物品: [{ 名称: '血刃', 数量: 1, ...物品 }] });
    // 正例: 证明这两条不是「怎么写都绿」的断言
    expect(SettlementGenResultSchema.safeParse(输入({})).success).toBe(true);
    expect(SettlementGenResultSchema.safeParse(输入({ 数量: 0 })).success).toBe(false);
    expect(SettlementGenResultSchema.safeParse(输入({ 名称: '' })).success).toBe(false);
  });

  it('称号给 null 与缺省都得到 null', () => {
    const 显式null = SettlementGenResultSchema.parse({ 评价等级: 'C', 称号: null });
    const 缺省 = SettlementGenResultSchema.parse({ 评价等级: 'C' });
    expect(显式null.称号).toBeNull();
    expect(缺省.称号).toBeNull();
  });

  it('评价等级非法或缺省时 parse 直接抛错', () => {
    expect(() => SettlementGenResultSchema.parse({ 评价等级: 'X' })).toThrow();
    expect(() => SettlementGenResultSchema.parse({})).toThrow();
  });
});
