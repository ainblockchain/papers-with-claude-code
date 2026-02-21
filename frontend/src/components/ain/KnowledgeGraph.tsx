'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAinStore } from '@/stores/useAinStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { papersAdapter } from '@/lib/adapters/papers';

/* ───────── Types ───────── */

interface SimNode {
  id: string;
  title: string;
  depth: number;
  topicPath: string;
  cluster: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
}

interface SimEdge {
  source: string;
  target: string;
  type: 'extends' | 'related' | 'prerequisite';
}

interface ClusterInfo {
  id: string;
  cx: number;
  cy: number;
  color: string;
  label: string;
  nodeCount: number;
}

/* ───────── Constants ───────── */

const DEPTH_COLORS: Record<number, string> = {
  1: '#4ade80',
  2: '#60a5fa',
  3: '#f59e0b',
  4: '#f87171',
  5: '#a78bfa',
};

const EDGE_COLORS: Record<string, string> = {
  extends: '#4ade80',
  related: '#60a5fa',
  prerequisite: '#f59e0b',
};

const CLUSTER_COLORS = [
  '#4ade80', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa',
  '#34d399', '#38bdf8', '#fb923c', '#e879f9', '#22d3ee',
  '#a3e635', '#f472b6', '#818cf8', '#fbbf24', '#2dd4bf',
];

const SIM = {
  repulsion: 8000,
  attraction: 0.005,
  centerGravity: 0.005,
  clusterGravity: 0.03,
  damping: 0.9,
  minVelocity: 0.01,
  maxVelocity: 12,
};

/* ───────── Component ───────── */

