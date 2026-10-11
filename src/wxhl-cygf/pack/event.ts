import { z } from 'zod';
import { EntrySchema } from './entries';
import { PackManifest } from './manifest';

export const ControllerSchema = z.object({
  名称: z.string().regex(/^EJS\//, '控制器条目名必须以 EJS/ 开头'),
  正文: z.string().min(1).describe('EJS 模板正文，用 getwi(\'事件_…\') 挑事件'),
});

export const EventPack = PackManifest.extend({
  type: z.literal('event'),
  事件条目: z
    .array(EntrySchema)
    .min(1, '事件包至少要有一条事件条目')
    .refine(entries => entries.every(e => e.name.startsWith('事件_')), {
      message: '事件条目名必须以 事件_ 开头（推荐 事件_<包名>_<事件名>，避免与其他包撞名）',
    }),
  控制器条目: ControllerSchema.optional(),
});
