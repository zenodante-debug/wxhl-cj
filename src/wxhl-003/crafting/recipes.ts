// ================================================================
// 配方 zod schema + 材料分类词典 + 内置配方（模板/标准）
// 设计填补：GOODS_BASE 固定值、启发式词典内容均为可调初值
// ================================================================
import type { Attr, Quality } from './equipTables';
import type { EffectEntry } from './effectRules';

export const 材料类别 = ['金属', '布料皮革', '草药', '矿石', '能量', '怪物素材', '食材', '火药', '任意'] as const;
export type MaterialCategory = (typeof 材料类别)[number];
export const 行业列表 = ['锻造', '裁缝', '炼金', '工程', '烹饪'] as const;
export type 行业 = (typeof 行业列表)[number];

export const 材料需求Schema = z.object({
  类别: z.enum(材料类别),
  数量: z.coerce.number(),
  核心: z.boolean().prefault(false),
});

/** 效果条目 zod 版（与 effectRules.EffectEntry 同构） */
export const EffectEntrySchema = z.object({
  类型: z.enum(['常驻', '触发', '消耗']).prefault('常驻'),
  描述: z.string().prefault(''),
  命中闪避: z.coerce.number().optional(),
  伤害百分比: z.coerce.number().optional(),
  属性加成: z.coerce.number().optional(),
  触发条件: z.string().optional(),
  消耗: z.string().optional(),
});

/** 编译期同构断言：zod 产出必须与 effectRules.EffectEntry 双向兼容，任一侧漂移即编译失败 */
export type 效果条目同构 = z.infer<typeof EffectEntrySchema> extends EffectEntry
  ? EffectEntry extends z.infer<typeof EffectEntrySchema>
    ? true
    : never
  : never;

export const 配方Schema = z.object({
  名称: z.string(),
  来源: z.enum(['模板', '标准', '图纸', '自定义']),
  行业: z.enum(行业列表),
  成品类型: z.enum(['装备', '消耗品']),
  装备子类: z.enum(['武器', '防具', '饰品']).or(z.literal('')).prefault(''),
  品质: z.enum(['白色', '蓝色', '金色', '紫色']),
  阶位: z.coerce.number().prefault(1), // 模板配方仅为默认值，制作时由玩家选择
  材料: z.array(材料需求Schema),
  技能要求: z.object({
    分类: z.enum(['基础', '高级']),
    等级: z.coerce.number(),
  }),
  批量上限: z.coerce.number().prefault(1),
  装备基础: z.string().prefault(''), // 武器=WEAPON_TABLE 键；防具=光谱；消耗品=''
  成品名: z.string().prefault(''), // 图纸指定成品名；空则用「核心材料名+类型词」
  描述: z.string().prefault(''), // 图纸自带的风味文案（AI 定制时写入，玩家可编辑）
  效果: z.array(EffectEntrySchema).prefault([]), // 金/紫图纸配方的特效（白/蓝为空）
});
export type 配方 = z.infer<typeof 配方Schema>;

/** 材料档案：物品名 → 归类（存小手机聊天变量，玩家可手动修正） */
export interface 材料档案条目 {
  类别: MaterialCategory | '未分类';
  品质: Quality;
  阶位: number;
}

// ---- 启发式词典（可调；命中即归，按数组顺序先匹配火药防"药"字误伤）----
const CATEGORY_KEYWORDS: readonly (readonly [MaterialCategory, readonly string[]])[] = [
  ['火药', ['火药', '炸药', '硝', '硫磺', '引线']],
  ['金属', ['铁', '钢', '铜', '银', '金', '铝', '钛', '合金', '振金', '秘银', '精金', '金属']],
  ['怪物素材', ['牙', '鳞', '骨', '角', '爪', '血', '眼', '筋', '尾巴', '甲壳', '毒囊', '内丹', '魔核']],
  ['草药', ['草', '花', '藤', '根', '叶', '药草', '灵草', '苔', '蘑菇', '菌']],
  ['矿石', ['矿', '晶', '宝石', '钻', '翡翠', '玛瑙', '水晶']],
  ['能量', ['能量', '电池', '核心', '魔力', '结晶', '燃料', '瓦斯']],
  ['食材', ['肉', '米', '面', '鱼', '蛋', '菜', '果', '粮', '调料', '香料']],
  ['布料皮革', ['布', '皮', '革', '丝绸', '绒', '纤维', '织物']],
];

export function 启发式归类(物品名: string): MaterialCategory | '未分类' {
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    if (words.some(w => 物品名.includes(w))) return cat;
  }
  return '未分类';
}

/** 行业 → 检定用基础属性（数组形式，烹饪 CON/PER 取高——世界书原文未指定取法，设计决定） */
export const INDUSTRY_ATTR: Record<行业, readonly Attr[]> = {
  锻造: ['STR'],
  裁缝: ['AGI'],
  炼金: ['PER'],
  工程: ['PER'],
  烹饪: ['CON', 'PER'],
};

// ---- 内置模板配方（装备；阶位制作时可选，子类型制作时可选）----
export const TEMPLATE_RECIPES: 配方[] = (['白色', '蓝色'] as const).flatMap(品质 => {
  const 技能要求 = { 分类: '基础' as const, 等级: 品质 === '白色' ? 1 : 3 };
  return [
    配方Schema.parse({
      名称: `锻造·武器（${品质}）`, 来源: '模板', 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
      品质, 材料: [{ 类别: '金属', 数量: 2, 核心: true }, { 类别: '任意', 数量: 3, 核心: false }], 技能要求,
    }),
    配方Schema.parse({
      名称: `锻造·重甲（${品质}）`, 来源: '模板', 行业: '锻造', 成品类型: '装备', 装备子类: '防具',
      品质, 材料: [{ 类别: '金属', 数量: 3, 核心: true }, { 类别: '布料皮革', 数量: 1, 核心: false }], 技能要求,
    }),
    配方Schema.parse({
      名称: `裁缝·轻甲（${品质}）`, 来源: '模板', 行业: '裁缝', 成品类型: '装备', 装备子类: '防具',
      品质, 材料: [{ 类别: '布料皮革', 数量: 2, 核心: true }, { 类别: '任意', 数量: 2, 核心: false }], 技能要求,
    }),
  ];
});

