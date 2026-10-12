import { z } from 'zod';
import { BuildPayload } from './build';
import { PackManifest } from './manifest';

export const PersonaPayload = z.object({
  角色名: z.string().min(1),
  外观: z
    .object({
      外貌: z.string().prefault(''),
      衣着: z.string().prefault(''),
      装备幻化: z.string().prefault(''),
    })
    .prefault({}),
  性格: z.string().prefault(''),
  爱好: z.array(z.string()).prefault([]),
  厌恶: z.array(z.string()).prefault([]),
  背景故事: z.string().min(1),
  构筑方向: z.string().prefault('').describe('自由文本：粗浅写构筑思路即可'),
  构筑: BuildPayload.optional().describe('可选：粘贴一份完整构筑'),
});

export const PersonaPack = PackManifest.extend({
  type: z.literal('persona'),
  persona: PersonaPayload,
});
