import { z } from 'zod';
import { PackManifest } from './manifest';

export const ExtensionEntry = z
  .object({
    name: z.string().min(1).describe('条目名'),
    content: z.string().min(1).describe('条目正文'),
    enabled: z.boolean().prefault(true),
    constant: z.boolean().prefault(false).describe('true=蓝灯常驻；false=绿灯按关键词激活'),
    keys: z.array(z.string().min(1)).prefault([]).describe('绿灯主关键词'),
    keysSecondary: z.array(z.string().min(1)).prefault([]),
    position: z.enum(['before_char', 'after_char', 'at_depth']).prefault('after_char'),
    depth: z.coerce.number().int().min(0).prefault(0),
    order: z.coerce.number().int().prefault(100),
    probability: z.coerce.number().min(0).max(100).prefault(100),
    sticky: z.coerce.number().int().min(0).nullable().prefault(null),
    cooldown: z.coerce.number().int().min(0).nullable().prefault(null),
    delay: z.coerce.number().int().min(0).nullable().prefault(null),
    preventRecursion: z.boolean().prefault(false),
    excludeRecursion: z.boolean().prefault(false),
  })
  .refine(entry => entry.constant || entry.keys.length > 0, {
    message: '绿灯条目至少需要一个主关键词（或设 constant: true 为蓝灯）',
  });

export const ExtensionPack = PackManifest.extend({
  type: z.literal('extension'),
  worldbookEntries: z.array(ExtensionEntry).min(1, '内容包至少要有一条世界书条目'),
});
