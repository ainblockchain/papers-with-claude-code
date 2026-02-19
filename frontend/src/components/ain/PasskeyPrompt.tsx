'use client';

import { useState } from 'react';
import { Fingerprint, X, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { registerPasskey, isPasskeySupported } from '@/lib/ain/passkey';

/**
 * Banner prompting the user to register a passkey as their AIN wallet.
 * Shows only when authenticated + no passkey registered + browser supports WebAuthn.
 */
export function PasskeyPrompt() {
  const { user, isAuthenticated, passkeyInfo, setPasskeyInfo } = useAuthStore();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  // Don't show if: not logged in, already has passkey, dismissed, or browser doesn't support
  if (!isAuthenticated || !user || passkeyInfo || dismissed) return null;
  if (typeof window !== 'undefined' && !isPasskeySupported()) return null;

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      const info = await registerPasskey(user.id, user.username || user.email);
      setPasskeyInfo(info);
      setJustRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (justRegistered) {
    return (
      <div className="mx-auto max-w-4xl px-4 mt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-900/20 border border-green-800/50 text-green-300">
          <Check className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium">Passkey registered!</span>{' '}
            Your AIN wallet address:{' '}
            <code className="text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded text-xs">
              {useAuthStore.getState().passkeyInfo?.ainAddress}
            </code>
          </div>
          <button onClick={() => setJustRegistered(false)} className="text-green-500 hover:text-green-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 mt-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-900/20 border border-blue-800/50">
        <Fingerprint className="h-5 w-5 text-blue-400 shrink-0" />
        <div className="flex-1 text-sm text-blue-200">
          <span className="font-medium">Set up your AIN wallet</span> — Register a
          passkey to get an on-chain wallet address. No seed phrases needed.
        </div>
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {error}
          </div>
        )}
        <button
          onClick={handleRegister}
          disabled={registering}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white transition-colors"
        >
          {registering ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Fingerprint className="h-3.5 w-3.5" />
          )}
          {registering ? 'Registering...' : 'Register Passkey'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-500 hover:text-blue-300 shrink-0"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