export function KnowledgeGraph() {
  const router = useRouter();
  const { graph, isLoadingGraph, fetchGraph } = useAinStore();
  const { setPurchaseModal, getAccessStatus } = usePurchaseStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const clustersRef = useRef<ClusterInfo[]>([]);

  // Camera state
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });

  // Interaction state
  const dragRef = useRef<{
    type: 'none' | 'pan' | 'node';
    nodeIdx: number;
    startX: number;
    startY: number;
    startCamX: number;
    startCamY: number;
    dragDist: number;
  }>({ type: 'none', nodeIdx: -1, startX: 0, startY: 0, startCamX: 0, startCamY: 0, dragDist: 0 });

  const hoverRef = useRef<number>(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clickFeedback, setClickFeedback] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Build simulation nodes/edges when graph data changes
  useEffect(() => {
    if (!graph) return;
    const rawNodes = graph.nodes || {};
    const rawEdges = graph.edges || {};
    const ids = Object.keys(rawNodes);

    // Extract clusters from topic_path
    const clusterMap = new Map<string, string[]>();
    for (const id of ids) {
      const n = rawNodes[id];
      const topicPath = n.topic_path || '';
      const cluster = topicPath.split('/')[0] || 'other';
      if (!clusterMap.has(cluster)) clusterMap.set(cluster, []);
      clusterMap.get(cluster)!.push(id);
    }

    // Compute cluster centers in a large circle
    const clusterIds = Array.from(clusterMap.keys());
    const clusterCount = clusterIds.length;
    const clusterRadius = Math.max(300, clusterCount * 60);
    const clusters: ClusterInfo[] = clusterIds.map((cid, i) => {
      const angle = (2 * Math.PI * i) / clusterCount;
      return {
        id: cid,
        cx: Math.cos(angle) * clusterRadius,
        cy: Math.sin(angle) * clusterRadius,
        color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
        label: cid,
        nodeCount: clusterMap.get(cid)!.length,
      };
    });
    clustersRef.current = clusters;

    const clusterCenterMap = new Map<string, { cx: number; cy: number }>();
    for (const c of clusters) {
      clusterCenterMap.set(c.id, { cx: c.cx, cy: c.cy });
    }

    // Place nodes near their cluster center with noise
    const nodes: SimNode[] = ids.map((id) => {
      const n = rawNodes[id];
      const topicPath = n.topic_path || '';
      const cluster = topicPath.split('/')[0] || 'other';
      const center = clusterCenterMap.get(cluster) || { cx: 0, cy: 0 };
      const noise = 60 + Math.random() * 100;
      const angle = Math.random() * 2 * Math.PI;
      return {
        id,
        title: n.title || id,
        depth: n.depth || 1,
        topicPath,
        cluster,
        x: center.cx + Math.cos(angle) * noise,
        y: center.cy + Math.sin(angle) * noise,
        vx: 0,
        vy: 0,
        radius: 6 + (n.depth || 1) * 2,
        pinned: false,
      };
    });

    const edges: SimEdge[] = [];
    for (const [sourceId, targets] of Object.entries(rawEdges)) {
      if (!targets || typeof targets !== 'object') continue;
      for (const [targetId, edge] of Object.entries(targets as Record<string, any>)) {
        edges.push({
          source: sourceId,
          target: targetId,
          type: edge.type || 'related',
        });
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Reset camera with zoom out for large graphs
    const autoZoom = ids.length > 50 ? 0.5 : ids.length > 20 ? 0.7 : 1;
    camRef.current = { x: 0, y: 0, zoom: autoZoom };
  }, [graph]);

  // Screen → world coordinate transforms
  const screenToWorld = useCallback((sx: number, sy: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const cam = camRef.current;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: (sx - cx) / cam.zoom + cam.x,
      y: (sy - cy) / cam.zoom + cam.y,
    };
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number, cw: number, ch: number) => {
    const cam = camRef.current;
    return {
      x: (wx - cam.x) * cam.zoom + cw / 2,
      y: (wy - cam.y) * cam.zoom + ch / 2,
    };
  }, []);

  // Find node at screen position
  const hitTest = useCallback((sx: number, sy: number, canvas: HTMLCanvasElement) => {
    const w = screenToWorld(sx, sy, canvas);
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = w.x - n.x;
      const dy = w.y - n.y;
      if (dx * dx + dy * dy < (n.radius + 4) * (n.radius + 4)) return i;
    }
    return -1;
  }, [screenToWorld]);

  // Handle node click → navigate to course or show purchase modal
  const handleNodeClick = useCallback(async (node: SimNode) => {
    const topicName = node.topicPath.split('/').pop() || node.title;
    try {
      const papers = await papersAdapter.searchPapers(topicName);
      if (papers.length > 0) {
        const paper = papers[0];
        const access = getAccessStatus(paper.id);
        if (access === 'available') {
          setPurchaseModal(paper.id, paper);
        } else {
          router.push(`/learn/${paper.id}`);
        }
      } else {
        // Try searching by node title
        const byTitle = await papersAdapter.searchPapers(node.title);
        if (byTitle.length > 0) {
          const paper = byTitle[0];
          const access = getAccessStatus(paper.id);
          if (access === 'available') {
            setPurchaseModal(paper.id, paper);
          } else {
            router.push(`/learn/${paper.id}`);
          }
        } else {
          setClickFeedback({ x: node.x, y: node.y, text: 'No course available' });
          setTimeout(() => setClickFeedback(null), 2000);
        }
      }
    } catch {
      setClickFeedback({ x: node.x, y: node.y, text: 'Search failed' });
      setTimeout(() => setClickFeedback(null), 2000);
    }
  }, [router, getAccessStatus, setPurchaseModal]);

  // ── Mouse handlers ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const hit = hitTest(sx, sy, canvas);

      if (hit >= 0) {
        dragRef.current = {
          type: 'node',
          nodeIdx: hit,
          startX: sx,
          startY: sy,
          startCamX: nodesRef.current[hit].x,
          startCamY: nodesRef.current[hit].y,
          dragDist: 0,
        };
        nodesRef.current[hit].pinned = true;
        canvas.style.cursor = 'grabbing';
      } else {
        dragRef.current = {
          type: 'pan',
          nodeIdx: -1,
          startX: sx,
          startY: sy,
          startCamX: camRef.current.x,
          startCamY: camRef.current.y,
          dragDist: 0,
        };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const drag = dragRef.current;

      // Track drag distance
      const ddx = sx - drag.startX;
      const ddy = sy - drag.startY;
      drag.dragDist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (drag.type === 'pan') {
        const dx = (sx - drag.startX) / camRef.current.zoom;
        const dy = (sy - drag.startY) / camRef.current.zoom;
        camRef.current.x = drag.startCamX - dx;
        camRef.current.y = drag.startCamY - dy;
      } else if (drag.type === 'node') {
        const w = screenToWorld(sx, sy, canvas);
        nodesRef.current[drag.nodeIdx].x = w.x;
        nodesRef.current[drag.nodeIdx].y = w.y;
        nodesRef.current[drag.nodeIdx].vx = 0;
        nodesRef.current[drag.nodeIdx].vy = 0;
      } else {
        // Hover detection
        const hit = hitTest(sx, sy, canvas);
        hoverRef.current = hit;
        canvas.style.cursor = hit >= 0 ? 'pointer' : 'grab';
      }
    };

    const onMouseUp = () => {
      const drag = dragRef.current;
      if (drag.type === 'node' && drag.nodeIdx >= 0) {
        nodesRef.current[drag.nodeIdx].pinned = false;
        // Click detection: minimal drag distance
        if (drag.dragDist < 5) {
          handleNodeClick(nodesRef.current[drag.nodeIdx]);
        }
      }
      dragRef.current = { type: 'none', nodeIdx: -1, startX: 0, startY: 0, startCamX: 0, startCamY: 0, dragDist: 0 };
      canvas.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // World point under cursor before zoom
      const before = screenToWorld(sx, sy, canvas);

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      camRef.current.zoom = Math.max(0.1, Math.min(5, camRef.current.zoom * factor));

      // World point under cursor after zoom — adjust cam so it stays fixed
      const after = screenToWorld(sx, sy, canvas);
      camRef.current.x += before.x - after.x;
      camRef.current.y += before.y - after.y;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [hitTest, screenToWorld, handleNodeClick]);

  // ── Animation loop: physics + render ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const clusters = clustersRef.current;

      // Build cluster center map for physics
      const clusterCenters = new Map<string, { cx: number; cy: number }>();
      for (const c of clusters) {
        clusterCenters.set(c.id, { cx: c.cx, cy: c.cy });
      }

      // ── Physics step ──
      if (nodes.length > 0) {
        const nodeMap = new Map<string, number>();
        nodes.forEach((n, i) => nodeMap.set(n.id, i));

        // Repulsion (all pairs)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = SIM.repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
            if (!b.pinned) { b.vx += fx; b.vy += fy; }
          }
        }

        // Attraction (edges)
        for (const edge of edges) {
          const si = nodeMap.get(edge.source);
          const ti = nodeMap.get(edge.target);
          if (si === undefined || ti === undefined) continue;
          const a = nodes[si];
          const b = nodes[ti];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * SIM.attraction;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (!a.pinned) { a.vx += fx; a.vy += fy; }
          if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
        }

        // Center gravity + Cluster gravity + velocity update
        for (const n of nodes) {
          if (n.pinned) continue;

          // Weak center gravity
          n.vx -= n.x * SIM.centerGravity;
          n.vy -= n.y * SIM.centerGravity;

          // Cluster gravity — pull toward cluster center
          const cc = clusterCenters.get(n.cluster);
          if (cc) {
            n.vx += (cc.cx - n.x) * SIM.clusterGravity;
            n.vy += (cc.cy - n.y) * SIM.clusterGravity;
          }

          n.vx *= SIM.damping;
          n.vy *= SIM.damping;

          // Clamp velocity
          const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
          if (speed > SIM.maxVelocity) {
            n.vx = (n.vx / speed) * SIM.maxVelocity;
            n.vy = (n.vy / speed) * SIM.maxVelocity;
          }
          if (speed < SIM.minVelocity) { n.vx = 0; n.vy = 0; }

          n.x += n.vx;
          n.y += n.vy;
        }

        // Update dynamic cluster centers based on actual node positions
        const clusterSums = new Map<string, { sx: number; sy: number; count: number }>();
        for (const n of nodes) {
          const s = clusterSums.get(n.cluster) || { sx: 0, sy: 0, count: 0 };
          s.sx += n.x;
          s.sy += n.y;
          s.count += 1;
          clusterSums.set(n.cluster, s);
        }
        for (const c of clusters) {
          const s = clusterSums.get(c.id);
          if (s && s.count > 0) {
            c.cx = s.sx / s.count;
            c.cy = s.sy / s.count;
          }
        }
      }

      // ── Render ──
      ctx.fillStyle = '#0f0f23';
      ctx.fillRect(0, 0, cw, ch);

      // Subtle grid
      const cam = camRef.current;
      const gridSize = 50 * cam.zoom;
      if (gridSize > 10) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const ox = (cw / 2 - cam.x * cam.zoom) % gridSize;
        const oy = (ch / 2 - cam.y * cam.zoom) % gridSize;
        for (let gx = ox; gx < cw; gx += gridSize) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke();
        }
        for (let gy = oy; gy < ch; gy += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
        }
      }

      if (nodes.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isLoadingGraph ? 'Loading graph...' : 'No graph data yet', cw / 2, ch / 2);
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      const nodeMap = new Map<string, SimNode>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      // Draw cluster halos
      for (const cluster of clusters) {
        if (cluster.nodeCount < 2) continue;
        const s = worldToScreen(cluster.cx, cluster.cy, cw, ch);

        // Compute cluster radius based on max distance of nodes from center
        let maxDist = 0;
        for (const n of nodes) {
          if (n.cluster !== cluster.id) continue;
          const ns = worldToScreen(n.x, n.y, cw, ch);
          const dx = ns.x - s.x;
          const dy = ns.y - s.y;
          maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
        }
        const haloRadius = maxDist + 30 * cam.zoom;

        // Draw soft halo
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloRadius);
        grad.addColorStop(0, cluster.color + '08');
        grad.addColorStop(0.7, cluster.color + '05');
        grad.addColorStop(1, cluster.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cluster label
        const fontSize = Math.max(9, Math.min(14, 11 * cam.zoom));
        ctx.fillStyle = cluster.color + '60';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(cluster.label, s.x, s.y - haloRadius + fontSize + 4);
      }

      // Draw edges
      for (const edge of edges) {
        const sn = nodeMap.get(edge.source);
        const tn = nodeMap.get(edge.target);
        if (!sn || !tn) continue;

        const from = worldToScreen(sn.x, sn.y, cw, ch);
        const to = worldToScreen(tn.x, tn.y, cw, ch);

        const color = EDGE_COLORS[edge.type] || '#60a5fa';
        ctx.strokeStyle = color + '50';
        ctx.lineWidth = 1.5 * cam.zoom;

        if (edge.type === 'related') {
          ctx.setLineDash([4 * cam.zoom, 4 * cam.zoom]);
        } else {
          ctx.setLineDash([]);
        }

        // Curved edge
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const cx2 = mx - dy * 0.1;
        const cy2 = my + dx * 0.1;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(cx2, cy2, to.x, to.y);
        ctx.stroke();

        // Arrowhead
        const t = 0.85;
        const ax = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx2 + t * t * to.x;
        const ay = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy2 + t * t * to.y;
        const angle = Math.atan2(to.y - ay, to.x - ax);
        const arrowLen = 6 * cam.zoom;
        ctx.setLineDash([]);
        ctx.fillStyle = color + '70';
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - arrowLen * Math.cos(angle - 0.4), to.y - arrowLen * Math.sin(angle - 0.4));
        ctx.lineTo(to.x - arrowLen * Math.cos(angle + 0.4), to.y - arrowLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
      ctx.setLineDash([]);

      // Draw nodes
      const hovIdx = hoverRef.current;
      nodes.forEach((n, i) => {
        const s = worldToScreen(n.x, n.y, cw, ch);
        const r = n.radius * cam.zoom;
        const color = DEPTH_COLORS[n.depth] || '#a78bfa';
        const isHov = i === hovIdx;

        // Glow on hover
        if (isHov) {
          const grad = ctx.createRadialGradient(s.x, s.y, r, s.x, s.y, r * 3);
          grad.addColorStop(0, color + '40');
          grad.addColorStop(1, color + '00');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isHov ? '#fff' : '#1a1a2e';
        ctx.lineWidth = isHov ? 2.5 : 1.5;
        ctx.stroke();

        // Label
        const fontSize = Math.max(8, Math.min(12, 10 * cam.zoom));
        ctx.fillStyle = isHov ? '#fff' : '#c9d1d9';
        ctx.font = `${isHov ? 'bold ' : ''}${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        const label = n.title.length > 22 ? n.title.slice(0, 20) + '…' : n.title;
        ctx.fillText(label, s.x, s.y + r + fontSize + 2);

        // Topic path (subtle)
        if (isHov && n.topicPath) {
          ctx.fillStyle = '#6b728080';
          ctx.font = `${Math.max(7, fontSize - 2)}px sans-serif`;
          ctx.fillText(n.topicPath, s.x, s.y + r + fontSize * 2 + 4);
        }
      });

      // Tooltip for hovered node
      if (hovIdx >= 0 && hovIdx < nodes.length) {
        const n = nodes[hovIdx];
        const s = worldToScreen(n.x, n.y, cw, ch);
        const tooltipY = s.y - n.radius * cam.zoom - 14;

        ctx.fillStyle = '#1e293bdd';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        const text = `${n.title} (depth: ${n.depth})`;
        const hint = 'Click to explore course';
        ctx.font = 'bold 11px sans-serif';
        const tw = Math.max(ctx.measureText(text).width, ctx.measureText(hint).width);
        const pad = 8;
        const bx = s.x - tw / 2 - pad;
        const by = tooltipY - 24;
        ctx.beginPath();
        ctx.roundRect(bx, by, tw + pad * 2, 34, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.fillText(text, s.x, tooltipY - 8);
        ctx.fillStyle = '#60a5fa';
        ctx.font = '10px sans-serif';
        ctx.fillText(hint, s.x, tooltipY + 6);
      }

      // Click feedback toast
      if (clickFeedback) {
        const s = worldToScreen(clickFeedback.x, clickFeedback.y, cw, ch);
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(clickFeedback.text).width;
        const pad = 8;
        ctx.fillStyle = '#1e293bdd';
        ctx.strokeStyle = '#f59e0b50';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(s.x - tw / 2 - pad, s.y - 30, tw + pad * 2, 22, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText(clickFeedback.text, s.x, s.y - 15);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [graph, isLoadingGraph, worldToScreen, clickFeedback]);

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-[#0f0f23]' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border-b border-gray-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-sm text-gray-100">Knowledge Graph</span>
          {graph && (
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {Object.keys(graph.nodes || {}).length} nodes · {Object.values(graph.edges || {}).reduce(
                (s: number, e: any) => s + Object.keys(e || {}).length, 0
              )} edges
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchGraph}
            disabled={isLoadingGraph}
            className="h-7 px-2 text-gray-500 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingGraph ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 px-2 text-gray-500 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative bg-[#0f0f23] border border-gray-800 rounded-b-lg overflow-hidden"
        style={{ height: isFullscreen ? 'calc(100vh - 49px)' : 520 }}
      >
        <canvas ref={canvasRef} style={{ cursor: 'grab' }} />

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 bg-[#1a1a2ecc] backdrop-blur-sm px-3 py-2 rounded-md border border-gray-800">
          {Object.entries(DEPTH_COLORS).map(([d, c]) => (
            <div key={d} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-gray-500">D{d}</span>
            </div>
          ))}
          <div className="w-px h-3 bg-gray-700 self-center" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-0 border-t border-green-400/60" />
            <span className="text-[10px] text-gray-500">extends</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0 border-t border-dashed border-blue-400/60" />
            <span className="text-[10px] text-gray-500">related</span>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-3 right-3 text-[10px] text-gray-600 bg-[#1a1a2ecc] backdrop-blur-sm px-2 py-1 rounded border border-gray-800">
          Drag to pan · Scroll to zoom · Click nodes to explore
        </div>
      </div>
    </div>
  );
}