// ---- 内置标准道具配方（消耗品；照抄世界书物价表商品）----
const goods = (
  名称: string, 行业: 行业, 品质: '白色' | '蓝色',
  材料: { 类别: MaterialCategory; 数量: number; 核心?: boolean }[],
  批量上限: number,
): 配方 =>
  配方Schema.parse({
    名称, 来源: '标准', 行业, 成品类型: '消耗品', 品质,
    材料, 技能要求: { 分类: '基础', 等级: 品质 === '白色' ? 1 : 3 }, 批量上限,
  });

export const STANDARD_GOODS_RECIPES: 配方[] = [
  goods('基础治疗药剂', '炼金', '白色', [{ 类别: '草药', 数量: 2, 核心: true }], 5),
  goods('强效治疗药剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 3, 核心: true }], 5),
  goods('基础精神药剂', '炼金', '白色', [{ 类别: '草药', 数量: 2, 核心: true }], 5),
  goods('强效精神药剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 3, 核心: true }], 5),
  goods('净化药剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 2, 核心: true }, { 类别: '矿石', 数量: 1 }], 5),
  goods('万能解毒剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 2, 核心: true }, { 类别: '怪物素材', 数量: 1 }], 5),
  goods('普通弹药20发', '工程', '白色', [{ 类别: '金属', 数量: 1, 核心: true }, { 类别: '火药', 数量: 1 }], 5),
  goods('穿甲弹药20发', '工程', '蓝色', [{ 类别: '金属', 数量: 2, 核心: true }, { 类别: '火药', 数量: 1 }], 5),
  goods('元素弹药20发', '工程', '蓝色', [{ 类别: '金属', 数量: 1, 核心: true }, { 类别: '能量', 数量: 1 }, { 类别: '火药', 数量: 1 }], 5),
  goods('战时干粮', '烹饪', '白色', [{ 类别: '食材', 数量: 2, 核心: true }], 3),
  goods('增益餐食', '烹饪', '蓝色', [{ 类别: '食材', 数量: 3, 核心: true }], 3),
  goods('制式爆炸物', '工程', '白色', [{ 类别: '火药', 数量: 2, 核心: true }, { 类别: '金属', 数量: 1 }], 3),
  goods('烈性爆炸物', '工程', '蓝色', [{ 类别: '火药', 数量: 3, 核心: true }, { 类别: '能量', 数量: 1 }], 3),
  goods('绊线陷阱', '工程', '白色', [{ 类别: '金属', 数量: 1, 核心: true }, { 类别: '布料皮革', 数量: 1 }], 3),
];

// ---- 消耗品数值基准（设计填补：世界书只给公式框架，固定值为可调初值）----
export const GOODS_BASE: Record<string, {
  类别: '恢复HP' | '恢复MP' | '状态' | '弹药' | '餐食' | '爆炸物' | '陷阱';
  固定值: number;
  关联属性: 'PER' | 'CON';
}> = {
  基础治疗药剂: { 类别: '恢复HP', 固定值: 20, 关联属性: 'PER' },
  强效治疗药剂: { 类别: '恢复HP', 固定值: 50, 关联属性: 'PER' },
  基础精神药剂: { 类别: '恢复MP', 固定值: 25, 关联属性: 'PER' },
  强效精神药剂: { 类别: '恢复MP', 固定值: 55, 关联属性: 'PER' },
  净化药剂: { 类别: '状态', 固定值: 0, 关联属性: 'PER' },
  万能解毒剂: { 类别: '状态', 固定值: 0, 关联属性: 'PER' },
  普通弹药20发: { 类别: '弹药', 固定值: 0, 关联属性: 'PER' },
  穿甲弹药20发: { 类别: '弹药', 固定值: 0, 关联属性: 'PER' },
  元素弹药20发: { 类别: '弹药', 固定值: 0, 关联属性: 'PER' },
  战时干粮: { 类别: '餐食', 固定值: 0, 关联属性: 'CON' },
  增益餐食: { 类别: '餐食', 固定值: 0, 关联属性: 'CON' },
  制式爆炸物: { 类别: '爆炸物', 固定值: 0, 关联属性: 'PER' },
  烈性爆炸物: { 类别: '爆炸物', 固定值: 0, 关联属性: 'PER' },
  绊线陷阱: { 类别: '陷阱', 固定值: 0, 关联属性: 'PER' },
};

// ================================================================
// 图纸（Blueprint）：物品命名 + 图纸物品内承载的数据
// ================================================================
export const BLUEPRINT_PREFIX = '图纸·';

export function isBlueprintName(name: string): boolean {
  return name.startsWith(BLUEPRINT_PREFIX);
}

export function blueprintItemName(配方名: string): string {
  return BLUEPRINT_PREFIX + 配方名;
}

/** 图纸物品内承载的数据（存背包 catchall 字段 + 小手机本地备份） */
export const BlueprintDataSchema = z.object({
  配方: 配方Schema,
  制作者: z.string().prefault(''),
  补全: z.boolean().prefault(false), // 是否经 AI 补全过
  版本: z.coerce.number().prefault(1),
});
export type 图纸数据 = z.infer<typeof BlueprintDataSchema>;

/** 已上传配方库的键 = 配方名 */
export type 配方库 = Record<string, 配方>;
