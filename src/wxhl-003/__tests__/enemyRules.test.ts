import { describe, expect, it } from 'vitest';
import { ENEMY_KINDS, EnemyGenResultSchema, assembleEnemyPanel, mapEnemyToVariables } from '../enemyRules';

const 一只杂兵 = {
  名称: '腐化游民',
  类型: '杂兵',
  外貌: '皮肤灰败、指节外翻的人形',
  构筑: '无脑冲锋, 靠数量压制',
  等级: 6,
  阶位: '一阶',
  天赋: { 名称: '腐臭血肉', 品质: '白色', 属性加成: 'CON+1', 效果: { 腐臭: '被近战命中时使对方中毒1回合' } },
  血统: { 名称: '感染者', 品质: '白色', 属性加成: '无', 效果: { 病源: '免疫同类毒素' } },
  称号: { 名称: '无', 效果: {} },
  属性基础: { STR: 12, AGI: 8, CON: 14, PER: 8 },
  衍生额外加成: { HP额外加成: 0, MP额外加成: 0, 耐力额外加成: 0, 防御额外加成: 0, 闪避额外加成: 0, 移动距离额外加成: 0, 负重额外加成: 0 },
  通用技能: {
    撕咬: { 分类: '基础', 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 消耗: '无', 冷却: '无', 射程: '近战', 目标: '单体', 阶位: '一阶', 属性要求: '无', 等级: 1, 效果: { 撕咬: '造成STR修正×0.3的物理伤害' } },
  },
  装备: {
    头部: { 名称: '无', 类型: '无', 品质: '无', 阶位: '无', 穿戴门槛: '无', 强化等级: 0, 伤害骰: '无', 倍率: 0, 主属性: '无', 副属性: '无', 主属性加成: 0, 副属性加成: 0, 装备防御: 0, 装备闪避: 0, 负重: 0, 效果: {}, 描述: '无', 数量: 1 },
  },
  特殊状态: {},
  背包: {},
};

const 结果 = { 敌人: [{ ...一只杂兵 }, { ...一只杂兵, 名称: '精英甲', 类型: '精英' as const, 等级: 9 }, { ...一只杂兵, 名称: 'BOSS甲', 类型: 'BOSS' as const, 等级: 11, 职业: { 名称: '腐潮领主', 稀有度: '金色' } }] };

describe('EnemyGenResultSchema', () => {
  it('接受合法结果', () => {
    expect(() => EnemyGenResultSchema.parse(结果)).not.toThrow();
  });
  it('数组长度必须恰好是 3', () => {
    expect(() => EnemyGenResultSchema.parse({ 敌人: 结果.敌人.slice(0, 2) })).toThrow();
  });
  it('拒绝不在枚举里的类型', () => {
    expect(() => EnemyGenResultSchema.parse({ 敌人: [{ ...一只杂兵, 类型: '隐藏BOSS' }, 结果.敌人[1], 结果.敌人[2]] })).toThrow();
  });
  it('类型枚举固定为 杂兵 / 精英 / BOSS', () => {
    expect(ENEMY_KINDS).toEqual(['杂兵', '精英', 'BOSS']);
  });
});

describe('mapEnemyToVariables', () => {
  const v: any = mapEnemyToVariables(结果.敌人[0] as any);

  it('顶层键与实体 schema 对齐', () => {
    for (const k of ['外貌', '类型', '构筑', '好感度', '头部', '属性', '衍生属性', '职业', '通用技能', '装备', '状态', '背包']) {
      expect(v).toHaveProperty(k);
    }
  });

  it('头部带等级/阶位/天赋/血统/称号', () => {
    expect(v.头部.等级).toBe(6);
    expect(v.头部.阶位).toBe('一阶');
    expect(v.头部.天赋.名称).toBe('腐臭血肉');
    expect(v.头部.称号.当前称号.名称).toBe('无');
  });

  it('属性只写 基础 与 自定义加成, 不写 加成/实际/属性修正值', () => {
    expect(v.属性.基础).toEqual({ STR: 12, AGI: 8, CON: 14, PER: 8 });
    expect(v.属性.自定义加成).toEqual({ STR: 0, AGI: 0, CON: 0, PER: 0 });
    expect(v.属性).not.toHaveProperty('加成');
    expect(v.属性).not.toHaveProperty('实际');
    expect(v.属性).not.toHaveProperty('属性修正值');
  });

  it('衍生属性只写 7 个额外加成, 不写任何最大值/当前值', () => {
    expect(Object.keys(v.衍生属性).sort()).toEqual(
      ['HP额外加成', 'MP额外加成', '耐力额外加成', '防御额外加成', '闪避额外加成', '移动距离额外加成', '负重额外加成'].sort(),
    );
    for (const bad of ['HP_最大', 'MP_最大', '耐力_最大', '防御', '闪避值', '移动距离', '负重_上限', 'HP_当前', 'MP_当前', '耐力_当前']) {
      expect(v.衍生属性).not.toHaveProperty(bad);
    }
  });

  it('状态只写 特殊状态', () => {
    expect(v.状态).toEqual({ 特殊状态: {} });
  });
});

