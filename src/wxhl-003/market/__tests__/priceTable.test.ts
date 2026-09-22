import { describe, expect, it } from 'vitest';
import { checkPrice, classify, hasEquipMarkers, parseCategory, parseQuality, refRange } from '../priceTable';

// ================================================================
// 测试用例来自用户真实存档（无限回廊7.0 聊天导出）+ 世界书装备系统规则
// ================================================================

/** 真实存档：夜翼披风（防具·躯干_极轻·蓝色·一阶） */
const 夜翼披风 = {
  描述: '用高位血族的羽翼边角料缝制的皮质披肩', 数量: 1, 名称: '夜翼披风',
  类型: '躯干_极轻', 品质: '蓝色', 阶位: '一阶', 穿戴门槛: 'AGI≥7', 强化等级: 0,
  伤害骰: '无', 倍率: 0, 主属性: 'AGI', 副属性: 'PER', 主属性加成: 0, 副属性加成: 0,
  装备防御: 0, 装备闪避: 2, 负重: 1,
  效果: { 夜幕隐匿: '微光环境下潜行判定+2。', 滞空滑翔: '坠落伤害减半。' },
};
/** 真实存档：制式精钢重甲（防具·躯干_重装·白色·一阶，带负闪避） */
const 制式重甲 = {
  主属性: 'CON', 主属性加成: 0, 伤害骰: '无', 倍率: 0, 副属性: 'STR', 副属性加成: 0,
  名称: '制式精钢重甲', 品质: '白色', 强化等级: 0, 描述: '粗制滥造的手工装甲',
  效果: { 排斥恶兆: '对黑暗属性攻击者造成微弱反伤。' }, 数量: 1, 穿戴门槛: 'STR≥8',
  类型: '躯干_重装', 装备闪避: -6, 装备防御: 6, 负重: 15, 阶位: '一阶',
};
/** 真实存档：圣水凝晶（消耗品，有品质+效果但无装备字段 → 道具） */
const 圣水凝晶 = {
  描述: '高浓度恢复药剂', 数量: 10, 名称: '圣水凝晶', 品质: '蓝色',
  效果: { 圣力洗礼: '解除异常状态。', 纯净恢复: '恢复30%生命。' },
  类型: '消耗品药剂', 阶位: '一阶',
};
/** 真实存档：特管局合作者徽记（品质"特殊" → 道具） */
const 徽记 = { 描述: '特管局合作凭证', 数量: 1, 名称: '特管局合作者徽记', 品质: '特殊', 类型: '凭证' };
/** 真实存档：背包里的技能条目（类型"被动" → 道具） */
const 技能卷轴 = {
  名称: '基础十字弩精通', 关联属性: 'AGI', 冷却: '无', 分类: '基础', 射程: '自身', 技能名称: '基础十字弩精通',
  描述: '学习后更熟练使用十字弩。', 效果: { 准星校准: '命中加值。' }, 数量: 1,
  消耗: '无', 目标: '自身', 等级: 1, 类型: '被动', 行动类型: '无', 阶位: '一阶',
};
/** 真实存档风格：撕裂指套（有伤害骰的手部武器） */
const 撕裂指套 = {
  主属性: 'AGI', 主属性加成: 1, 伤害骰: '1d6', 倍率: 1, 副属性: 'STR', 副属性加成: 0,
  名称: '撕裂指套', 品质: '蓝色', 强化等级: 0, 描述: '指刃', 效果: {}, 数量: 1,
  穿戴门槛: '无', 类型: '手部_极轻', 装备闪避: 0, 装备防御: 0, 负重: 0.5, 阶位: '一阶',
};

describe('parseQuality · 品质归一', () => {
  it('标准写法', () => {
    expect(parseQuality('蓝色')?.quality).toBe('蓝色');
    expect(parseQuality('白')?.quality).toBe('白色');
    expect(parseQuality('金色')?.quality).toBe('金色');
    expect(parseQuality('紫色')?.quality).toBe('紫色');
    expect(parseQuality('银色')?.quality).toBe('银色');
  });
  it('灰色封印(原品质) 解包', () => {
    const g = parseQuality('灰色封印(紫色)');
    expect(g?.quality).toBe('紫色');
    expect(g?.gray).toBe(true);
  });
  it('不可定价的品质返回 null（特殊/无/空）', () => {
    expect(parseQuality('特殊')).toBeNull();
    expect(parseQuality('无')).toBeNull();
    expect(parseQuality(undefined)).toBeNull();
    expect(parseQuality('')).toBeNull();
  });
});

