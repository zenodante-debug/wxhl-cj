import { BuildPayload } from './build';
import { PackManifest } from './manifest';

export const CharacterPayload = BuildPayload.extend({
  外貌: z.string().min(1),
  性格: z.string().prefault(''),
  背景: z.string().min(1),
  建议类型: z
    .enum([
      '杂兵',
      '精英',
      'BOSS',
      '隐藏BOSS',
      '精英（固有角色）',
      'BOSS（固有角色）',
      '隐藏BOSS（固有角色）',
      '其他契约者',
      '小队成员',
    ])
    .prefault('其他契约者'),
});

export const CharacterPack = PackManifest.extend({
  type: z.literal('character'),
  character: CharacterPayload,
});
