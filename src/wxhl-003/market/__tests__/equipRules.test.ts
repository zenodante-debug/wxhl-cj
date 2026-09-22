import { describe, expect, it } from 'vitest';
import { 归一位阶 } from '../../dice';
import { classify } from '../priceTable';
import { validateEquip } from '../equipRules';

// ================================================================
// 装备系统规则校验 · 规则来源：世界书<装备效果强度限制>+<装备与消耗品系统>
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
});

describe('validateEquip · 数值校验（主属性加成基准表）', () => {
  it('主属性加成超基准 → 拒绝（蓝·武器·二阶基准2，容差+2）', () => {
    const r = run({ ...合法蓝武, 主属性加成: 5 });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('主属性加成');
    expect(run({ ...合法蓝武, 主属性加成: 4 }).ok).toBe(true); // 2+2 容差内
  });

  it('饰品的强化等级可提升加成上限', () => {
    const 饰品 = { ...合法蓝武, 类型: '戒指', 伤害骰: '无', 倍率: 0, 装备防御: 0, 装备闪避: 0, 负重: 0, 主属性加成: 3, 副属性加成: 1, 强化等级: 2 };
    // 蓝·饰品·二阶基准1；+强化2+容差2 = 5 → 3 通过
    expect(run(饰品).ok).toBe(true);
    const 超限 = { ...饰品, 主属性加成: 6 };
    expect(run(超限).ok).toBe(false);
  });

  it('副属性加成超基准 → 拒绝', () => {
    const r = run({ ...合法蓝武, 副属性加成: 4 }); // 基准 floor(2×0.5)=1，容差+2 → 上限3
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('副属性加成');
  });

  it('防具防御/闪避超软上限 → 拒绝（二阶上限 15×2+6=36，负值同判）', () => {
    expect(run({ ...合法蓝武, 类型: '躯干_重装', 装备防御: 40 }).ok).toBe(false);
    expect(run({ ...合法蓝武, 类型: '躯干_重装', 装备闪避: -40 }).ok).toBe(false);
    expect(run({ ...合法蓝武, 类型: '躯干_重装', 装备防御: 15, 装备闪避: -6 }).ok).toBe(true);
  });

  it('伤害骰格式非法 → 拒绝（只认 d4/6/8/10/12/20/40）', () => {
    expect(run({ ...合法蓝武, 伤害骰: '2d7' }).ok).toBe(false);
    expect(run({ ...合法蓝武, 伤害骰: '很大' }).ok).toBe(false);
    expect(run({ ...合法蓝武, 伤害骰: '4D8' }).ok).toBe(true); // 大小写
    expect(run({ ...合法蓝武, 伤害骰: '无' }).ok).toBe(true); // 无骰（防具/饰品正常）
  });
});

describe('validateEquip · 强效果限制', () => {
  it('低阶装备含 必中/无敌/锁血/即死/无限 特效 → 拒绝', () => {
    const r = run({ ...合法蓝武, 效果: { 必中: '攻击必定命中核心弱点。', 利刃: '流血。' } });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('必中');
    expect(run({ ...合法蓝武, 效果: { 无敌: '持续无敌3回合。', 利刃: '流血。' } }).ok).toBe(false);
  });

  it('四阶以上紫装可以带强效果词', () => {
    const 四阶紫武 = {
      ...合法蓝武, 品质: '紫色', 阶位: '四阶', 伤害骰: '10d12',
      主属性加成: 13, 副属性加成: 6, // 紫·武器·四阶基准13 → 副基准 floor(13/2)=6
      效果: { 霸者之刃: '消耗全部耐力，下一击必中。', 利刃: '流血。' },
    };
    const r = run(四阶紫武);
    expect(r.errors).toEqual([]);
  });

  it('四阶但蓝色品质带强效果词 → 仍拒绝（仅紫银可用）', () => {
    const r = run({ ...合法蓝武, 阶位: '四阶', 主属性加成: 6, 副属性加成: 3, 效果: { 必中: '必定命中。', 利刃: '流血。' } });
    expect(r.ok).toBe(false);
  });
});
