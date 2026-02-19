'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Shield, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/stores/useAgentStore';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_KITE_EXPLORER_URL || 'https://testnet.kitescan.ai';

export function AgentWalletCard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const {
    agentDID,
    walletAddress,
    isKitePassVerified,
    balance,
    chainId,
    fetchWalletStatus,
  } = useAgentStore();

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="ml-2 text-gray-500 hover:text-gray-300 transition-colors"
    >
      {copiedField === field ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-100">Agent Identity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchWalletStatus()}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent DID */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Agent DID</p>
          <div className="flex items-center">
            <code className="text-xs text-[#FF9D00] break-all">
              {agentDID || 'Not configured'}
            </code>
            {agentDID && <CopyButton text={agentDID} field="did" />}
          </div>
        </div>

        {/* Wallet Address */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
          <div className="flex items-center">
            <code className="text-sm text-gray-200 font-mono">
              {walletAddress ? truncateAddress(walletAddress) : 'N/A'}
            </code>
            {walletAddress && (
              <>
                <CopyButton text={walletAddress} field="wallet" />
                <a
                  href={`${EXPLORER_BASE}/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-gray-500 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Balance */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className="text-xl font-bold text-white">
            {balance} <span className="text-sm text-gray-400">KITE</span>
          </p>
        </div>

        {/* KitePass Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1">KitePass</p>
          <div className="flex items-center gap-2">
            {isKitePassVerified ? (
              <>
                <ShieldCheck className="h-4 w-4 text-green-400" />
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Verified
                </Badge>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-gray-500" />
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  Not Issued
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Network */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Network</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm text-gray-300">
              KiteAI {chainId === 2366 ? 'Mainnet' : 'Testnet'} (Chain ID: {chainId})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
