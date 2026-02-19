// 🔌 ADAPTER — Replace LocalMapLoader with BackendMapLoader when API is ready
import type { TmjMap } from '@/types/tmj';

export interface MapLoaderAdapter {
  loadMap(mapId: string): Promise<TmjMap | null>;
}

class LocalMapLoader implements MapLoaderAdapter {
  private cache = new Map<string, TmjMap>();

  async loadMap(mapId: string): Promise<TmjMap | null> {
    if (this.cache.has(mapId)) return this.cache.get(mapId)!;
    try {
      const response = await fetch(`/maps/${mapId}.tmj`);
      if (!response.ok) return null;
      const data: TmjMap = await response.json();
      this.cache.set(mapId, data);
      return data;
    } catch {
      console.warn(`[MapLoader] Failed to load map: ${mapId}`);
      return null;
    }
  }
}

// Future: BackendMapLoader that fetches from API endpoint
// class BackendMapLoader implements MapLoaderAdapter {
//   constructor(private baseUrl: string) {}
//   async loadMap(mapId: string): Promise<TmjMap | null> {
//     const response = await fetch(`${this.baseUrl}/api/maps/${mapId}`);
//     if (!response.ok) return null;
//     return response.json();
//   }
// }

export const mapLoaderAdapter: MapLoaderAdapter = new LocalMapLoader();
