import { z } from 'zod';
import { EntrySchema } from './entries';
import { PackManifest } from './manifest';

const 任务Schema = z.object({ 名称: z.string().min(1), 说明: z.string().min(1), 奖励: z.string().prefault('') });
const 成就Schema = z.object({
  名称: z.string().min(1),
  说明: z.string().min(1),
  难度: z.string().prefault(''),
  奖励: z.string().prefault(''),
});

export const DungeonPack = PackManifest.extend({
  type: z.literal('dungeon'),
  副本名称: z.string().min(1),
  副本类型: z.enum(['和平', '阵营', '血腥']),
  基准等级: z.coerce.number().int().min(1).prefault(1),
  时间限制: z.string().prefault('未指定'),
  背景设定: z.string().min(1),
  地图与区域: z.string().min(1),
  敌人配置: z.string().min(1),
  主线任务: 任务Schema,
  支线任务: z.array(任务Schema).prefault([]),
  世界事件: z.array(任务Schema).prefault([]),
  隐藏任务: z.array(任务Schema).prefault([]),
  成就: z.array(成就Schema).prefault([]),
  GM指导: z.string().min(1, 'GM 指导不能为空（主持话术与判定口径）'),
  额外条目: z.array(EntrySchema).prefault([]),
});