describe('hasEquipMarkers · 装备字段信号', () => {
  it('真实装备都有信号', () => {
    expect(hasEquipMarkers(夜翼披风)).toBe(true); // 穿戴门槛+装备闪避+主属性
    expect(hasEquipMarkers(制式重甲)).toBe(true); // 装备防御+负重
    expect(hasEquipMarkers(撕裂指套)).toBe(true); // 伤害骰+主属性
  });
  it('消耗品/凭证/技能没有装备信号（即使有品质和效果）', () => {
    expect(hasEquipMarkers(圣水凝晶)).toBe(false);
    expect(hasEquipMarkers(徽记)).toBe(false);
    expect(hasEquipMarkers(技能卷轴)).toBe(false);
  });
});

describe('parseCategory · 类型→武器/防具/饰品', () => {
  it('真实类型写法', () => {
    expect(parseCategory(夜翼披风)).toBe('防具'); // 躯干_极轻
    expect(parseCategory(制式重甲)).toBe('防具'); // 躯干_重装
    expect(parseCategory({ ...撕裂指套 })).toBe('武器'); // 伤害骰 1d6 信号
    expect(parseCategory({ 名称: '测试', 类型: '短兵器' })).toBe('武器');
    expect(parseCategory({ 名称: '测试', 类型: '副武器' })).toBe('武器');
    expect(parseCategory({ 名称: '测试', 类型: '饰品' })).toBe('饰品');
    expect(parseCategory({ 名称: '测试', 类型: '戒指' })).toBe('饰品');
  });
  it('部位槽位词优先于饰品词', () => {
    expect(parseCategory({ 名称: '测试', 类型: '头部_轻装' })).toBe('防具');
    expect(parseCategory({ 名称: '测试', 类型: '下装_重装' })).toBe('防具');
  });
  it('无类型时按数值信号兜底', () => {
    expect(parseCategory({ 名称: '测试', 伤害骰: '2d6' })).toBe('武器');
    expect(parseCategory({ 名称: '测试', 装备防御: 3, 装备闪避: -1 })).toBe('防具');
    expect(parseCategory({ 名称: '测试', 主属性: 'AGI', 主属性加成: 1 })).toBe('饰品');
  });
});

describe('classify · 装备/道具分类（真实存档回归）', () => {
  it('夜翼披风 → 装备·防具·蓝色', () => {
    const c = classify(夜翼披风);
    expect(c.kind).toBe('equip');
    if (c.kind === 'equip') {
      expect(c.quality).toBe('蓝色');
      expect(c.category).toBe('防具');
    }
  });
  it('制式重甲 → 装备·防具·白色（灰色封印解包）', () => {
    const c = classify({ ...制式重甲, 品质: '灰色封印(白色)' });
    expect(c.kind).toBe('equip');
    if (c.kind === 'equip') {
      expect(c.quality).toBe('白色');
      expect(c.gray).toBe(true);
    }
  });
  it('圣水凝晶（有品质有效果）→ 道具', () => {
    expect(classify(圣水凝晶).kind).toBe('goods');
  });
  it('徽记（品质特殊）→ 道具', () => {
    expect(classify(徽记).kind).toBe('goods');
  });
  it('技能卷轴 → 道具', () => {
    expect(classify(技能卷轴).kind).toBe('goods');
  });
  it('剥离属性字段但保留品质+类型的武器 → 仍判装备（防伪装绕价）', () => {
    const 剥离的武器 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶', 数量: 1 };
    const c = classify(剥离的武器);
    expect(c.kind).toBe('equip');
    if (c.kind === 'equip') {
      expect(c.category).toBe('武器');
      expect(c.quality).toBe('蓝色');
    }
  });
  it('品质+类型都剥掉的无信号物品 → 道具（市集按道具卡如实展示）', () => {
    expect(classify({ 名称: '神秘宝物', 数量: 1, 描述: '看不出是什么' }).kind).toBe('goods');
  });
});

describe('refRange · 一阶基准×阶位²', () => {
  it('蓝·武器·二阶 = [100,200]×4', () => {
    expect(refRange('蓝色', '武器', '二阶')).toEqual({ min: 400, max: 800 });
  });
  it('紫·饰品·三阶 = [1200,2500]×9', () => {
    expect(refRange('紫色', '饰品', '三阶')).toEqual({ min: 10800, max: 22500 });
  });
});

