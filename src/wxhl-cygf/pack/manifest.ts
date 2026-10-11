import { z } from 'zod';

export const PackAuthor = z.object({
  name: z.string().min(1),
  discord: z.string().prefault(''),
});

/** 五个并列分类——与页面顶部导航一一对应 */
export const PackType = z.enum(['dungeon', 'event', 'mechanism', 'build', 'persona']);
export const PACK_TYPE_LABEL: Record<z.infer<typeof PackType>, string> = {
  dungeon: '副本',
  event: '事件',
  mechanism: '机制拓展',
  build: '构筑',
  persona: '人设',
};

/** 封面：空串可以；非空必须是干净的 http(s) 链接（挡 `" onerror=…` 这类属性逃逸） */
const CoverUrl = z.union([
  z.literal(''),
  z.string().regex(/^https?:\/\/[^\s"'<>\\]+$/, '封面须是 http(s) 图片链接，且不含空白/引号/尖括号'),
]);

export const PackManifest = z.object({
  format: z.literal('wxhl-mod@2'),
  id: z.string().min(1),
  name: z.string().min(1),
  type: PackType,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号须为 x.y.z'),
  author: PackAuthor,
  tags: z.array(z.string()).prefault([]),
  description: z.string().min(1, '需要一句话简介（列表卡片要显示）'),
  cover: CoverUrl.prefault(''),
  requires: z.object({ cardVersion: z.string().prefault('') }).prefault({}),
});