describe('assembleEnemyPanel', () => {
  const p = assembleEnemyPanel(结果.敌人[0] as any);
  it('以 <enemy> 包裹并闭合', () => {
    expect(p.startsWith('<enemy>')).toBe(true);
    expect(p.trimEnd().endsWith('</enemy>')).toBe(true);
  });
  it('含全部必需行', () => {
    for (const tag of ['[名称|', '[类型|', '[外观|', '[生命|', '[威胁|', '[属性|', '[防御|', '[底牌|', '[装备|', '[技能|']) {
      expect(p).toContain(tag);
    }
  });
  it('杂兵不输出 [职业] 行', () => {
    expect(p).not.toContain('[职业|');
  });
  it('BOSS 输出 [职业] 行', () => {
    expect(assembleEnemyPanel(结果.敌人[2] as any)).toContain('[职业|');
  });
  it('装备行按七槽顺序, 未装备的槽写「无」', () => {
    const 装 = p.split('\n').find(l => l.startsWith('[装备|'))!;
    const 序 = ['【头部】', '【躯干】', '【手部】', '【下装】', '【饰品】', '【主武器】', '【副武器】'];
    let last = -1;
    for (const s of 序) { const i = 装.indexOf(s); expect(i).toBeGreaterThan(last); last = i; }
  });

  // ===== 严格对齐用户规则第七步的逐字格式 =====
  it('[生命] 写 1/1 占位（真实值由前端代算）', () => {
    expect(p).toContain('[生命|1/1]');
  });
  it('[属性] 行严格形状: 【等级】Lv.X | 【阶位】X | STR:.. 四维', () => {
    expect(p).toContain('[属性|【等级】Lv.6 | 【阶位】一阶 | STR:12 | AGI:8 | CON:14 | PER:8]');
  });
  it('[防御] 行严格形状: 【防御】X | 【闪避】X', () => {
    expect(p).toContain('[防御|【防御】0 | 【闪避】0]');
  });
  it('[底牌] 行严格形状: 【称号】 / 【天赋】 / 【血统】', () => {
    expect(p).toContain('[底牌|【称号】无 / 【天赋】腐臭血肉（腐臭--被近战命中时使对方中毒1回合） / 【血统】感染者（病源--免疫同类毒素）]');
  });
  it('[装备] 行七槽用「 / 」分隔, 未装备写「无」', () => {
    expect(p).toContain('[装备|【头部】无 / 【躯干】无 / 【手部】无 / 【下装】无 / 【饰品】无 / 【主武器】无 / 【副武器】无]');
  });
  it('[技能] 行严格形状: 技能名:（类型·行动类型·关联属性·消耗·冷却）效果名--效果内容', () => {
    const 技 = p.split('\n').find(l => l.startsWith('[技能|'))!;
    expect(技).toContain('（');
    expect(技).toContain('--');
    expect(技).toContain('[技能|撕咬:（主动·主要行动·STR·无·无）撕咬--造成STR修正×0.3的物理伤害]');
  });
  it('BOSS 的 [职业] 行严格形状: 职业名称 / 职业特性 / 职业技能', () => {
    expect(assembleEnemyPanel(结果.敌人[2] as any)).toContain('[职业|【职业名称】腐潮领主（金色） / 【职业特性】无 / 【职业技能】无]');
  });
});
