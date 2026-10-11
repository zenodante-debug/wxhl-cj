// 字段对照 src/wxhl-cygf/变量结构_特殊资源通用版.json（主卡权威结构，2026-10-11 复制）手写，禁自动转换。
import { PackManifest } from './manifest';

export const 技能Schema = z
  .object({
    分类: z.string().prefault('基础'),
    类型: z.string().prefault('主动'),
    行动类型: z.string().prefault('主要行动'),
    关联属性: z.string().prefault(''),
    消耗: z.string().prefault(''),
    冷却: z.string().prefault(''),
    射程: z.string().prefault(''),
    目标: z.string().prefault(''),
    阶位: z.string().prefault(''),
    属性要求: z.string().prefault(''),
    等级: z.coerce.number().prefault(1),
    效果: z.record(z.string(), z.any()).prefault({}),
  })
  .catchall(z.any())
  .prefault({});

export const 装备槽Schema = z
  .object({
    名称: z.string().prefault('无'),
    类型: z.string().prefault('无'),
    品质: z.string().prefault('无'),
    阶位: z.string().prefault('无'),
    穿戴门槛: z.string().prefault('无'),
    强化等级: z.coerce.number().prefault(0),
    伤害骰: z.string().prefault('无'),
    倍率: z.coerce.number().prefault(0),
    主属性: z.string().prefault('无'),
    副属性: z.string().prefault('无'),
    主属性加成: z.coerce.number().prefault(0),
    副属性加成: z.coerce.number().prefault(0),
    装备防御: z.coerce.number().prefault(0),
    装备闪避: z.coerce.number().prefault(0),
    负重: z.coerce.number().prefault(0),
    效果: z.record(z.string(), z.string()).prefault({}),
    描述: z.string().prefault('无'),
    数量: z.coerce.number().prefault(1),
  })
  .prefault({});

export const 装备Schema = z
  .object({
    头部: 装备槽Schema,
    躯干: 装备槽Schema,
    手部: 装备槽Schema,
    下装: 装备槽Schema,
    饰品: 装备槽Schema,
    主武器: 装备槽Schema,
    副武器: 装备槽Schema,
  })
  .prefault({});

export const 属性基础Schema = z
  .object({
    STR: z.coerce.number().prefault(5),
    AGI: z.coerce.number().prefault(5),
    CON: z.coerce.number().prefault(5),
    PER: z.coerce.number().prefault(5),
  })
  .prefault({});

export const 天赋Schema = z
  .object({
    名称: z.string().prefault('无'),
    品质: z.string().prefault('无'),
    属性加成: z.string().prefault('无'),
    效果: z.record(z.string(), z.string()).prefault({}),
  })
  .prefault({});

/** 血统与天赋同构（名称/品质/属性加成/效果） */
export const 血统Schema = 天赋Schema;

export const 称号Schema = z
  .object({
    名称: z.string().prefault('无'),
    效果: z.record(z.string(), z.string()).prefault({}),
  })
  .prefault({});

export const 职业Schema = z
  .object({
    名称: z.string().prefault('无'),
    稀有度: z.string().prefault('无'),
    职业技能: z.record(z.string(), 技能Schema).prefault({}),
    职业特性: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.any())])).prefault({}),
  })
  .catchall(z.any())
  .prefault({});

export const BuildPayload = z.object({
  构筑名: z.string().min(1),
  定位: z.string().min(1).describe('战术流派/小队定位与配置思路，对应主卡实体的构筑字段'),
  属性基础: 属性基础Schema,
  天赋: 天赋Schema,
  血统: 血统Schema,
  称号: 称号Schema,
  职业: 职业Schema,
  通用技能: z.record(z.string(), 技能Schema).prefault({}),
  装备: 装备Schema,
  背包建议: z
    .record(
      z.string(),
      z.object({ 描述: z.string().prefault(''), 数量: z.coerce.number().prefault(1) }).catchall(z.any()),
    )
    .prefault({}),
});

export const BuildPack = PackManifest.extend({
  type: z.literal('build'),
  build: BuildPayload,
});