describe('checkPrice · equip（底价=基准下限，无折扣）', () => {
  it('蓝装平价：[基准下限, 基准上限]，禁溢价', () => {
    const 蓝武器二阶 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶', 数量: 1 };
    expect(checkPrice('equip', 蓝武器二阶, '一阶', 400).ok).toBe(true);
    expect(checkPrice('equip', 蓝武器二阶, '一阶', 800).ok).toBe(true);
    expect(checkPrice('equip', 蓝武器二阶, '一阶', 801).ok).toBe(false);
    expect(checkPrice('equip', 蓝武器二阶, '一阶', 399).ok).toBe(false); // 底价=基准下限 400
  });
  it('金装最多+50%', () => {
    const 金防具一阶 = { 名称: '秘银胸甲', 品质: '金色', 类型: '防具', 阶位: '一阶' };
    expect(checkPrice('equip', 金防具一阶, '一阶', 250).ok).toBe(true); // 基准下限
    expect(checkPrice('equip', 金防具一阶, '一阶', 900).ok).toBe(true); // 600×1.5
    expect(checkPrice('equip', 金防具一阶, '一阶', 901).ok).toBe(false);
    expect(checkPrice('equip', 金防具一阶, '一阶', 249).ok).toBe(false);
  });
  it('紫装上限=基准上限×2，下限=基准下限', () => {
    const 紫饰品三阶 = { 名称: '龙血吊坠', 品质: '紫色', 类型: '饰品', 阶位: '三阶' };
    expect(checkPrice('equip', 紫饰品三阶, '一阶', 10800).ok).toBe(true);
    expect(checkPrice('equip', 紫饰品三阶, '一阶', 45000).ok).toBe(true); // 22500×2
    expect(checkPrice('equip', 紫饰品三阶, '一阶', 45001).ok).toBe(false);
    expect(checkPrice('equip', 紫饰品三阶, '一阶', 10799).ok).toBe(false);
  });
  it('白装/银装拒绝上架', () => {
    expect(checkPrice('equip', { 名称: '铁剑', 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
    expect(checkPrice('equip', { 名称: '圣剑', 品质: '银色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
  });
  it('物品缺阶位时按卖家阶位算', () => {
    const 无阶蓝武 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器' };
    expect(checkPrice('equip', 无阶蓝武, '三阶', 1800).ok).toBe(true); // [100,200]×9
    expect(checkPrice('equip', 无阶蓝武, '三阶', 1801).ok).toBe(false);
  });
});

describe('checkPrice · goods（[5,3000]×阶位²）', () => {
  it('一阶道具：5~3000 UP', () => {
    expect(checkPrice('goods', { ...圣水凝晶 }, '一阶', 15).ok).toBe(true);
    expect(checkPrice('goods', { ...徽记 }, '一阶', 5).ok).toBe(true);
    expect(checkPrice('goods', { ...技能卷轴 }, '一阶', 100).ok).toBe(true); // 基础技能卷轴100
    expect(checkPrice('goods', { ...技能卷轴 }, '一阶', 600).ok).toBe(true); // 高级技能卷轴600
    expect(checkPrice('goods', { ...圣水凝晶 }, '一阶', 4).ok).toBe(false);
    expect(checkPrice('goods', { ...圣水凝晶 }, '一阶', 3001).ok).toBe(false);
  });
  it('道具自带阶位时按物品阶位算', () => {
    // 圣水凝晶 阶位一阶，卖家五阶 → 按物品一阶算 [5,3000]
    expect(checkPrice('goods', { ...圣水凝晶 }, '五阶', 3000).ok).toBe(true);
    expect(checkPrice('goods', { ...圣水凝晶 }, '五阶', 3001).ok).toBe(false);
  });
  it('无阶位道具按卖家阶位算（五阶 [125, 75000]）', () => {
    const 无阶道具 = { 名称: '神秘材料', 数量: 3 };
    expect(checkPrice('goods', 无阶道具, '五阶', 50000).ok).toBe(true);
    expect(checkPrice('goods', 无阶道具, '五阶', 80000).ok).toBe(false);
  });
  it('数量与价格防刷', () => {
    expect(checkPrice('goods', { ...圣水凝晶, 数量: 100 }, '一阶', 15).ok).toBe(false);
    expect(checkPrice('goods', { ...圣水凝晶, 数量: 0 }, '一阶', 15).ok).toBe(false);
    expect(checkPrice('goods', { ...圣水凝晶 }, '一阶', -1).ok).toBe(false);
  });
});
