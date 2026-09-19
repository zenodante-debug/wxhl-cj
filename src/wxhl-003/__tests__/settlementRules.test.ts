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
    expect(r.更新后CR).toBe(1);   // D 级 −0.5 → 0.5, 被 clamp 回下限 1（此前只摆了输入没断言）
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

/**
 * 第 2 轮补钉 —— 审查者用变异体实测出的一批「**改坏了测试也照样绿**」的洞, 逐条堵上。
 * 每条都能红: 括号里的变异体就是它要挡的那种改法。
 */
describe('computeSettlement · 第 2 轮补钉', () => {
  it('CR奖励倍率六档数值都钉住（把炼狱 15.0 改成 150 曾全绿）', () => {
    const 倍率 = (CR: number) => computeSettlement({ ...基准输入, CR }, 满骰()).CR奖励倍率;
    expect(倍率(1.0)).toBe(1.0);
    expect(倍率(2.0)).toBe(1.0);    // 漠视（2.0 的 floor 边界, 2.5 之外此前没覆盖）
    expect(倍率(3.0)).toBe(1.2);    // 观察
    expect(倍率(4.0)).toBe(1.2);
    expect(倍率(5.0)).toBe(1.5);    // 关注
    expect(倍率(6.0)).toBe(1.5);
    expect(倍率(7.0)).toBe(3.0);    // 重视
    expect(倍率(8.0)).toBe(3.0);
    expect(倍率(9.0)).toBe(6.0);    // 期待
    expect(倍率(9.9)).toBe(6.0);
    expect(倍率(10.0)).toBe(15.0);  // 炼狱
  });

  it('CR=10(炼狱) 的 CR奖励倍率 仍按结算前的 10 查表 = 15.0; 「回调至 3」只影响 更新后CR', () => {
    const r = computeSettlement({ ...基准输入, CR: 10 }, 满骰());
    expect(r.CR态度).toBe('炼狱');
    expect(r.CR奖励倍率).toBe(15.0);
    expect(r.最终EXP).toBe(9000);    // 100 × 2.0 × 15.0 × 3 —— 倍率真的用进了存档数值
    expect(r.最终UP).toBe(4500);     // 50 × 2.0 × 15.0 × 3
    expect(r.更新后CR).toBe(3);
  });

  it('资格分的支线项取 完成的支线数, 不是 职业专属支线条数', () => {
    const r = computeSettlement({ ...基准输入, 完成的支线数: 5, 职业专属支线条数: 3 }, 满骰());
    expect(r.资格分_任务).toBe(5 * 5 + 2 * 20 + 3 * 10);    // 95
    expect(r.PEXP).toBe(Math.round((100 + 3 * 100) * 2.0));  // 800 → 同时钉住 PEXP 用的是另一个字段
  });

  it('阶位别名归一: 汉字 / N阶 / 裸数字 都认（五阶曾被从表里删掉而全绿）', () => {
    const 位阶修正 = (阶位: string) => computeSettlement({ ...基准输入, 阶位 }, 满骰()).位阶修正;
    expect(位阶修正('三阶')).toBe(3);   // 基准输入的写法
    expect(位阶修正('五阶')).toBe(5);
    expect(位阶修正('1阶')).toBe(1);
    expect(位阶修正('4')).toBe(4);
    // 五阶若被静默按一阶算, 写进存档的最终 EXP 会少 5 倍
    expect(computeSettlement({ ...基准输入, 阶位: '五阶' }, 满骰()).最终EXP).toBe(1500);
  });

  it('阶位认不出来时抛错, 不静默按一阶算', () => {
    expect(() => computeSettlement({ ...基准输入, 阶位: '六阶' }, 满骰())).toThrow();
    expect(() => computeSettlement({ ...基准输入, 阶位: '无' }, 满骰())).toThrow();
    expect(() => computeSettlement({ ...基准输入, 阶位: '' }, 满骰())).toThrow();
  });

  it('阶位先 trim（纯空白不该挡掉整次结算）; 「第三阶」不在词汇表里, 仍抛错', () => {
    expect(computeSettlement({ ...基准输入, 阶位: ' 三阶 ' }, 满骰()).位阶修正).toBe(3);
    expect(computeSettlement({ ...基准输入, 阶位: '五阶\n' }, 满骰()).位阶修正).toBe(5);
    expect(() => computeSettlement({ ...基准输入, 阶位: '第三阶' }, 满骰())).toThrow();
  });

  it('评价等级 F 直接抛错（主线失败 = 抹杀, 不进入结算流程）', () => {
    expect(() => computeSettlement({ ...基准输入, 评价等级: 'F' }, 满骰())).toThrow(/抹杀/);
  });

  it('周期 9 + 1 = 10（不是「>= 10 就归 1」）', () => {
    expect(computeSettlement({ ...基准输入, 旧周期: 9 }, 满骰()).新周期).toBe(10);
  });
});

