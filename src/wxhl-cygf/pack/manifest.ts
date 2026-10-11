export const PackAuthor = z.object({
  name: z.string().min(1),
  discord: z.string().prefault(''),
});

export const PackManifest = z.object({
  format: z.literal('wxhl-mod@1'),
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号须为 x.y.z'),
  author: PackAuthor,
  tags: z.array(z.string()).prefault([]),
  description: z.string().prefault(''),
  requires: z.object({ cardVersion: z.string().prefault('') }).prefault({}),
});
