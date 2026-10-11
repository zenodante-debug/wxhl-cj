import { z } from 'zod';
import { BuildPack } from './build';
import { DungeonPack } from './dungeon';
import { EventPack } from './event';
import { MechanismPack } from './mechanism';
import { PersonaPack } from './persona';

export { PackManifest, PackType, PACK_TYPE_LABEL, PackAuthor } from './manifest';
export { EntrySchema } from './entries';
export { MechanismPack } from './mechanism';
export { EventPack, ControllerSchema } from './event';
export { DungeonPack } from './dungeon';
export { BuildPack, BuildPayload, 技能Schema, 装备槽Schema, 装备Schema } from './build';
export { PersonaPack, PersonaPayload } from './persona';

export const ContentPack = z.discriminatedUnion('type', [DungeonPack, EventPack, MechanismPack, BuildPack, PersonaPack]);