import { assembleSettlementPanel, buildSettlementWrites, 汇总基础奖励 } from '../settlementRules';

/** 与 SettlementSnapshot 逐字对应的假快照 */
const 假快照 = {
  副本名称: '血色黎明',
  当前EXP: 0,
  当前UP: 0,
  当前RP: 40,
  当前PEXP: 100,
  军衔: '上等兵',
  职业等级: 5,
  PEXP_升级所需: 200,
  当前CR: 5,
  当前现实时间: '凌晨00:01',
  任务奖励: {
    '主线': '250 UP + 500 EXP',
    '收集物资': '30 UP + 60 EXP + 1 RP',
    '旧日回响': '80 UP + 150 EXP',
    '初见': '20 UP + 40 EXP + 2 RP',
    '没做完的支线': '999 UP + 999 EXP',
  } as Record<string, string>,
  // 快照契约要求这个字段必须在 —— 缺了 `buildSettlementWrites` 会**抛错**（「整体缺失」是接线 bug,
  // 与「该物品不在背包里」的 0 不是一回事）; `{}` 是合法的空背包。
  // 另外两张清单（成就清单 / 隐藏任务清单）**有意不在这里** —— 「缺清单时退化为 `无`」那条测试靠它成立,
  // 它们由需要用到的新测试各自 spread 覆盖后按值供给。
  已有背包: {},
  小队成员: [{ 名称: '阿澈', 当前EXP: 0, 当前UP: 0 }],
};

const 假AI = {
  评价等级: 'S', 评价依据: '…', 击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
  濒死次数: 0, 副本天数: 3,
  完成的支线: ['收集物资'], 完成的隐藏任务: ['旧日回响'], 达成的成就: ['初见'],
  职业专属支线条数: 2, 天赋试炼次数: 1,
  掉落物品: [{ 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 }],
  称号: { 名称: '血夜行者', 效果: { 嗜血: '击杀回血' } },
  史诗记录: '他在血雨里站成了碑。',
} as any;

describe('汇总基础奖励', () => {
  it('只汇总主线 + AI 报告完成的那些, 未完成的支线不计入', () => {
    const r = 汇总基础奖励(假快照 as any, 假AI);
    expect(r.EXP).toBe(500 + 60 + 150 + 40);   // 主线 + 收集物资 + 旧日回响 + 初见
    expect(r.UP).toBe(250 + 30 + 80 + 20);
    expect(r.EXP).not.toBe(500 + 60 + 150 + 40 + 999);   // 「没做完的支线」不计入
  });

  it('AI 报告了变量里不存在的键名时, 以 0 计并在结果里列出', () => {
    const r = 汇总基础奖励(假快照 as any, { ...假AI, 完成的支线: ['收集物资', '不存在的任务'] } as any);
    expect(r.EXP).toBe(500 + 60 + 150 + 40);
    expect(r.未找到).toEqual(['不存在的任务']);
  });

  it('某条奖励文本非法时抛错, 不静默当 0', () => {
    const 坏快照 = { ...假快照, 任务奖励: { ...假快照.任务奖励, '收集物资': '坏掉的奖励' } };
    expect(() => 汇总基础奖励(坏快照 as any, 假AI)).toThrow(/收集物资|坏掉的奖励/);
  });
});

