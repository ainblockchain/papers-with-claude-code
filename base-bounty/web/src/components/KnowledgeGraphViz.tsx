'use client';

import { useEffect, useRef, useState } from 'react';

interface GraphNode {
  id: string;
  title: string;
  topic_path: string;
  depth: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface Props {
  nodes: Record<string, any>;
  edges: Record<string, Record<string, any>>;
}

const DEPTH_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export default function KnowledgeGraphViz({ nodes, edges }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Parse nodes
    const graphNodes: GraphNode[] = Object.entries(nodes).map(([id, data]: [string, any]) => ({
      id,
      title: data.title || id,
      topic_path: data.topic_path || '',
      depth: data.depth || 1,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      vx: 0,
      vy: 0,
    }));

    // Parse edges
    const graphEdges: GraphEdge[] = [];
    for (const [sourceId, targets] of Object.entries(edges)) {
      for (const [targetId, edgeData] of Object.entries(targets as Record<string, any>)) {
        graphEdges.push({
          source: sourceId,
          target: targetId,
          type: edgeData?.type || 'related',
        });
      }
    }

    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));

    // Simple force-directed layout
    function simulate() {
      // Repulsion between all nodes
      for (let i = 0; i < graphNodes.length; i++) {
        for (let j = i + 1; j < graphNodes.length; j++) {
          const a = graphNodes[i];
          const b = graphNodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        }
      }

      // Attraction along edges
      for (const edge of graphEdges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.01;
        a.vx -= (dx / dist) * force;
        a.vy -= (dy / dist) * force;
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
      }

      // Center gravity
      for (const node of graphNodes) {
        node.vx += (dimensions.width / 2 - node.x) * 0.001;
        node.vy += (dimensions.height / 2 - node.y) * 0.001;
      }

      // Apply velocity with damping
      for (const node of graphNodes) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(20, Math.min(dimensions.width - 20, node.x));
        node.y = Math.max(20, Math.min(dimensions.height - 20, node.y));
      }
    }

    function draw() {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw edges
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1;
      for (const edge of graphEdges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of graphNodes) {
        const color = DEPTH_COLORS[(node.depth - 1) % DEPTH_COLORS.length];
        const radius = 4 + node.depth * 2;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.title.substring(0, 20), node.x, node.y + radius + 12);
      }
    }

    let frameId: number;
    let frameCount = 0;
    function animate() {
      simulate();
      draw();
      frameCount++;
      if (frameCount < 200) {
        frameId = requestAnimationFrame(animate);
      }
    }

    animate();
    return () => cancelAnimationFrame(frameId);
  }, [nodes, edges, dimensions]);

  return (
    <div className="bg-cogito-dark rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
      />
      <div className="flex gap-4 p-2 text-xs text-gray-400">
        {DEPTH_COLORS.map((color, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
            Depth {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
