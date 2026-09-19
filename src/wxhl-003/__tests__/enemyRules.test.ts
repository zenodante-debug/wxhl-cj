import { describe, expect, it } from 'vitest';
import { ENEMY_KINDS, EnemyGenResultSchema, assembleEnemyPanelFromEntity, computeDerivedStats, mapEnemyToVariables, 前端已代算 } from '../enemyRules';

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

  it('顶层键与实体 schema 对齐（杂兵无「职业」, BOSS 必须有）', () => {
    for (const k of ['外貌', '类型', '构筑', '好感度', '头部', '属性', '衍生属性', '通用技能', '装备', '状态', '背包']) {
      expect(v).toHaveProperty(k);
    }
    // 规则原文: 杂兵、精英无职业 —— 不写该键, 由 MVU schema 的 prefault 兜底（不写显式 undefined）
    expect(v).not.toHaveProperty('职业');
    const boss: any = mapEnemyToVariables(结果.敌人[2] as any);
    expect(boss).toHaveProperty('职业');
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

  it('属性自定义加成: AI 没给时全 0, AI 给了则原样保留', () => {
    // 默认（AI 没给该字段）→ 全 0
    expect(v.属性.自定义加成).toEqual({ STR: 0, AGI: 0, CON: 0, PER: 0 });
    // AI 给了 → 保留
    const 有加成: any = mapEnemyToVariables({ ...一只杂兵, 属性自定义加成: { STR: 5, AGI: 0, CON: 0, PER: 0 } } as any);
    expect(有加成.属性.自定义加成).toEqual({ STR: 5, AGI: 0, CON: 0, PER: 0 });
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

describe('assembleEnemyPanelFromEntity', () => {
  const p = assembleEnemyPanelFromEntity('腐化游民', mapEnemyToVariables(结果.敌人[0] as any) as any, '极低单体，集群麻烦');
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
    expect(assembleEnemyPanelFromEntity('BOSS甲', mapEnemyToVariables(结果.敌人[2] as any) as any)).toContain('[职业|');
  });
  it('装备行按七槽顺序, 未装备的槽写「无」', () => {
    const 装 = p.split('\n').find(l => l.startsWith('[装备|'))!;
    const 序 = ['【头部】', '【躯干】', '【手部】', '【下装】', '【饰品】', '【主武器】', '【副武器】'];
    let last = -1;
    for (const s of 序) { const i = 装.indexOf(s); expect(i).toBeGreaterThan(last); last = i; }
  });

  // ===== 严格对齐用户规则第七步的逐字格式 =====
  it('[生命] 按 6-2 公式写 最大HP/最大HP（满血出场）, 不再占位', () => {
    expect(p).toContain('[生命|112/112]');
  });
  it('[属性] 行严格形状: 【等级】Lv.X | 【阶位】X | STR:.. 四维', () => {
    expect(p).toContain('[属性|【等级】Lv.6 | 【阶位】一阶 | STR:12 | AGI:8 | CON:14 | PER:8]');
  });
  it('[防御] 行按 6-2 公式写 防御 / 闪避值, 不再占位', () => {
    expect(p).toContain('[防御|【防御】2 | 【闪避】11]');
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
    expect(assembleEnemyPanelFromEntity('BOSS甲', mapEnemyToVariables(结果.敌人[2] as any) as any)).toContain('[职业|【职业名称】腐潮领主（金色） / 【职业特性】无 / 【职业技能】无]');
  });
});

describe('assembleEnemyPanelFromEntity（前端已代算）', () => {
  const 基础实体: any = mapEnemyToVariables(结果.敌人[0] as any);
  const 已代算实体: any = {
    ...基础实体,
    属性: { ...基础实体.属性, 实际: { STR: 40, AGI: 30, CON: 60, PER: 20 } },
    衍生属性: { ...基础实体.衍生属性, HP_最大: 900, HP_当前: 700, 防御: 55, 闪避值: 42 },
  };

  it('前端已代算: 判据是 衍生属性.HP_最大 > 0', () => {
    expect(前端已代算(基础实体)).toBe(false);      // 未代算: 只有额外加成, 无 HP_最大
    expect(前端已代算(已代算实体)).toBe(true);
    expect(前端已代算(undefined)).toBe(false);
    expect(前端已代算({})).toBe(false);
  });

  it('[生命] 取实体里的 HP_当前/HP_最大, 不是模块自算值', () => {
    const p = assembleEnemyPanelFromEntity('腐化游民', 已代算实体, '极低单体，集群麻烦');
    expect(p).toContain('[生命|700/900]');
    expect(p).not.toContain('[生命|112/112]'); // 模块自算的杂兵回退值
  });

  it('[防御] 取实体里的 防御/闪避值, 不是模块自算值', () => {
    const p = assembleEnemyPanelFromEntity('腐化游民', 已代算实体, '极低单体，集群麻烦');
    expect(p).toContain('[防御|【防御】55 | 【闪避】42]');
  });

  it('[属性] 四维取 属性.实际（含装备加成）, 不是 属性.基础', () => {
    const p = assembleEnemyPanelFromEntity('腐化游民', 已代算实体, '极低单体，集群麻烦');
    expect(p).toContain('STR:40');   // 实际
    expect(p).not.toContain('STR:12'); // 基础
  });

  it('实体字段大量缺失也不抛错, 仍返回闭合的 <enemy>…</enemy>', () => {
    let p = '';
    expect(() => { p = assembleEnemyPanelFromEntity('无名', {}); }).not.toThrow();
    expect(p.startsWith('<enemy>')).toBe(true);
    expect(p.trimEnd().endsWith('</enemy>')).toBe(true);
  });
});

// ===== 用户规则 6-2 的衍生属性公式（只用于面板, 不写变量） =====
const 七键 = ['HP额外加成', 'MP额外加成', '耐力额外加成', '防御额外加成', '闪避额外加成', '移动距离额外加成', '负重额外加成'];

describe('computeDerivedStats（6-2 公式）', () => {
  const 基准 = { 类型: '杂兵', 阶位: '一阶', 属性基础: { STR: 12, AGI: 8, CON: 14, PER: 8 }, 衍生额外加成: {}, 装备: {} };

  it('位阶修正系数: 一阶1 / 二阶2 / 三阶4 / 四阶7 / 五阶11（以 PER 修正 × 10 = 最大MP 观察）', () => {
    const e = { ...基准, 属性基础: { STR: 5, AGI: 5, CON: 5, PER: 6 } } as any; // PER修正 = (6-5)×系数
    expect(computeDerivedStats({ ...e, 阶位: '一阶' }).最大MP).toBe(10);
    expect(computeDerivedStats({ ...e, 阶位: '二阶' }).最大MP).toBe(20);
    expect(computeDerivedStats({ ...e, 阶位: '三阶' }).最大MP).toBe(40);
    expect(computeDerivedStats({ ...e, 阶位: '四阶' }).最大MP).toBe(70);
    expect(computeDerivedStats({ ...e, 阶位: '五阶' }).最大MP).toBe(110);
  });

  it('最大HP 的类型系数: 杂兵8 / 精英10 / BOSS20（CON14, 一阶 → CON修正9）', () => {
    expect(computeDerivedStats({ ...基准, 类型: '杂兵' } as any).最大HP).toBe(112);
    expect(computeDerivedStats({ ...基准, 类型: '精英' } as any).最大HP).toBe(140);
    expect(computeDerivedStats({ ...基准, 类型: 'BOSS' } as any).最大HP).toBe(280);
  });

  it('七个衍生属性全部按 6-2 公式算出（含 Σ装备防御/闪避 与 额外加成, 防御 0.2 项向下取整）', () => {
    const boss = {
      类型: 'BOSS',
      阶位: '二阶',
      属性基础: { STR: 40, AGI: 20, CON: 30, PER: 10 },
      衍生额外加成: { HP额外加成: 100, MP额外加成: 0, 耐力额外加成: 0, 防御额外加成: 5, 闪避额外加成: 2, 移动距离额外加成: 1, 负重额外加成: 50 },
      装备: { 头部: { 名称: '头盔', 装备防御: 10, 装备闪避: 3 }, 主武器: { 名称: '巨剑', 装备防御: 0, 装备闪避: 0 } },
    } as any;
    // 二阶系数2: CON修正50 / AGI修正30 / PER修正10
    const d = computeDerivedStats(boss);
    expect(d.最大HP).toBe((50 + 5) * 20 + 100); // 1200
    expect(d.最大MP).toBe(10 * 10 + 0); // 100
    expect(d.最大耐力).toBe((50 + 5) * 10 + 0); // 550
    expect(d.防御).toBe(Math.floor((50 + 5) * 0.2) + 10 + 5); // 11+15 = 26
    expect(d.闪避值).toBe(10 + Math.floor(30 * 0.5) + 3 + 2); // 30
    expect(d.移动距离).toBe(5 + 30 + 1); // 36
    expect(d.负重上限).toBe(40 * 5 + 50); // 250
  });

  it('负重上限 用的是 STR实际值 × 5, 不是 STR修正值（易错点）', () => {
    const e = { 类型: 'BOSS', 阶位: '二阶', 属性基础: { STR: 40, AGI: 5, CON: 5, PER: 5 }, 衍生额外加成: { 负重额外加成: 50 }, 装备: {} } as any;
    // STR实际值 40 → 40×5+50 = 250；若误用 STR修正值 (40-5)×2=70 → 400
    expect(computeDerivedStats(e).负重上限).toBe(250);
  });
});

describe('衍生属性白名单重建', () => {
  it('AI 多给的被禁字段不会漏进变量（按 7 个白名单键重建）', () => {
    const 脏 = {
      ...一只杂兵,
      衍生额外加成: { HP额外加成: 3, HP_最大: 999, MP_最大: 500, 防御: 77, 闪避值: 123, 耐力_当前: 7 },
    } as any;
    const v: any = mapEnemyToVariables(脏);
    expect(Object.keys(v.衍生属性).sort()).toEqual([...七键].sort());
    expect(v.衍生属性.HP额外加成).toBe(3);
    for (const bad of ['HP_最大', 'MP_最大', '防御', '闪避值', '耐力_当前']) {
      expect(v.衍生属性).not.toHaveProperty(bad);
    }
  });
});

describe('威胁 从 AI 结果流到面板', () => {
  it('parse 后 [威胁] 行是 AI 给的评估文本, 不是占位回退', () => {
    const parsed = EnemyGenResultSchema.parse({
      敌人: [
        { ...一只杂兵, 威胁: '极低单体，集群麻烦' },
        { ...一只杂兵, 名称: '精英甲', 类型: '精英' },
        { ...一只杂兵, 名称: 'BOSS甲', 类型: 'BOSS' },
      ],
    });
    const panel = assembleEnemyPanelFromEntity('腐化游民', mapEnemyToVariables(parsed.敌人[0]) as any, parsed.敌人[0].威胁);
    expect(panel).toContain('[威胁|极低单体，集群麻烦]');
    expect(panel).not.toContain('[威胁|一阶 · Lv.6]');
  });
});
