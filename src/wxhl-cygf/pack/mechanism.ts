import { z } from 'zod';
import { EntrySchema } from './entries';
import { PackManifest } from './manifest';

export const MechanismPack = PackManifest.extend({
  type: z.literal('mechanism'),
  条目: z.array(EntrySchema).min(1, '机制拓展至少要有一条世界书条目'),
});