describe('assembleSettlementPanel', () => {
  const c = computeSettlement(基准输入, 满骰());
  const p = assembleSettlementPanel(c, 假AI, 假快照 as any);

  it('被 <Settlement Beautification> 包裹', () => {
    expect(p.trimStart().startsWith('<Settlement Beautification>')).toBe(true);
    expect(p.trimEnd().endsWith('</Settlement Beautification>')).toBe(true);
  });

  it('含全部 ## 行', () => {
    for (const k of ['## 最终评价:', '## 评价倍率:', '## CR态度:', '## CR奖励倍率:', '## 位阶修正:',
      '## 基础EXP汇总:', '## 基础UP汇总:', '## 最终EXP:', '## 最终UP:', '## RP获得:', '## 当前RP余额:',
      '## 军衔状态:', '## PEXP获得:', '## 当前PEXP:', '## 职业进度:', '## 称号获得:', '## 称号效果:',
      '## 称号选择:', '## 掉落清单:', '## 副本成就已达成:', '## 副本成就未达成:', '## 隐藏任务公示:',
      '## CR变动:', '## 更新后CR:', '## 回廊态度:', '## 史诗记录:', '## 副本周期:', '## 现实时间:']) {
      expect(p).toContain(k);
    }
    expect(p).toContain('<基础结算奖励>');
    expect(p).toContain('<特殊结算奖励>');
  });

  it('数字来自 computed 而不是 AI', () => {
    expect(p).toContain('## 最终EXP: 900');
    expect(p).toContain('## 位阶修正: ×3');
    expect(p).toContain('## CR奖励倍率: ×150%');
  });

  it('当前RP余额 = 旧余额 + 本次获得', () => {
    expect(p).toContain('## 当前RP余额: ' + (40 + c.RP));
  });

  it('CR 为 0 时显示「不变」而不是 +0', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'B' }, 满骰());
    expect(assembleSettlementPanel(r, 假AI, 假快照 as any)).toContain('## CR变动: 不变');
  });

  it('称号行在非 A/S 级时留空', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'C' }, 满骰());
    const p2 = assembleSettlementPanel(r, { ...假AI, 称号: null } as any, 假快照 as any);
    expect(p2).not.toContain('## 称号获得: 血夜行者');
  });

  it('末尾列出结算后流程的两个选项', () => {
    expect(p).toContain('休息周期');
    expect(p).toContain('50 UP/天');
  });
});

describe('buildSettlementWrites', () => {
  const c = computeSettlement(基准输入, 满骰());
  const w = buildSettlementWrites(c, 假AI, 假快照 as any);
  const 取 = (路径: string[]) => w.find(x => x.路径.join('.') === 路径.join('.'))?.值;

  it('四个增量是「旧值 + 增量」而不是增量本身', () => {
    expect(取(['头部', 'EXP_当前'])).toBe(0 + c.最终EXP);
    expect(取(['经济', 'UP'])).toBe(0 + c.最终UP);
    expect(取(['头部', 'RP_当前'])).toBe(40 + c.RP);
    expect(取(['职业', 'PEXP_当前'])).toBe(100 + c.PEXP);
  });

  it('队友拿到与玩家完全相同的 EXP / UP', () => {
    expect(取(['小队', '成员', '阿澈', '头部', 'EXP_当前'])).toBe(0 + c.最终EXP);
    expect(取(['小队', '成员', '阿澈', '背包', '现金UP', '数量'])).toBe(0 + c.最终UP);
  });

  it('清空与清零', () => {
    for (const k of ['其他契约者', '副本角色', '其他契约者名单', '固有角色名单']) {
      expect(取([k])).toEqual({});
    }
    expect(取(['当前副本元数据', '副本名称'])).toBe('未生成');
    expect(取(['当前副本任务', '主线任务', '名称'])).toBe('无');
  });

  it('副本经历写入「副本名 → {评价等级, 简要说明}」', () => {
    expect(取(['副本经历', '血色黎明'])).toEqual({ 评价等级: 'S', 简要说明: '他在血雨里站成了碑。' });
  });

  it('称号只写「备用称号（只记录不生效）」, 绝不碰「当前称号」', () => {
    expect(取(['头部', '称号', '备用称号（只记录不生效）'])).toEqual(假AI.称号);
    expect(w.some(x => x.路径.join('.') === '头部.称号.当前称号')).toBe(false);
  });

  it('只允许写这三个 *_当前, 其余一律不出现', () => {
    const 允许 = new Set(['EXP_当前', 'RP_当前', 'PEXP_当前']);
    const 坏键 = ['实际', '加成', '属性修正值', 'HP_最大', 'MP_最大', '耐力_最大', '防御', '闪避值',
      '移动距离', '负重_上限', 'HP_当前', 'MP_当前', '耐力_当前',
      'EXP_升级所需', 'RP_下一级', 'PEXP_升级所需', '职业等级', '军衔'];
    for (const x of w) {
      for (const k of x.路径) {
        expect(坏键).not.toContain(k);
        if (k.endsWith('_当前')) expect(允许.has(k)).toBe(true);
      }
    }
  });

  it('掉落物品写进背包', () => {
    expect(取(['背包', '血刃', '数量'])).toBe(1);
    expect(取(['背包', '血刃', '描述'])).toContain('金色');
  });
});

