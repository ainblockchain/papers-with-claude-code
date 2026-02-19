import type { ParsedTileLayer, ParsedTileset } from '@/types/tmj';
import { getTileColor } from './parser';

export interface Viewport {
  offsetX: number; // world tile offset (top-left tile x)
  offsetY: number; // world tile offset (top-left tile y)
  tilesX: number; // visible tiles horizontally
  tilesY: number; // visible tiles vertically
}

export function renderTileLayer(
  ctx: CanvasRenderingContext2D,
  layer: ParsedTileLayer,
  tilesets: ParsedTileset[],
  viewport: Viewport,
  tileSize: number,
  defaultColor = '#000000',
): void {
  for (let tx = 0; tx < viewport.tilesX; tx++) {
    for (let ty = 0; ty < viewport.tilesY; ty++) {
      const worldX = viewport.offsetX + tx;
      const worldY = viewport.offsetY + ty;
      if (
        worldX < 0 ||
        worldY < 0 ||
        worldX >= layer.width ||
        worldY >= layer.height
      )
        continue;
      const gid = layer.data[worldY * layer.width + worldX];
      if (gid === 0) continue;
      const color = getTileColor(gid, tilesets) ?? defaultColor;
      ctx.fillStyle = color;
      ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
    }
  }
}

export function renderFullTileLayer(
  ctx: CanvasRenderingContext2D,
  layer: ParsedTileLayer,
  tilesets: ParsedTileset[],
  tileSize: number,
  defaultColor = '#000000',
): void {
  for (let y = 0; y < layer.height; y++) {
    for (let x = 0; x < layer.width; x++) {
      const gid = layer.data[y * layer.width + x];
      if (gid === 0) continue;
      const color = getTileColor(gid, tilesets) ?? defaultColor;
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}
