'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

interface SimNode {
  id: string;
  title: string;
  topic_path: string;
  depth: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface InputNode {
  id: string;
  title: string;
  topic_path: string;
  depth: number;
}

interface InputEdge {
  source: string;
  target: string;
  type: string;
}

interface Props {
  nodes: InputNode[];
  edges: InputEdge[];
}

const DEPTH_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export default function KnowledgeGraphViz({ nodes, edges }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const graphNodesRef = useRef<SimNode[]>([]);

  // Responsive sizing via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width, height: Math.max(400, Math.min(width * 0.6, 700)) });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Find node at canvas coordinates
  const findNodeAt = useCallback((canvasX: number, canvasY: number): SimNode | null => {
    const graphNodes = graphNodesRef.current;
    for (let i = graphNodes.length - 1; i >= 0; i--) {
      const node = graphNodes[i];
      const radius = 4 + node.depth * 2;
      const dx = canvasX - node.x;
      const dy = canvasY - node.y;
      if (dx * dx + dy * dy <= (radius + 4) * (radius + 4)) {
        return node;
      }
    }
    return null;
  }, []);

  // Canvas click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * (canvas!.width / (rect.width * dpr));
      const y = (e.clientY - rect.top) * (canvas!.height / (rect.height * dpr));
      const scaledX = x * dpr;
      const scaledY = y * dpr;
      const hit = findNodeAt(scaledX, scaledY);
      setSelectedNode(hit);
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * (canvas!.width / (rect.width * dpr));
      const y = (e.clientY - rect.top) * (canvas!.height / (rect.height * dpr));
      const scaledX = x * dpr;
      const scaledY = y * dpr;
      const hit = findNodeAt(scaledX, scaledY);
      canvas!.style.cursor = hit ? 'pointer' : 'default';
    }

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [findNodeAt]);

  // Simulation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = dimensions.width;
    const h = dimensions.height;

    const graphNodes: SimNode[] = nodes.map((data) => ({
      id: data.id,
      title: data.title || data.id,
      topic_path: data.topic_path || '',
      depth: data.depth || 1,
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
    }));

    graphNodesRef.current = graphNodes;
    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));

    function simulate() {
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

      for (const edge of edges) {
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

      for (const node of graphNodes) {
        node.vx += (w / 2 - node.x) * 0.001;
        node.vy += (h / 2 - node.y) * 0.001;
      }

      for (const node of graphNodes) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(20, Math.min(w - 20, node.x));
        node.y = Math.max(20, Math.min(h - 20, node.y));
      }
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1;
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const node of graphNodes) {
        const color = DEPTH_COLORS[(node.depth - 1) % DEPTH_COLORS.length];
        const radius = 4 + node.depth * 2;
        const isSelected = selectedNode?.id === node.id;

        // Highlight ring for selected node
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

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
  }, [nodes, edges, dimensions, selectedNode]);

  return (
    <div ref={containerRef} className="bg-cogito-dark rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="w-full"
      />

      {/* Detail Panel */}
      {selectedNode && (
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">{selectedNode.title}</h3>
              <p className="text-xs text-gray-400 mt-1">
                <span className="text-cogito-blue">{selectedNode.topic_path}</span>
                <span className="ml-2">depth {selectedNode.depth}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/content/${selectedNode.topic_path}`}
                className="text-xs text-cogito-blue hover:underline"
              >
                View content
              </Link>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-gray-500 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
