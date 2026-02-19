'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAinStore } from '@/stores/useAinStore';

interface NodePosition {
  x: number;
  y: number;
  title: string;
  depth: number;
  id: string;
}

const DEPTH_COLORS: Record<number, string> = {
  1: '#4ade80', // green
  2: '#60a5fa', // blue
  3: '#f59e0b', // amber
  4: '#f87171', // red
};

export function KnowledgeGraph() {
  const { graph, isLoadingGraph, fetchGraph } = useAinStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Parse nodes
    const nodes = graph.nodes || {};
    const edges = graph.edges || {};
    const nodeIds = Object.keys(nodes);

    if (nodeIds.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No graph data yet', w / 2, h / 2);
      return;
    }

    // Layout: simple force-directed approximation (circle layout by depth)
    const positions: Record<string, NodePosition> = {};
    const padding = 60;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2 - padding;

    nodeIds.forEach((id, i) => {
      const node = nodes[id];
      const angle = (2 * Math.PI * i) / nodeIds.length - Math.PI / 2;
      const depthFactor = (node.depth || 1) / 4;
      const r = radius * (0.3 + depthFactor * 0.7);
      positions[id] = {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        title: node.title || id,
        depth: node.depth || 1,
        id,
      };
    });

    // Draw edges
    ctx.lineWidth = 1;
    for (const [sourceId, targets] of Object.entries(edges)) {
      if (!targets || typeof targets !== 'object') continue;
      for (const [targetId, edge] of Object.entries(targets as Record<string, any>)) {
        const from = positions[sourceId];
        const to = positions[targetId];
        if (!from || !to) continue;

        ctx.strokeStyle = edge.type === 'extends' ? '#4ade8060' : '#60a5fa40';
        ctx.setLineDash(edge.type === 'related' ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Draw nodes
    for (const pos of Object.values(positions)) {
      const color = DEPTH_COLORS[pos.depth] || '#a78bfa';

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const label = pos.title.length > 20 ? pos.title.slice(0, 18) + '...' : pos.title;
      ctx.fillText(label, pos.x, pos.y + 18);
    }
  }, [graph]);

  useEffect(() => {
    drawGraph();
    const handleResize = () => drawGraph();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGraph]);

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Network className="h-4 w-4 text-purple-400" />
          Knowledge Graph
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchGraph}
          disabled={isLoadingGraph}
          className="h-7 px-2 text-gray-500 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingGraph ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg bg-[#0f0f23] border border-gray-800 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: 320 }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(DEPTH_COLORS).map(([depth, color]) => (
            <div key={depth} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">Depth {depth}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-green-400/40" />
            <span className="text-xs text-gray-500">extends</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-blue-400/40" />
            <span className="text-xs text-gray-500">related</span>
          </div>
        </div>

        {graph && (
          <p className="text-xs text-gray-600 mt-2">
            {Object.keys(graph.nodes || {}).length} nodes,{' '}
            {Object.values(graph.edges || {}).reduce(
              (sum: number, e: any) => sum + Object.keys(e || {}).length, 0
            )} edges
          </p>
        )}
      </CardContent>
    </Card>
  );
}
