'use client';

import { useEffect } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAinStore } from '@/stores/useAinStore';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AinWalletInfo() {
  const { ainAddress, ainBalance, fetchAccountInfo } = useAinStore();

  useEffect(() => {
    fetchAccountInfo();
  }, [fetchAccountInfo]);

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
        {ainAddress ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-400" />
              <code className="text-xs text-blue-400 font-mono">
                {truncateAddress(ainAddress)}
              </code>
            </div>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className="text-lg font-bold text-white">{ainBalance} AIN</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Wallet className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No AIN wallet configured</p>
            <p className="text-xs text-gray-600 mt-1">Set AIN_PRIVATE_KEY in env</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
