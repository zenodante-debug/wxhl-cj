import { describe, expect, it } from 'vitest';
import { 归一位阶 } from '../../dice';
import { classify } from '../priceTable';
import { validateEquip } from '../equipRules';

// ================================================================
// 装备结构校验（2026-09-23 起只拦结构/数据损坏类问题）：
// 效果条目铁律、骰面格式、模板字段完整性。
// 数值超基准与强效果已改为「超模收费上架」路径（见 fee.test.ts）。
// ================================================================

/** 合法的二阶蓝色武器（基准：主属性加成 蓝·武器·二阶 = 2） */
const 合法蓝武 = {
  名称: '制式长刀', 类型: '长剑战斧', 品质: '蓝色', 阶位: '二阶', 穿戴门槛: 'STR≥7',
  强化等级: 0, 伤害骰: '4d8', 倍率: 1, 主属性: 'STR', 副属性: 'AGI',
  主属性加成: 2, 副属性加成: 1, 装备防御: 0, 装备闪避: 0, 负重: 4.2,
  效果: { 利刃: '命中后小幅流血。', 配重: '挥砍判定+1。' }, 描述: '制式武器', 数量: 1,
};

function run(item: any) {
  const cls = classify(item);
  if (cls.kind !== 'equip') throw new Error('not equip: ' + JSON.stringify(cls));
  const tierIdx = 归一位阶(String(item.阶位 ?? '')) ?? 0;
  return validateEquip(item, cls, tierIdx);
}

describe('validateEquip · 结构校验', () => {
  it('完全合规的装备通过', () => {
    const r = run(合法蓝武);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('效果条目 =3 → 警告（破限器合法）；>3 → 拒绝', () => {
    const 三效果 = { ...合法蓝武, 效果: { 一: 'a', 二: 'b', 三: 'c' } };
    const r3 = run(三效果);
    expect(r3.errors).toEqual([]);
    expect(r3.warnings.some(w => w.includes('3'))).toBe(true);

    const 四效果 = { ...合法蓝武, 效果: { 一: 'a', 二: 'b', 三: 'c', 四: 'd' } };
    const r4 = run(四效果);
    expect(r4.ok).toBe(false);
    expect(r4.errors[0]).toContain('效果');
  });

  it('缺少模板字段 → 警告（不拒绝）', () => {
    const 缺字段 = { ...合法蓝武 };
    delete (缺字段 as any).穿戴门槛;
    delete (缺字段 as any).描述;
    const r = run(缺字段);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some(w => w.includes('穿戴门槛'))).toBe(true);
    expect(r.warnings.some(w => w.includes('描述'))).toBe(true);
  });

  it('伤害骰格式非法 → 拒绝（只认 d4/6/8/10/12/20/40）', () => {
    const r = run({ ...合法蓝武, 伤害骰: '2d7' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('d7'); // 骰面问题单独报，且带原值
    expect(run({ ...合法蓝武, 伤害骰: '很大' }).ok).toBe(false);
    expect(run({ ...合法蓝武, 伤害骰: '4D8' }).ok).toBe(true); // 大小写
    expect(run({ ...合法蓝武, 伤害骰: '无' }).ok).toBe(true); // 无骰（防具/饰品正常）
  });

  it('多骰面写法（4d20 / 14d10 / 6d10 / d20）合法', () => {
    expect(run({ ...合法蓝武, 伤害骰: '4d20' }).errors).toEqual([]);
    expect(run({ ...合法蓝武, 伤害骰: '14d10' }).errors).toEqual([]);
    expect(run({ ...合法蓝武, 伤害骰: '6d10' }).errors).toEqual([]);
    expect(run({ ...合法蓝武, 伤害骰: 'd20' }).errors).toEqual([]); // 单骰不带骰数
  });

  it('骰数超上限单独报错（带原值与骰数）', () => {
    const r = run({ ...合法蓝武, 伤害骰: '30d8' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('骰数');
    expect(r.errors[0]).toContain('30');
  });

  it('数值超基准/强效果不再在此拒绝（走超模收费路径），含必中的低阶装备结构上通过', () => {
    const r = run({ ...合法蓝武, 主属性加成: 20, 装备防御: 999, 效果: { 必中: '攻击必定命中。', 利刃: '流血。' } });
    expect(r.errors).toEqual([]); // 结构层面通过；费用由 fee 评估
  });
});
