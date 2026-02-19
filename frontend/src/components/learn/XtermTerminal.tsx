'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface XtermTerminalProps {
  sessionId: string;
  wsUrl: string;
  onStageComplete?: (stageNumber: number) => void;
}

export function XtermTerminal({ sessionId, wsUrl, onStageComplete }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (termRef.current) {
      termRef.current.dispose();
      termRef.current = null;
    }
    fitAddonRef.current = null;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function init() {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      if (cancelled || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: '#1a1a2e',
          foreground: '#e0e0e0',
          cursor: '#FF9D00',
          cursorAccent: '#1a1a2e',
          selectionBackground: 'rgba(255, 157, 0, 0.3)',
          black: '#1a1a2e',
          red: '#ff5555',
          green: '#50fa7b',
          yellow: '#f1fa8c',
          blue: '#6272a4',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f8f8f2',
          brightBlack: '#44475a',
          brightRed: '#ff6e6e',
          brightGreen: '#69ff94',
          brightYellow: '#ffffa5',
          brightBlue: '#d6acff',
          brightMagenta: '#ff92df',
          brightCyan: '#a4ffff',
          brightWhite: '#ffffff',
        },
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      // Connect WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        setConnecting(false);

        // Send initial resize
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));

        // Heartbeat
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        const data = event.data;
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'stage_complete' && onStageComplete) {
            onStageComplete(msg.stageNumber);
          }
          // Ignore pong and course_complete (not handling per user request)
        } catch {
          // Raw terminal output
          term.write(data);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        setConnecting(false);
        term.write('\r\n\x1b[33m[Connection closed]\x1b[0m\r\n');
      };

      ws.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        setConnecting(false);
      };

      // Terminal input → server
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current && termRef.current) {
          fitAddonRef.current.fit();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'resize',
                cols: termRef.current.cols,
                rows: termRef.current.rows,
              }),
            );
          }
        }
      };

      const observer = new ResizeObserver(handleResize);
      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }

    const initPromise = init();

    return () => {
      cancelled = true;
      initPromise.then((observerCleanup) => observerCleanup?.());
      cleanup();
    };
  }, [sessionId, wsUrl, onStageComplete, cleanup]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#16162a] border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-gray-400 font-mono ml-2">
          Claude Code Terminal
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {connecting ? (
            <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
          ) : connected ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-400" />
          )}
          <span className="text-xs text-gray-500 font-mono">
            {connecting ? 'connecting...' : connected ? 'live' : 'disconnected'}
          </span>
        </div>
      </div>

      {/* Terminal container */}
      <div ref={containerRef} className="flex-1 px-1 py-1" />
    </div>
  );
}