/**
 * 第 3 轮补钉 —— 变异体实测出的洞（Task 3 实现者补, 不在 brief 的代码块里）。
 *
 * 上面那句「四个增量是『旧值 + 增量』而不是增量本身」**在给定的 fixture 下是空的**:
 * 假快照的 `当前EXP: 0` / `当前UP: 0`（队友也是 0）, 于是 `0 + 增量` 与 `增量` 恒等 ——
 * 把实现改成 `记(['头部','EXP_当前'], c.最终EXP)`（丢掉旧值）整份测试仍然全绿。
 * 给旧值一个非零起点, 这条断言才真的钉得住「累加」。
 */
describe('buildSettlementWrites · 旧值非零时才钉得住累加', () => {
  const c = computeSettlement(基准输入, 满骰());
  const 有底快照 = {
    ...假快照,
    当前EXP: 1234,
    当前UP: 77,
    小队成员: [{ 名称: '阿澈', 当前EXP: 500, 当前UP: 9 }],
  };
  const w = buildSettlementWrites(c, 假AI, 有底快照 as any);
  const 取 = (路径: string[]) => w.find(x => x.路径.join('.') === 路径.join('.'))?.值;

  it('四个增量 + 队友的 EXP / UP 都是旧值加上增量', () => {
    expect(取(['头部', 'EXP_当前'])).toBe(1234 + c.最终EXP);
    expect(取(['经济', 'UP'])).toBe(77 + c.最终UP);
    expect(取(['头部', 'RP_当前'])).toBe(40 + c.RP);
    expect(取(['职业', 'PEXP_当前'])).toBe(100 + c.PEXP);
    expect(取(['小队', '成员', '阿澈', '头部', 'EXP_当前'])).toBe(500 + c.最终EXP);
    expect(取(['小队', '成员', '阿澈', '背包', '现金UP', '数量'])).toBe(9 + c.最终UP);
    // 证明这条不是「怎么写都绿」: 新旧值必须真的不同, 否则上面的断言又退化成空的
    expect(1234 + c.最终EXP).not.toBe(c.最终EXP);
    expect(40 + c.RP).not.toBe(c.RP);
  });
});

// ────────────────────────────────────────────────────────────────────
// 协调者裁决后的补钉（Task 3 第 2 轮）
//
// 上面 54 条在口径改正**前后都是全绿**的 —— 这说明旧断言根本没钉住这三处
// （不是「旧断言是对的」）。以下每条都能红: 把实现改回裁决前的写法, 对应的 it 就断。
// ────────────────────────────────────────────────────────────────────

describe('当前PEXP 与「获得」行同口径', () => {
  const c = computeSettlement(基准输入, 满骰());

  it('当前PEXP = 旧值 + 本次获得（与 当前RP余额 一致, 不是照抄旧值）', () => {
    const p = assembleSettlementPanel(c, 假AI, { ...假快照, 当前PEXP: 1234 } as any);
    expect(p).toContain('## 当前PEXP: ' + (1234 + c.PEXP));
    // 反退化: 新值必须同时不同于「旧值」与「裸增量」, 否则这句断言又成空的
    expect(1234 + c.PEXP).not.toBe(1234);
    expect(1234 + c.PEXP).not.toBe(c.PEXP);
  });

  it('军衔状态 / 职业进度 仍照抄快照（它们没有「获得」配对的余额语义）', () => {
    const p = assembleSettlementPanel(c, 假AI, 假快照 as any);
    expect(p).toContain('## 军衔状态: 上等兵');
    expect(p).toContain('## 职业进度: 5/200');
  });
});

