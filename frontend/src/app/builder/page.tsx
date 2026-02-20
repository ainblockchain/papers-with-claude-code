'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Terminal, AlertTriangle, Hammer, RefreshCw } from 'lucide-react';
import { XtermTerminal } from '@/components/learn/XtermTerminal';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  terminalSessionAdapter,
  SessionLimitError,
} from '@/lib/adapters/terminal-session';

const TERMINAL_API_URL = process.env.NEXT_PUBLIC_TERMINAL_API_URL;
const API_PROXY = '/api/terminal';

type BuilderPhase = 'idle' | 'creating' | 'running' | 'error';

export default function CourseBuilderPage() {
  const [phase, setPhase] = useState<BuilderPhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionCleanupRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const { user, passkeyInfo } = useAuthStore();

  const cleanupSession = useCallback(() => {
    const sid = sessionCleanupRef.current;
    if (sid) {
      sessionCleanupRef.current = null;
      terminalSessionAdapter.deleteSession(sid);
    }
  }, []);

  // Page close cleanup
  useEffect(() => {
    const cleanupOnClose = () => {
      const sid = sessionCleanupRef.current;
      if (sid && TERMINAL_API_URL) {
        const beaconSent = navigator.sendBeacon(
          `${API_PROXY}/sessions/${sid}/delete`,
          '',
        );
        if (!beaconSent) {
          try {
            fetch(`${API_PROXY}/sessions/${sid}`, {
              method: 'DELETE',
              keepalive: true,
            });
          } catch {
            // best effort
          }
        }
        sessionCleanupRef.current = null;
      }
    };

    window.addEventListener('beforeunload', cleanupOnClose);
    window.addEventListener('pagehide', cleanupOnClose);
    return () => {
      window.removeEventListener('beforeunload', cleanupOnClose);
      window.removeEventListener('pagehide', cleanupOnClose);
    };
  }, []);

  const startSession = useCallback(async () => {
    if (!TERMINAL_API_URL) {
      setError('Terminal API URL not configured. Set NEXT_PUBLIC_TERMINAL_API_URL.');
      setPhase('error');
      return;
    }

    // Clean up any previous session
    cleanupSession();
    cancelledRef.current = false;
    setPhase('creating');
    setError(null);

    try {
      // Cleanup stale sessions first
      await terminalSessionAdapter.cleanupStaleSessions();

      const walletAddress = passkeyInfo?.ainAddress;
      const session = await terminalSessionAdapter.createSession({
        userId: walletAddress || user?.id,
        mode: 'generator',
      });

      sessionCleanupRef.current = session.sessionId;

      if (cancelledRef.current) {
        cleanupSession();
        return;
      }

      setSessionId(session.sessionId);

      // Poll until session is running
      const start = Date.now();
      const maxWait = 60000;
      const interval = 2000;

      while (Date.now() - start < maxWait) {
        if (cancelledRef.current) {
          cleanupSession();
          return;
        }
        try {
          const info = await terminalSessionAdapter.getSession(session.sessionId);
          if (info.status === 'running') {
            setPhase('running');
            return;
          }
          if (info.status === 'terminated' || info.status === 'terminating') {
            throw new Error('Session terminated unexpectedly');
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('terminated')) throw err;
        }
        await new Promise((r) => setTimeout(r, interval));
      }
      throw new Error('Session creation timed out after 60 seconds');
    } catch (err) {
      if (cancelledRef.current) {
        cleanupSession();
        return;
      }
      if (err instanceof SessionLimitError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create session');
      }
      setPhase('error');
    }
  }, [user, passkeyInfo, cleanupSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      cleanupSession();
    };
  }, [cleanupSession]);

  const handleEndSession = useCallback(() => {
    cancelledRef.current = true;
    cleanupSession();
    setSessionId(null);
    setPhase('idle');
  }, [cleanupSession]);

  // ── Idle state: show start button ──
  if (phase === 'idle') {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] bg-[#0a0a1a]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8 max-w-lg">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#FF9D00]/10 flex items-center justify-center mb-6">
              <Hammer className="h-8 w-8 text-[#FF9D00]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Course Builder</h1>
            <p className="text-gray-400 mb-2">
              Create interactive learning courses from any arXiv paper, GitHub repo, or HuggingFace model.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              A Claude Code terminal will open where you can provide a URL and course name.
              The AI will analyze the content and generate a full learning course with stages, concepts, and quizzes.
            </p>

            <div className="bg-[#1a1a2e] rounded-lg p-4 mb-8 border border-gray-700 text-left">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">How it works</p>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className="flex gap-2">
                  <span className="text-[#FF9D00] font-mono font-bold shrink-0">1.</span>
                  Click &quot;Start Building&quot; to launch a terminal session
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF9D00] font-mono font-bold shrink-0">2.</span>
                  Enter an arXiv URL, GitHub repo, or HuggingFace model link
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF9D00] font-mono font-bold shrink-0">3.</span>
                  Provide a course name and let Claude Code generate the course
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF9D00] font-mono font-bold shrink-0">4.</span>
                  The course is automatically pushed to GitHub and ready to use
                </li>
              </ol>
            </div>

            <button
              onClick={startSession}
              className="px-8 py-3 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Terminal className="h-5 w-5" />
              Start Building
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Creating state: loading spinner ──
  if (phase === 'creating') {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] bg-[#0a0a1a]">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <div className="relative">
            <Terminal className="h-12 w-12 text-[#FF9D00]" />
            <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-cyan-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-gray-200">
              Launching Course Builder Environment
            </p>
            <p className="text-xs text-gray-500 font-mono">
              Provisioning sandbox pod with Claude Code...
            </p>
            <p className="text-xs text-gray-600">
              This typically takes 10-30 seconds
            </p>
          </div>
          <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF9D00] to-cyan-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (phase === 'error') {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] bg-[#0a0a1a]">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <AlertTriangle className="h-10 w-10 text-yellow-500" />
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-red-400">
              Session Creation Failed
            </p>
            <p className="text-xs text-gray-400 font-mono max-w-sm">
              {error || 'Unknown error'}
            </p>
          </div>
          <button
            onClick={startSession}
            className="mt-4 px-6 py-2 bg-[#1a1a2e] hover:bg-[#252545] text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Running state: full terminal ──
  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16162a] border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Hammer className="h-4 w-4 text-[#FF9D00]" />
          <span className="text-sm font-medium text-gray-200">Course Builder</span>
          <span className="text-xs text-gray-500 font-mono">generator mode</span>
        </div>
        <button
          onClick={handleEndSession}
          className="px-3 py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors border border-gray-700"
        >
          End Session
        </button>
      </div>

      {/* Full-screen terminal */}
      <div className="flex-1 overflow-hidden">
        {sessionId && (
          <XtermTerminal
            sessionId={sessionId}
            wsUrl={terminalSessionAdapter.getWebSocketUrl(sessionId)}
          />
        )}
      </div>
    </div>
  );
}
