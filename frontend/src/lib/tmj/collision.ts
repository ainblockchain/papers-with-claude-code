import type { ParsedTileLayer } from '@/types/tmj';

export class CollisionGrid {
  private grid: boolean[];
  private width: number;
  private height: number;

  constructor(width: number, height: number, defaultWalkable = true) {
    this.width = width;
    this.height = height;
    this.grid = new Array(width * height).fill(defaultWalkable);
  }

  static fromTileLayer(layer: ParsedTileLayer): CollisionGrid {
    const grid = new CollisionGrid(layer.width, layer.height);
    for (let i = 0; i < layer.data.length; i++) {
      if (layer.data[i] !== 0) {
        grid.grid[i] = false; // non-zero GID = blocked
      }
    }
    return grid;
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.grid[y * this.width + x];
  }

  setWalkable(x: number, y: number, walkable: boolean): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.grid[y * this.width + x] = walkable;
  }
}
