'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  loadPasskeyInfo,
  reconstructPasskeyInfo,
} from '@/lib/ain/passkey';
import { saveIdentityMapping } from '@/lib/auth/identity-mapping';

interface UseIdentitySyncResult {
  /** True while the auto-recovery flow is talking to the blockchain. */
  isChecking: boolean;
  /**
   * True once auto-recovery has either restored the passkey from blockchain
   * or registered the local one. The page should redirect to /explore.
   */
  isDone: boolean;
}

/**
 * Auto-recover or register the user's passkey identity after sign-in.
 *
 * Branches:
 *   1. Blockchain has a mapping → reconstruct PasskeyInfo from the stored
 *      publicKey, then optionally register the local one as a secondary key.
 *   2. No mapping but local passkey exists → push the local one to chain.
 *   3. Neither → caller must show the PasskeyStep UI for manual register/verify.
 *
 * `enabled` should be true exactly when the flow is mid-login (post-OAuth or
 * post-mock-login) and false otherwise so the effect doesn't run twice.
 */
export function useIdentitySync({ enabled }: { enabled: boolean }): UseIdentitySyncResult {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setPasskeyInfo = useAuthStore((s) => s.setPasskeyInfo);

  const [isChecking, setIsChecking] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user || isDone) return;

    let cancelled = false;
    setIsChecking(true);

    (async () => {
      try {
        const res = await fetch(`/api/ain/identity?userId=${encodeURIComponent(user.id)}`);
        const json = await res.json();
        if (cancelled) return;

        // Branch 1: blockchain mapping exists
        if (json.ok && json.data?.publicKey) {
          const localPasskey = loadPasskeyInfo();

          // Local matches blockchain → nothing to do
          if (localPasskey?.publicKey === json.data.publicKey) {
            setIsDone(true);
            return;
          }

          // Blockchain wins — reconstruct wallet from stored publicKey
          const info = await reconstructPasskeyInfo(json.data.publicKey);
          if (cancelled) return;
          setPasskeyInfo(info);

          // If a different local passkey exists, also register it on chain
          if (localPasskey) {
            await saveIdentityMapping({
              userId: user.id,
              publicKey: localPasskey.publicKey,
              provider: user.provider ?? 'unknown',
              avatarUrl: user.avatarUrl,
            });
            if (cancelled) return;
          }
          setIsDone(true);
          return;
        }

        // Branch 2: no blockchain mapping, but local passkey present
        const localPasskey = loadPasskeyInfo();
        if (localPasskey?.publicKey) {
          await saveIdentityMapping({
            userId: user.id,
            publicKey: localPasskey.publicKey,
            provider: user.provider ?? 'unknown',
            avatarUrl: user.avatarUrl,
          });
          if (cancelled) return;
          setIsDone(true);
          return;
        }
        // Branch 3: neither → caller renders PasskeyStep for manual action.
      } catch {
        // Network/blockchain error — fall back to manual passkey UI.
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, user, isDone, setPasskeyInfo]);

  return { isChecking, isDone };
}
