'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wallet, RefreshCw, Fingerprint, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAinStore } from '@/stores/useAinStore';
import { useAuthStore } from '@/stores/useAuthStore';

function CopyableAddress({ address, isPasskey }: { address: string; isPasskey: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  return (
    <div className="flex items-center gap-2">
      {isPasskey ? (
        <Fingerprint className="h-4 w-4 text-purple-400 shrink-0" />
      ) : (
        <Wallet className="h-4 w-4 text-blue-400 shrink-0" />
      )}
      <code className={`text-xs font-mono break-all ${isPasskey ? 'text-purple-400' : 'text-blue-400'}`}>
        {address}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1 rounded hover:bg-gray-700/50 transition-colors"
        title="Copy address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300" />
        )}
      </button>
      {isPasskey && (
        <span className="text-[10px] text-purple-500 bg-purple-900/30 px-1 py-0.5 rounded shrink-0">
          passkey
        </span>
      )}
    </div>
  );
}

export function AinWalletInfo() {
  const { ainAddress, ainBalance, fetchAccountInfo } = useAinStore();
  const { passkeyInfo } = useAuthStore();

  useEffect(() => {
    fetchAccountInfo();
  }, [fetchAccountInfo]);

  // Prefer passkey-derived address, fall back to server wallet
  const displayAddress = passkeyInfo?.ainAddress || ainAddress;
  const isPasskey = !!passkeyInfo?.ainAddress;

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">AIN Wallet</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAccountInfo}
          className="h-6 w-6 p-0 text-gray-500 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {displayAddress ? (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">AIN Address</p>
              <CopyableAddress address={displayAddress} isPasskey={isPasskey} />
            </div>
            {passkeyInfo?.evmAddress && (
              <div>
                <p className="text-[10px] text-gray-500 mb-1">EVM Address (Base)</p>
                <CopyableAddress address={passkeyInfo.evmAddress} isPasskey={isPasskey} />
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className="text-lg font-bold text-white">{ainBalance} AIN</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Wallet className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No AIN wallet configured</p>
            <p className="text-xs text-gray-600 mt-1">Register a passkey on the Explore page</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
