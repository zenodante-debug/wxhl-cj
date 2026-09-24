import { describe, expect, it } from 'vitest';
import {
  assessDeterministic,
  baseUpOf,
  nominalIdxOf,
  opFeeFor,
  priceCoef,
  realTierIdx,
  TIER_COEFS,
} from '../fee';

// ================================================================
// 超模上架费 · 2026-09-23 用户定稿口径
// RP = 50 ×（名义..真实 修正系数和）；UP = 真实阶位基准价 ×（名义..真实 修正系数和）
// 真实阶位基准价 = 一阶基准 × 定价系数（x²；超脱 = 25×20 = 500）
// ================================================================

describe('priceCoef · 定价系数（x²，超脱=500）', () => {
  it('一阶~五阶 = 阶位平方', () => {
    expect([0, 1, 2, 3, 4].map(priceCoef)).toEqual([1, 4, 9, 16, 25]);
  });
  it('超脱 = 五阶基准价 × 20 = 一阶 × 500', () => {
    expect(priceCoef(5)).toBe(500);
  });
});

describe('opFeeFor · 费用曲线（蓝武一阶基准 100 的工作表逐行核对）', () => {
  const base = 100;
  it('一阶→二阶：和3，RP150，UP1200', () => {
    expect(opFeeFor(0, 1, base)).toEqual({ sum: 3, rp: 150, up: 1200, realIdx: 1 });
  });
  it('一阶→三阶：和7，RP350，UP6300', () => {
    expect(opFeeFor(0, 2, base)).toEqual({ sum: 7, rp: 350, up: 6300, realIdx: 2 });
  });
  it('一阶→四阶：和14，RP700，UP22400', () => {
    expect(opFeeFor(0, 3, base)).toEqual({ sum: 14, rp: 700, up: 22400, realIdx: 3 });
  });
  it('一阶→五阶：和25，RP1250，UP62500', () => {
    expect(opFeeFor(0, 4, base)).toEqual({ sum: 25, rp: 1250, up: 62500, realIdx: 4 });
  });
  it('一阶→超脱：超模费 45×50=2250 RP + 超脱上架费 20 RP = 2270 RP；UP = 基准×500×45 + 基准×50%', () => {
    const f = opFeeFor(0, 5, base)!;
    expect(f.sum).toBe(45);
    expect(f.rp).toBe(2250 + 20); // 超模 2250 + 超脱上架费 20
    expect(f.up).toBe(100 * 500 * 45 + Math.floor(100 * 0.5)); // 2,250,000 + 50
  });
  it('用户原例：名义三阶→真实超脱 = 超模 50×(4+7+11+20)+超脱费20 = 2120 RP；UP = 400×500×42 + 400×0.5', () => {
    const f = opFeeFor(2, 5, 400)!; // 金武
    expect(f.sum).toBe(4 + 7 + 11 + 20);
    expect(f.rp).toBe(50 * 42 + 20); // 2100 + 20
    expect(f.up).toBe(400 * 500 * 42 + 200); // 8,400,000 + 200
  });
  it('非超脱不收超脱上架费（一阶→五阶）', () => {
    const f = opFeeFor(0, 4, base)!;
    expect(f.rp).toBe(1250);
    expect(f.up).toBe(62500);
  });
  it('符合名义阶位 / 名义高于真实 → 不收费', () => {
    expect(opFeeFor(2, 2, 100)).toBeNull();
    expect(opFeeFor(3, 1, 100)).toBeNull();
  });
  it('修正系数表与用户定义一致', () => {
    expect(TIER_COEFS).toEqual([1, 2, 4, 7, 11, 20]);
  });
});

describe('baseUpOf · 一阶基准价', () => {
  it('装备按 类型×品质 查表取下限', () => {
    expect(baseUpOf('equip', { 品质: '蓝色' }, '武器')).toBe(100);
    expect(baseUpOf('equip', { 品质: '金色' }, '武器')).toBe(400);
    expect(baseUpOf('equip', { 品质: '紫色' }, '防具')).toBe(1000);
  });
  it('道具与武器同表（按品质查武器基准）', () => {
    expect(baseUpOf('goods', { 品质: '蓝色' })).toBe(100);
    expect(baseUpOf('goods', { 品质: '金色' })).toBe(400);
    expect(baseUpOf('goods', { 品质: '白色' })).toBe(30);
  });
  it('品质不可识别 → 退白色武器下限 30', () => {
    expect(baseUpOf('goods', { 名称: '神秘材料' })).toBe(30);
    expect(baseUpOf('goods', { 品质: '特殊' })).toBe(30);
  });
});