describe('副本成就 / 隐藏任务公示 · 按变量清单 + AI 名单比对', () => {
  const c = computeSettlement(基准输入, 满骰());
  const 清单快照 = {
    ...假快照,
    成就清单: [
      { 名称: '初见', 说明: '第一次踏进回廊', 难度: '★ 探索级 · 顺路可完成', 奖励: '20 UP + 40 EXP + 2 RP' },
      { 名称: '血雨行者', 说明: '在血雨里不闪不避站满全程', 难度: '★★★★★★ 世界天花板 · 绝无仅有', 奖励: '500 UP + 900 EXP' },
    ],
    隐藏任务清单: [
      { 名称: '旧日回响', 说明: '钟楼下把旧日的回响听完', 奖励: '80 UP + 150 EXP' },
      { 名称: '无人知晓', 说明: '日落前找到第三个名字', 奖励: '999 UP + 999 EXP' },
    ],
  };
  const p = assembleSettlementPanel(c, 假AI, 清单快照 as any);
  const 取行 = (文本: string, k: string) => 文本.split('\n').find(l => l.startsWith(k)) ?? '';

  it('已达成行列 AI 名单里的那个（带说明=完成描述）; 未达成行列另一个, 且带上它的说明（达成条件）', () => {
    const 已 = 取行(p, '## 副本成就已达成:');
    const 未 = 取行(p, '## 副本成就未达成:');
    expect(已).toContain('初见');
    expect(已).not.toContain('血雨行者');
    // 规则第九步: 已达成也要明文展示「完成描述」= 变量里的 `说明`, 与 未达成 行同构
    expect(已).toContain('完成描述: 第一次踏进回廊');
    expect(未).toContain('血雨行者');
    expect(未).not.toContain('初见');
    // 规则第九步要公示的就是「本次错过的成就达成条件」
    expect(未).toContain('在血雨里不闪不避站满全程');
  });

  it('隐藏任务公示把两个都列出来, 且标签按名字各自对上（对调标签要能红）', () => {
    const 公示 = 取行(p, '## 隐藏任务公示:');
    // 按名字切出各自那一段再断言 —— 只断言「两个词都出现过」时, 把两个标签**对调**仍然全绿
    const 段 = (名: string) => 公示.split('；').find(s => s.includes(名)) ?? '';
    expect(段('旧日回响')).toContain('已完成');
    expect(段('旧日回响')).not.toContain('未触发');
    // 规则第九步: 公示要「展示隐藏任务**内容**和奖励」—— 内容就是变量里的 `说明`
    expect(段('旧日回响')).toContain('钟楼下把旧日的回响听完');
    expect(段('无人知晓')).toContain('未触发');
    expect(段('无人知晓')).not.toContain('已完成');
  });

  it('快照没有这两张清单时退化为「无」而不抛错（旧 fixture 正是这种）', () => {
    const p2 = assembleSettlementPanel(c, 假AI, 假快照 as any);
    expect(取行(p2, '## 副本成就已达成:')).toBe('## 副本成就已达成: 无');
    expect(取行(p2, '## 副本成就未达成:')).toBe('## 副本成就未达成: 无');
    expect(取行(p2, '## 隐藏任务公示:')).toBe('## 隐藏任务公示: 无');
  });
});

describe('称号的 A/S 守卫（规则第七步「未达 A 级直接跳过」）', () => {
  const cB = computeSettlement({ ...基准输入, 评价等级: 'B' }, 满骰());
  const cS = computeSettlement(基准输入, 满骰());
  const 备用称号值 = (w: ReturnType<typeof buildSettlementWrites>) =>
    w.find(x => x.路径.join('.') === '头部.称号.备用称号（只记录不生效）')?.值;

  it('非 A/S 级: 即使 AI 给了称号, 面板留空且只写「无」', () => {
    // 假AI 声称 S 级并给了称号, 但 computed 是 B —— 守卫看的是 computed 的评价等级
    expect(cB.评价等级).toBe('B');
    const p = assembleSettlementPanel(cB, 假AI, 假快照 as any);
    expect(p).not.toContain('血夜行者');
    expect(p.split('\n').find(l => l.startsWith('## 称号获得:'))?.trim()).toBe('## 称号获得:');
    expect(备用称号值(buildSettlementWrites(cB, 假AI, 假快照 as any))).toEqual({ 名称: '无', 效果: {} });
  });

  it('A/S 级照常显示, 并写进备用称号', () => {
    const p = assembleSettlementPanel(cS, 假AI, 假快照 as any);
    expect(p).toContain('## 称号获得: 血夜行者');
    expect(备用称号值(buildSettlementWrites(cS, 假AI, 假快照 as any))).toEqual(假AI.称号);
  });
});

