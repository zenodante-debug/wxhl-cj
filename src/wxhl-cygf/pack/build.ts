import { z } from 'zod';
import { PackManifest } from './manifest';

// —— 以下三个子 schema 与一期一致（对齐主卡 变量结构_特殊资源通用版.json），不改 ——
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
    主武器: 装备槽Schema,
    副武器: 装备槽Schema,
    头部: 装备槽Schema,
    躯干: 装备槽Schema,
    手部: 装备槽Schema,
    下装: 装备槽Schema,
    饰品: 装备槽Schema,
  })
  .prefault({});

const 头部组件Schema = z
  .object({
    名称: z.string().prefault('无'),
    品质: z.string().prefault('无'),
    属性加成: z.string().prefault('无'),
    效果: z.record(z.string(), z.string()).prefault({}),
  })
  .prefault({});

// ==================== 转职树（递归，字段名对齐主卡 变量结构_特殊资源通用版.json） ====================
// 主卡用工厂函数组装固定四层；这里改成 z.lazy 的自引用递归——层数不设硬上限，
// 编辑器与本体都不会主动造超过 ~6 层的树（够用且防深嵌套把 zod 解析栈撑爆）。
const 转职详情Schema = z
  .object({
    详细内容: z.string().prefault('无'),
    效果: z.string().prefault('无'),
    主属性加成: z.object({ 属性: z.string().prefault('无'), 值: z.coerce.number().prefault(0) }).prefault({}),
    副属性加成: z.object({ 属性: z.string().prefault('无'), 值: z.coerce.number().prefault(0) }).prefault({}),
    职业特性: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.any())])).prefault({}),
    职业技能: z.record(z.string(), 技能Schema).prefault({}),
  })
  .prefault({});

const 转职节点状态Schema = z
  .union([z.enum(['未解锁', '未选择', '当前', '已完成', '跳过', '已放弃']), z.string()])
  .prefault('未选择');

/** 单个转职节点：状态 / 详情 / 分支（每个分支名下再递归一个同名节点）——全部可空 */
const 转职节点Schema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      状态: 转职节点状态Schema,
      详情: 转职详情Schema,
      分支: z.record(z.string(), 转职节点Schema).prefault({}),
    })
    .prefault({}),
);

/** 转职树：名称 / 状态 / 分支（分支名 → 节点，节点内可继续递归子分支） */
export const 转职树Schema = z
  .object({
    名称: z.string().prefault('无'),
    状态: 转职节点状态Schema,
    分支: z.record(z.string(), 转职节点Schema).prefault({}),
  })
  .prefault({});

/** 方向：数值已回填，方向仍保留作提示（老包不带方向也能解析，见 老包不炸 测试） */
export const 属性方向Schema = z
  .object({
    主属性: z.enum(['STR', 'AGI', 'CON', 'PER']).prefault('STR'),
    副属性: z.enum(['STR', 'AGI', 'CON', 'PER', '无']).prefault('无'),
  })
  .prefault({});

export const 职业Schema = z
  .object({
    名称: z.string().prefault('无'),
    稀有度: z.string().prefault('无'),
    转职阶段: z.string().prefault('基础'),
    职业等级: z.coerce.number().prefault(0),
    PEXP_当前: z.coerce.number().prefault(0),
    PEXP_升级所需: z.coerce.number().prefault(0),
    主属性加成: z.object({ 属性: z.string().prefault('无'), 值: z.coerce.number().prefault(0) }).prefault({}),
    副属性加成: z.object({ 属性: z.string().prefault('无'), 值: z.coerce.number().prefault(0) }).prefault({}),
    职业简介: z.string().prefault('无').describe('职业的简短介绍、机制方向与发展定位'),
    职业技能: z.record(z.string(), 技能Schema).prefault({}),
    职业特性: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.any())])).prefault({}),
    传承技能: z.record(z.string(), 技能Schema).prefault({}),
    转职树: 转职树Schema,
  })
  .catchall(z.any())
  .prefault({});

export const BuildPayload = z.object({
  构筑名: z.string().min(1),
  定位: z.string().min(1).describe('战术流派/小队定位一句话'),
  等级: z.coerce.number().int().min(1).prefault(1),
  阶位: z.string().prefault('一阶'),
  属性基础: z
    .object({
      STR: z.coerce.number().prefault(5),
      AGI: z.coerce.number().prefault(5),
      CON: z.coerce.number().prefault(5),
      PER: z.coerce.number().prefault(5),
    })
    .prefault({}),
  属性分配方向: 属性方向Schema,
  天赋: 头部组件Schema,
  血统: 头部组件Schema,
  称号: z.object({ 名称: z.string().prefault('无'), 效果: z.record(z.string(), z.string()).prefault({}) }).prefault({}),
  职业: 职业Schema,
  通用技能: z.record(z.string(), 技能Schema).prefault({}),
  主要装备: 装备Schema,
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
