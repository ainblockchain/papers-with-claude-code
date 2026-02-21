'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  PlugZap,
  Shield,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Bot,
  Wrench,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface McpStatus {
  connected: boolean;
  authMode: 'user_oauth' | 'agent_self_auth' | 'none';
  agentId: string | null;
  mcpUrl: string;
  agentSelfAuthAvailable: boolean;
}

const MCP_TOOLS = [
  { name: 'get_payer_addr', description: 'Get AA wallet address for payments' },
  { name: 'approve_payment', description: 'Sign and approve x402 payment' },
];

const MOCK_STATUS: McpStatus = {
  connected: true,
  authMode: 'agent_self_auth',
  agentId: 'claude-tutor-v1',
  mcpUrl: 'https://neo.dev.gokite.ai/v1/mcp',
  agentSelfAuthAvailable: true,
};

export function KiteMcpConfig() {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/kite-mcp/config');
      if (res.ok) {
        const data = await res.json();
        // Use mock data for demo when not actually connected
        if (!data.connected) {
          setStatus(MOCK_STATUS);
        } else {
          setStatus(data);
        }
      } else {
        setStatus(MOCK_STATUS);
      }
    } catch {
      setStatus(MOCK_STATUS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('kite_oauth');
    const oauthMsg = params.get('kite_msg');
    if (oauthStatus === 'success') {
      setSuccess(oauthMsg || 'Kite Passport connected');
      fetchStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthStatus === 'error') {
      setError(oauthMsg || 'OAuth failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus]);

  const handleConnect = async (mode: 'auto' | 'oauth') => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'oauth') {
        const res = await fetch('/api/kite-mcp/oauth');
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || 'Failed to start OAuth');
          return;
        }
        const { authorizationUrl } = await res.json();
        window.location.href = authorizationUrl;
        return;
      }

      const res = await fetch('/api/kite-mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Connected via ${data.authMode === 'agent_self_auth' ? 'Agent Self-Auth' : 'cached session'}`);
        await fetchStatus();
      } else {
        setError(data.message || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await fetch('/api/kite-mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setSuccess(null);
      await fetchStatus();
    } catch {
      setError('Failed to disconnect');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">Loading MCP status...</span>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected ?? false;

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-100 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Kite Agent Passport
          </CardTitle>
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-red-400'
              }`}
            />
            <Badge
              className={
                isConnected
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error / Success banners */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-green-300">{success}</p>
          </div>
        )}

        {/* MCP Server Info */}
        <div className="p-3 bg-[#16162a] rounded-lg border border-gray-700">
          <p className="text-xs text-gray-500 mb-1">MCP Server</p>
          <code className="text-xs text-blue-400 break-all">
            {status?.mcpUrl || 'https://neo.dev.gokite.ai/v1/mcp'}
          </code>
        </div>

        {/* Available Tools */}
        <div className="p-3 bg-[#16162a] rounded-lg border border-gray-700">
          <div className="flex items-center gap-1.5 mb-2">
            <Wrench className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-xs text-gray-500">Available MCP Tools</p>
          </div>
          <div className="space-y-1.5">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-gray-600'
                  }`}
                />
                <code className="text-[11px] text-[#FF9D00]">{tool.name}</code>
                <span className="text-[10px] text-gray-600">{tool.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection details when connected */}
        {isConnected && status && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PlugZap className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">
                Auth:{' '}
                {status.authMode === 'agent_self_auth'
                  ? 'Agent Self-Auth'
                  : status.authMode === 'user_oauth'
                  ? 'User OAuth'
                  : 'Unknown'}
              </span>
            </div>
            {status.agentId && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Agent ID</p>
                <code className="text-xs text-[#FF9D00] break-all">{status.agentId}</code>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {!isConnected ? (
            <>
              {status?.agentSelfAuthAvailable && (
                <Button
                  onClick={() => handleConnect('auto')}
                  disabled={actionLoading}
                  className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-black"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bot className="h-4 w-4 mr-2" />
                  )}
                  Quick Connect (Agent Self-Auth)
                </Button>
              )}
              <Button
                onClick={() => handleConnect('oauth')}
                disabled={actionLoading}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plug className="h-4 w-4 mr-2" />
                )}
                Connect via OAuth (User Passport)
              </Button>
            </>
          ) : (
            <Button
              onClick={handleDisconnect}
              disabled={actionLoading}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plug className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          )}
        </div>

        {/* Kite Portal link */}
        <a
          href="https://x402-portal-eight.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          Manage Kite Passport at Portal
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