describe('掉落: 同名先聚合, 再累加到背包里已有的数量', () => {
  const c = computeSettlement(基准输入, 满骰());
  const 两条同名 = {
    ...假AI,
    掉落物品: [
      { 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 },
      { 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 2 },
    ],
  };
  const 有余粮快照 = { ...假快照, 已有背包: { 血刃: 3 } };
  const w = buildSettlementWrites(c, 两条同名 as any, 有余粮快照 as any);
  const 取 = (路径: string[]) => w.find(x => x.路径.join('.') === 路径.join('.'))?.值;

  it('已有 3 把 + 本次 1+2 把 = 6 把（不是 1、不是 2、也不是 3）', () => {
    expect(取(['背包', '血刃', '数量'])).toBe(6);
    expect(取(['背包', '血刃', '描述'])).toContain('金色');
  });

  it('同名只产生一条「数量」写入（逐条写会被 _.set 覆盖成最后一条）', () => {
    expect(w.filter(x => x.路径[0] === '背包' && x.路径[2] === '数量').length).toBe(1);
  });

  it('面板的掉落清单也按同名聚合, 且列的是本次掉落量', () => {
    const p = assembleSettlementPanel(c, 两条同名 as any, 有余粮快照 as any);
    const 行 = p.split('\n').find(l => l.startsWith('## 掉落清单:')) ?? '';
    expect(行).toContain('血刃');
    expect(行).toContain('×3');
    expect(行.match(/血刃/g)?.length).toBe(1);
  });
});

describe('已有背包 整体缺失是接线 bug, 不是「空背包」', () => {
  const c = computeSettlement(基准输入, 满骰());
  const 取 = (w: ReturnType<typeof buildSettlementWrites>, 路径: string[]) =>
    w.find(x => x.路径.join('.') === 路径.join('.'))?.值;

  it('缺失(undefined) → 抛错, 错误信息点名 已有背包', () => {
    // 把「字段整体缺失」（接线漏了）与「该物品不在背包里」（正常 0）分开:
    // 前者静默当 0 时, 掉落写入会把玩家原有的同名物品冲掉而没人察觉
    expect(() => buildSettlementWrites(c, 假AI, { ...假快照, 已有背包: undefined } as any))
      .toThrow(/已有背包/);
  });

  it('空对象 {} 是合法空背包: 不抛错, 数量按 0 + 本次算', () => {
    const w = buildSettlementWrites(c, 假AI, { ...假快照, 已有背包: {} } as any);
    expect(取(w, ['背包', '血刃', '数量'])).toBe(1);
  });
});

describe('说明 为空时印显式占位, 不静默丢掉整段', () => {
  const c = computeSettlement(基准输入, 满骰());
  const 空说明快照 = {
    ...假快照,
    成就清单: [
      { 名称: '初见', 说明: '第一次踏进回廊', 难度: '★ 探索级 · 顺路可完成', 奖励: '20 UP + 40 EXP + 2 RP' },
      { 名称: '血雨行者', 说明: '', 难度: '★★★★★★ 世界天花板 · 绝无仅有', 奖励: '500 UP + 900 EXP' },
    ],
    隐藏任务清单: [{ 名称: '旧日回响', 说明: '', 奖励: '80 UP + 150 EXP' }],
  };
  const p = assembleSettlementPanel(c, 假AI, 空说明快照 as any);
  const 取行 = (k: string) => p.split('\n').find(l => l.startsWith(k)) ?? '';

  it('未达成行的说明为空 → 印「（变量中未记录达成条件）」, 成就名与奖励仍在', () => {
    // 这一行正是规则第九步要公示的「本次错过的达成条件」—— 说明丢了, 玩家就看不出要满足什么
    const 未 = 取行('## 副本成就未达成:');
    expect(未).toContain('血雨行者');
    expect(未).toContain('（变量中未记录达成条件）');
    expect(未).toContain('500 UP + 900 EXP');
  });

  it('隐藏任务公示的说明为空 → 印「（变量中未记录说明）」, 任务名与状态仍在', () => {
    const 公示 = 取行('## 隐藏任务公示:');
    expect(公示).toContain('旧日回响');
    expect(公示).toContain('（变量中未记录说明）');
    expect(公示).toContain('已完成');
  });

  it('已达成行的说明为空 → 同样印占位（「完成描述」那段不许消失）, 成就名与奖励仍在', () => {
    const 空说明已达成 = {
      ...假快照,
      成就清单: [{ 名称: '初见', 说明: '', 难度: '★ 探索级 · 顺路可完成', 奖励: '20 UP + 40 EXP + 2 RP' }],
    };
    const 已 = assembleSettlementPanel(c, 假AI, 空说明已达成 as any)
      .split('\n').find(l => l.startsWith('## 副本成就已达成:')) ?? '';
    expect(已).toContain('初见');
    expect(已).toContain('（变量中未记录说明）');
    expect(已).toContain('20 UP + 40 EXP + 2 RP');
  });
});
