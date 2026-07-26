import { defineMvuDataStore } from '@util/mvu';

export const Schema = z.object({
  契约者: z.object({
    头部: z.object({
      姓名: z.string().prefault('未命名'),
      等级: z.coerce.number().prefault(1),
    }).prefault({}),
    衍生属性: z.object({
      HP_最大: z.coerce.number().prefault(100),
      HP_当前: z.coerce.number().prefault(100),
      MP_最大: z.coerce.number().prefault(100),
      MP_当前: z.coerce.number().prefault(100),
      耐力_最大: z.coerce.number().prefault(100),
      耐力_当前: z.coerce.number().prefault(100),
    }).prefault({}),
    状态: z.object({
      生命状态: z.string().prefault('健康'),
    }).prefault({}),
  }).prefault({}),
});

export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId(),
});
