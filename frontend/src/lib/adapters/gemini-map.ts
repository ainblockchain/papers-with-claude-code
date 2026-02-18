// 🔌 ADAPTER — Gemini API for dynamic map tile generation (outpainting)
// ⚠️ NEEDS_INPUT — Reference mask images needed

export interface GeminiMapAdapter {
  generateMapTile(params: {
    baseImage: string;
    maskImage: string;
    prompt: string;
    position: { x: number; y: number };
  }): Promise<string>;
}

class MockGeminiMapAdapter implements GeminiMapAdapter {
  async generateMapTile(params: {
    baseImage: string;
    maskImage: string;
    prompt: string;
    position: { x: number; y: number };
  }): Promise<string> {
    // Mock: return a procedurally determined color tile
    const colors = ['#8B7355', '#6B8E23', '#A0A0A0', '#D2B48C', '#808080'];
    const idx = (Math.abs(params.position.x) + Math.abs(params.position.y)) % colors.length;
    return colors[idx];
  }
}

export const geminiMapAdapter: GeminiMapAdapter = new MockGeminiMapAdapter();
