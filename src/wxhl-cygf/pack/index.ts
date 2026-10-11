import { z } from 'zod';
import { BuildPack } from './build';
import { CharacterPack } from './character';
import { ExtensionPack } from './extension';

export { PackManifest } from './manifest';
export { ExtensionEntry, ExtensionPack } from './extension';
export { BuildPack, BuildPayload } from './build';
export { CharacterPack, CharacterPayload } from './character';

export const ContentPack = z.discriminatedUnion('type', [ExtensionPack, BuildPack, CharacterPack]);
