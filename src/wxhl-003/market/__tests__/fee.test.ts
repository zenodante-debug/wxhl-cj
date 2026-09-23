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
  it('一阶→超脱：和45，RP2250，UP2250000（实质挂不出去）', () => {
    expect(opFeeFor(0, 5, base)).toEqual({ sum: 45, rp: 2250, up: 2250000, realIdx: 5 });
  });
  it('用户原例：名义三阶→真实超脱 = 50×(4+7+11+20)=2100 RP', () => {
    const f = opFeeFor(2, 5, 400)!; // 金武
    expect(f.sum).toBe(4 + 7 + 11 + 20);
    expect(f.rp).toBe(2100);
    expect(f.up).toBe(400 * 500 * 42); // 8,400,000
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

describe('assessDeterministic · 数值超基准反查真实阶位', () => {
  const 蓝武 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '一阶', 主属性: 'STR', 伤害骰: '无' };
  // 蓝·武器 主属性基准 [1,2,4,6,9]
  it('主属性加成 8 → 四阶规格（含容差 8≤6+2）', () => {
    const r = assessDeterministic({ ...蓝武, 主属性加成: 8 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(3);
    expect(r.points[0]).toContain('四阶');
  });
  it('主属性加成 20 → 超出全部基准 → 超脱', () => {
    const r = assessDeterministic({ ...蓝武, 主属性加成: 20 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(5);
    expect(r.points[0]).toContain('超脱');
  });
  it('基准内+容差（2≤1+2）→ 不触发（真实存档回归：小幅偏差不收费）', () => {
    expect(assessDeterministic({ ...蓝武, 主属性加成: 2 }, { quality: '蓝色', category: '武器' }, 0)).toBeNull();
  });
  it('副属性按 floor(主×0.5)+容差 反查：4 → 三阶（4≤2+2）', () => {
    const r = assessDeterministic({ ...蓝武, 副属性加成: 4 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(2);
    expect(r.points[0]).toContain('三阶');
  });
  it('防御 200 超出各阶上限（15×[1,2,4,7,11]+6=171）→ 超脱', () => {
    const r = assessDeterministic({ ...蓝武, 装备防御: 200 }, { quality: '蓝色', category: '武器' }, 0)!;
    expect(r.realIdx).toBe(5);
  });
  it('真实存档回归：夜翼披风（闪避2/一阶）与制式重甲（防御6/闪避-6/一阶）不触发', () => {
    expect(assessDeterministic({ 装备闪避: 2 }, { quality: '蓝色', category: '防具' }, 0)).toBeNull();
    expect(assessDeterministic({ 装备防御: 6, 装备闪避: -6 }, { quality: '白色', category: '防具' }, 0)).toBeNull();
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
  it('名义阶位解析', () => {
    expect(nominalIdxOf({ 阶位: '三阶' }, '一阶')).toBe(2);
    expect(nominalIdxOf({}, '四阶')).toBe(3);
    expect(nominalIdxOf({ 阶位: '超脱' }, '一阶')).toBeNull(); // 名义不能是超脱
  });
  it('真实阶位名与下标互转', () => {
    expect(realTierIdx('超脱')).toBe(5);
    expect(realTierIdx('不存在')).toBeNull();
  });
});