describe('assessDeterministic · 数值超基准反查真实阶位（最高属性加成阈值，含超脱档）', () => {
  const 蓝武 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '一阶', 主属性: 'STR', 伤害骰: '无' };
  // 蓝·武器 主属性加成最高值表 [1,2,4,6,9,11]
  it('主属性加成 10 → 四阶（最高值+5 宽松：10 ≤ 四阶 6+5=11）', () => {
    const r = assessDeterministic({ ...蓝武, 主属性加成: 10 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(3); // 10 > 三阶 4+5=9，≤ 四阶 6+5=11 → 四阶
    expect(r.points[0]).toContain('四阶');
  });
  it('主属性加成 8 → 三阶（宽松：8 > 二阶 2+5=7，≤ 三阶 4+5=9）', () => {
    const r = assessDeterministic({ ...蓝武, 主属性加成: 8 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(2);
    expect(r.points[0]).toContain('三阶');
  });
  it('基准内（2 ≤ 二阶 2）→ 不触发', () => {
    expect(assessDeterministic({ ...蓝武, 主属性加成: 2 }, { quality: '蓝色', category: '武器' }, 1)).toBeNull();
  });
  it('副属性 4 ≤ 一阶最高 floor(1×0.5)+5=5 → 不触发（宽松）', () => {
    expect(assessDeterministic({ ...蓝武, 副属性加成: 4 }, { quality: '蓝色', category: '武器' }, 0)).toBeNull();
  });
  it('防御 200 超出各阶上限（15×[1,2,4,7,11]+6=171）→ 超脱', () => {
    const r = assessDeterministic({ ...蓝武, 装备防御: 200 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(5);
  });
  it('真实存档回归：夜翼披风（闪避2/一阶）与制式重甲（防御6/闪避-6/一阶）不触发', () => {
    expect(assessDeterministic({ 装备闪避: 2 }, { quality: '蓝色', category: '防具' }, 0)).toBeNull();
    expect(assessDeterministic({ 装备防御: 6, 装备闪避: -6 }, { quality: '白色', category: '防具' }, 0)).toBeNull();
  });
  it('饰品强化计入属性上限（基准+强化+5；+5 宽松对武器/防具/饰品一视同仁）', () => {
    // 蓝·饰品 主属性基准 [0,1,2,3,5,6]，强化+2 且 +5 宽松 → 一阶上限 = 0+2+5=7
    const cls = { quality: '蓝色', category: '饰品' };
    expect(assessDeterministic({ 名称: '戒', 品质: '蓝色', 类型: '饰品', 阶位: '一阶', 主属性加成: 3, 强化等级: 2 }, cls, 0)).toBeNull(); // 3 ≤ 7
    const r = assessDeterministic({ 名称: '戒', 品质: '蓝色', 类型: '饰品', 阶位: '一阶', 主属性加成: 8, 强化等级: 2 }, cls, 0)!;
    expect(r.realIdx).toBe(1); // 8 > 7，≤ 二阶 1+2+5=8 → 二阶
    expect(r.points[0]).toContain('强化');
  });
  it('多维度同时超模取较高者', () => {
    const r = assessDeterministic(
      { ...蓝武, 主属性加成: 8, 装备防御: 200 },
      { quality: '蓝色', category: '武器' },
      0,
    )!;
    expect(r.realIdx).toBe(5);
    expect(r.points.length).toBe(2);
  });
});

describe('nominalIdxOf / realTierIdx', () => {
  it('名义阶位解析（超脱 = 5，2026-09-23 起服务端正式支持）', () => {
    expect(nominalIdxOf({ 阶位: '三阶' }, '一阶')).toBe(2);
    expect(nominalIdxOf({}, '四阶')).toBe(3);
    expect(nominalIdxOf({ 阶位: '超脱阶' }, '一阶')).toBe(5);
    expect(nominalIdxOf({ 阶位: '认不出' }, '一阶')).toBeNull();
  });
  it('真实阶位名与下标互转', () => {
    expect(realTierIdx('超脱')).toBe(5);
    expect(realTierIdx('不存在')).toBeNull();
  });
});

describe('AI 语义判定 vs 数值反查的合并（钳制规则）', () => {
  // 复现用户场景：白武一阶，主属性加成 +5
  //   数值反查 = 四阶；AI 若判超脱，合并后不得超出「数值可证明的上限」
  const 白武 = { 名称: '制式刀', 品质: '白色', 类型: '武器', 阶位: '一阶', 主属性加成: 5, 副属性加成: 0, 装备防御: 0, 装备闪避: 0 };
  const cls = { quality: '白色', category: '武器' };

  it('数值可证明合规（一阶）时，AI 判超脱 → 数值层不超模，不收超模费', () => {
    // 白武+5：白武最高值 [1,1,2,4,6]+5 → 5 ≤ 一阶 6 → 数值层返回 null（合规）
    expect(assessDeterministic(白武, cls, 0)).toBeNull();
  });

  it('数值层无信号（纯效果文本）时，完全听 AI 的', () => {
    // 无属性加成/无防闪 → 数值层返回 null，合并 = AI 判定
    const det = assessDeterministic({ 名称: '符咒', 阶位: '一阶' }, { quality: '白色', category: '武器' }, 0);
    expect(det).toBeNull();
    // 此时 merged = aiSays（无数值兜底），见 store 合并逻辑
  });
});
