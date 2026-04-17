import type { ParsedMap, ParsedObject } from '@/types/tmj';

// TMJ object `type` conventions. Keep aligned with map-generator.ts object emission.
export const TMJ_OBJECT_TYPE = {
  Spawn: 'spawn',
  Door: 'door',
  Npc: 'npc',
  Signboard: 'signboard',
  Portal: 'portal',
} as const;

export type TmjObjectType = (typeof TMJ_OBJECT_TYPE)[keyof typeof TMJ_OBJECT_TYPE];

export function findObjectByType(
  map: ParsedMap,
  type: string,
): ParsedObject | null {
  const objs = map.objectsByType.get(type);
  return objs && objs.length > 0 ? objs[0] : null;
}

export function findObjectsByType(
  map: ParsedMap,
  type: string,
): ParsedObject[] {
  return map.objectsByType.get(type) ?? [];
}
