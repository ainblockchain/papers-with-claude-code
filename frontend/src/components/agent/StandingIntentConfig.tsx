'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAgentStore, StandingIntent } from '@/stores/useAgentStore';

const EXPIRY_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
];

const LEARNING_LEDGER_ADDRESS = process.env.NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS || '';

function formatCountdown(expiresAt: number): string {
  const diff = expiresAt * 1000 - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}m`;
}

function kiteToWei(kite: string): string {
  const num = parseFloat(kite);
  if (isNaN(num)) return '0';
  return BigInt(Math.round(num * 1e18)).toString();
}

export function StandingIntentConfig() {
  const { standingIntent, dailyUsed, dailyCap, agentDID, updateStandingIntent } = useAgentStore();

  const [maxTx, setMaxTx] = useState('0.01');
  const [dailyCapInput, setDailyCapInput] = useState('0.1');
  const [allowLedger, setAllowLedger] = useState(true);
  const [allowEnroll, setAllowEnroll] = useState(true);
  const [allowComplete, setAllowComplete] = useState(true);
  const [expirySeconds, setExpirySeconds] = useState(86400);
  const [isSaving, setIsSaving] = useState(false);
  const [countdown, setCountdown] = useState('');

  // Populate from existing SI
  useEffect(() => {
    if (!standingIntent) return;
    const maxTxKite = (parseInt(standingIntent.maxTransactionAmount) / 1e18).toString();
    const dailyCapKite = (parseInt(standingIntent.dailyCap) / 1e18).toString();
    setMaxTx(maxTxKite);
    setDailyCapInput(dailyCapKite);
    setAllowLedger(standingIntent.allowedContracts.length > 0);
    setAllowEnroll(standingIntent.allowedFunctions.includes('enrollCourse'));
    setAllowComplete(standingIntent.allowedFunctions.includes('completeStage'));
  }, [standingIntent]);

  // Countdown timer
  useEffect(() => {
    if (!standingIntent) return;
    const update = () => setCountdown(formatCountdown(standingIntent.expiresAt));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [standingIntent]);

  const usedNum = parseFloat(dailyUsed) || 0;
  const capNum = parseFloat(dailyCap) || 0;
  const usagePercent = capNum > 0 ? Math.min((usedNum / capNum) * 100, 100) : 0;

  const siStatus = !standingIntent
    ? 'not_set'
    : standingIntent.expiresAt * 1000 < Date.now()
    ? 'expired'
    : 'active';

  const statusConfig = {
    active: { label: 'Active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    expired: { label: 'Expired', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    not_set: { label: 'Not Set', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const functions: string[] = [];
      if (allowEnroll) functions.push('enrollCourse');
      if (allowComplete) functions.push('completeStage');

      const si: StandingIntent = {
        agentDID: agentDID || '',
        maxTransactionAmount: kiteToWei(maxTx),
        dailyCap: kiteToWei(dailyCapInput),
        allowedContracts: allowLedger && LEARNING_LEDGER_ADDRESS ? [LEARNING_LEDGER_ADDRESS] : [],
        allowedFunctions: functions,
        expiresAt: Math.floor(Date.now() / 1000) + expirySeconds,
        userSignature: '', // Will be signed server-side
      };
      await updateStandingIntent(si);
    } catch {
      // Error already logged in store
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-100">Standing Intent</CardTitle>
          <Badge className={statusConfig[siStatus].className}>
            {statusConfig[siStatus].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Usage Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Daily Usage</span>
            <span>{dailyUsed} / {dailyCap} KITE</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
        </div>

        {/* Expiry Countdown */}
        {standingIntent && siStatus === 'active' && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Expires in {countdown}</span>
          </div>
        )}

        {siStatus === 'expired' && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Standing Intent has expired. Please renew.</span>
          </div>
        )}

        {/* Max Transaction Amount */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Max Transaction Amount (KITE)</label>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={maxTx}
            onChange={(e) => setMaxTx(e.target.value)}
            className="bg-[#16162a] border-gray-600 text-gray-200 h-8 text-sm"
          />
        </div>

        {/* Daily Spending Cap */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Daily Spending Cap (KITE)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={dailyCapInput}
            onChange={(e) => setDailyCapInput(e.target.value)}
            className="bg-[#16162a] border-gray-600 text-gray-200 h-8 text-sm"
          />
        </div>

        {/* Allowed Contracts */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Allowed Contracts</p>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={allowLedger}
              onChange={(e) => setAllowLedger(e.target.checked)}
              className="rounded border-gray-600 bg-[#16162a]"
            />
            LearningLedger
          </label>
        </div>

        {/* Allowed Functions */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Allowed Functions</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEnroll}
                onChange={(e) => setAllowEnroll(e.target.checked)}
                className="rounded border-gray-600 bg-[#16162a]"
              />
              enrollCourse
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowComplete}
                onChange={(e) => setAllowComplete(e.target.checked)}
                className="rounded border-gray-600 bg-[#16162a]"
              />
              completeStage
            </label>
          </div>
        </div>

        {/* Expiry Duration */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Expiry Duration</label>
          <select
            value={expirySeconds}
            onChange={(e) => setExpirySeconds(Number(e.target.value))}
            className="w-full h-8 rounded-md border border-gray-600 bg-[#16162a] text-gray-200 text-sm px-2 outline-none focus:border-[#FF9D00]"
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.seconds} value={opt.seconds}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
        >
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              Save & Sign
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
