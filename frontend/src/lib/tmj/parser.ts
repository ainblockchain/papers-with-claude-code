import type {
  TmjMap,
  TmjLayer,
  TmjTileLayer,
  TmjObjectGroup,
  TmjGroupLayer,
  TmjTilesetRef,
  TmjProperty,
  ParsedMap,
  ParsedTileLayer,
  ParsedObjectGroup,
  ParsedObject,
  ParsedTileset,
} from '@/types/tmj';

function propertiesToRecord(
  props?: TmjProperty[],
): Record<string, string | number | boolean> {
  if (!props) return {};
  const rec: Record<string, string | number | boolean> = {};
  for (const p of props) {
    rec[p.name] = p.value;
  }
  return rec;
}

function flattenLayers(layers: TmjLayer[]): TmjLayer[] {
  const result: TmjLayer[] = [];
  for (const layer of layers) {
    if (layer.type === 'group') {
      result.push(...flattenLayers((layer as TmjGroupLayer).layers));
    } else {
      result.push(layer);
    }
  }
  return result;
}

function buildTilesets(rawTilesets: TmjTilesetRef[]): ParsedTileset[] {
  return rawTilesets.map((ts) => {
    const tileColors = new Map<number, string>();
    const tileProperties = new Map<
      number,
      Record<string, string | number | boolean>
    >();

    if (ts.tiles) {
      for (const tile of ts.tiles) {
        const gid = ts.firstgid + tile.id;
        const props = propertiesToRecord(tile.properties);
        tileProperties.set(gid, props);
        if (typeof props.color === 'string') {
          tileColors.set(gid, props.color);
        }
      }
    }

    return {
      firstGid: ts.firstgid,
      name: ts.name ?? '',
      tileWidth: ts.tilewidth ?? 0,
      tileHeight: ts.tileheight ?? 0,
      tileCount: ts.tilecount ?? 0,
      tileColors,
      tileProperties,
    };
  });
}

export function parseTmjMap(raw: TmjMap): ParsedMap {
  const flat = flattenLayers(raw.layers);

  const tileLayers: ParsedTileLayer[] = [];
  const objectGroups: ParsedObjectGroup[] = [];

  for (const layer of flat) {
    if (layer.type === 'tilelayer') {
      const tl = layer as TmjTileLayer;
      tileLayers.push({
        name: tl.name,
        data: tl.data,
        width: tl.width,
        height: tl.height,
        visible: tl.visible,
        properties: propertiesToRecord(tl.properties),
      });
    } else if (layer.type === 'objectgroup') {
      const og = layer as TmjObjectGroup;
      const objects: ParsedObject[] = og.objects.map((obj) => ({
        id: obj.id,
        name: obj.name,
        type: obj.type,
        x: Math.floor(obj.x / raw.tilewidth),
        y: Math.floor(obj.y / raw.tileheight),
        widthTiles: Math.floor(obj.width / raw.tilewidth),
        heightTiles: Math.floor(obj.height / raw.tileheight),
        properties: propertiesToRecord(obj.properties),
      }));
      objectGroups.push({
        name: og.name,
        objects,
        visible: og.visible,
      });
    }
  }

  const tilesets = buildTilesets(raw.tilesets);

  const layersByName = new Map<string, ParsedTileLayer>();
  for (const tl of tileLayers) {
    layersByName.set(tl.name, tl);
  }

  const objectsByType = new Map<string, ParsedObject[]>();
  for (const og of objectGroups) {
    for (const obj of og.objects) {
      if (!objectsByType.has(obj.type)) {
        objectsByType.set(obj.type, []);
      }
      objectsByType.get(obj.type)!.push(obj);
    }
  }

  let spawnPoint: { x: number; y: number } | null = null;
  const spawns = objectsByType.get('spawn');
  if (spawns && spawns.length > 0) {
    spawnPoint = { x: spawns[0].x, y: spawns[0].y };
  }

  return {
    width: raw.width,
    height: raw.height,
    tileWidth: raw.tilewidth,
    tileHeight: raw.tileheight,
    tileLayers,
    objectGroups,
    tilesets,
    layersByName,
    objectsByType,
    spawnPoint,
  };
}

export function getTileColor(
  gid: number,
  tilesets: ParsedTileset[],
): string | null {
  for (const ts of tilesets) {
    if (gid >= ts.firstGid && gid < ts.firstGid + ts.tileCount) {
      return ts.tileColors.get(gid) ?? null;
    }
  }
  return null;
}
