// ---------------------------------------------------------------------------
// Raw TMJ types — mirror Tiled JSON export exactly
// ---------------------------------------------------------------------------

export interface TmjProperty {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file' | 'object' | 'class';
  value: string | number | boolean;
}

export interface TmjTileDef {
  id: number;
  properties?: TmjProperty[];
  type?: string;
  image?: string;
}

export interface TmjTilesetRef {
  firstgid: number;
  source?: string;
  name?: string;
  tilewidth?: number;
  tileheight?: number;
  tilecount?: number;
  columns?: number;
  image?: string;
  imagewidth?: number;
  imageheight?: number;
  tiles?: TmjTileDef[];
  properties?: TmjProperty[];
}

export interface TmjTileLayer {
  type: 'tilelayer';
  id: number;
  name: string;
  data: number[];
  width: number;
  height: number;
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
  properties?: TmjProperty[];
}

export interface TmjObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  properties?: TmjProperty[];
  gid?: number;
  ellipse?: boolean;
  point?: boolean;
  polygon?: { x: number; y: number }[];
  polyline?: { x: number; y: number }[];
}

export interface TmjObjectGroup {
  type: 'objectgroup';
  id: number;
  name: string;
  objects: TmjObject[];
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
  draworder?: string;
  properties?: TmjProperty[];
}

export interface TmjGroupLayer {
  type: 'group';
  id: number;
  name: string;
  layers: TmjLayer[];
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
  properties?: TmjProperty[];
}

export type TmjLayer = TmjTileLayer | TmjObjectGroup | TmjGroupLayer;

export interface TmjMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  orientation: string;
  renderorder: string;
  infinite: boolean;
  layers: TmjLayer[];
  tilesets: TmjTilesetRef[];
  properties?: TmjProperty[];
  version: string | number;
  type: 'map';
}

// ---------------------------------------------------------------------------
// Parsed output types — consumed by renderer / collision
// ---------------------------------------------------------------------------

export interface ParsedTileLayer {
  name: string;
  data: number[];
  width: number;
  height: number;
  visible: boolean;
  properties: Record<string, string | number | boolean>;
}

export interface ParsedObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  widthTiles: number;
  heightTiles: number;
  properties: Record<string, string | number | boolean>;
}

export interface ParsedObjectGroup {
  name: string;
  objects: ParsedObject[];
  visible: boolean;
}

export interface ParsedTileset {
  firstGid: number;
  name: string;
  tileWidth: number;
  tileHeight: number;
  tileCount: number;
  tileColors: Map<number, string>;
  tileProperties: Map<number, Record<string, string | number | boolean>>;
}

export interface ParsedMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tileLayers: ParsedTileLayer[];
  objectGroups: ParsedObjectGroup[];
  tilesets: ParsedTileset[];
  layersByName: Map<string, ParsedTileLayer>;
  objectsByType: Map<string, ParsedObject[]>;
  spawnPoint: { x: number; y: number } | null;
}
