'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { isRealAuth } from '@/lib/auth-mode';
import {
  registerPasskey,
  authenticatePasskey,
  loadPasskeyInfo,
} from '@/lib/ain/passkey';
import { saveIdentityMapping } from '@/lib/auth/identity-mapping';
import { useIdentitySync } from '@/hooks/useIdentitySync';
import { PasskeyStep } from './components/PasskeyStep';
import { SignInStep } from './components/SignInStep';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, passkeyInfo, isLoading, setPasskeyInfo } = useAuthStore();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [mockAuthActive, setMockAuthActive] = useState(false);

  const fromOAuth = searchParams.get('from') === 'oauth';
  const inLoginFlow = fromOAuth || mockAuthActive;
  // Reconstructed passkeys (from blockchain) have empty credentialId and can't
  // be used for WebAuthn assertion. Treat them as "no usable passkey" so the
  // user is prompted to register a new credential on this device.
  const rawPasskey = typeof window !== 'undefined' ? loadPasskeyInfo() : null;
  const existingPasskey = rawPasskey?.credentialId ? rawPasskey : null;

  // Identity sync runs when:
  //   - we just came back from OAuth or mock-login, OR
  //   - user is authenticated under real auth but has no passkey yet
  const needsIdentitySync =
    inLoginFlow ||
    (isRealAuth && isAuthenticated && !!user && !passkeyInfo && !existingPasskey);

  const { isChecking, isDone } = useIdentitySync({ enabled: needsIdentitySync });

  // Promote the hook's done flag into local state so manual passkey actions
  // and auto-recovery share a single redirect signal.
  useEffect(() => {
    if (isDone) setPasskeyDone(true);
  }, [isDone]);

  // Single redirect rule: go to /explore once either the manual passkey flow
  // finished, or the user is fully set up and not mid-login.
  useEffect(() => {
    if (isLoading) return;
    const ready = passkeyDone || (isAuthenticated && passkeyInfo && !inLoginFlow);
    if (ready) router.push('/explore');
  }, [isLoading, isAuthenticated, passkeyInfo, inLoginFlow, passkeyDone, router]);

  // ── Passkey actions ──
  const handleRegisterPasskey = async () => {
    if (!user) return;
    setProcessing(true);
    setError(null);
    try {
      const info = await registerPasskey(user.id, user.username || user.email);
      setPasskeyInfo(info);
      await saveIdentityMapping({
        userId: user.id,
        publicKey: info.publicKey,
        provider: user.provider ?? 'unknown',
        avatarUrl: user.avatarUrl,
      });
      setPasskeyDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPasskey = async () => {
    if (!existingPasskey || !user) return;
    setProcessing(true);
    setError(null);
    try {
      const info = await authenticatePasskey(existingPasskey.credentialId);
      setPasskeyInfo(info);
      await saveIdentityMapping({
        userId: user.id,
        publicKey: info.publicKey,
        provider: user.provider ?? 'unknown',
        avatarUrl: user.avatarUrl,
      });
      setPasskeyDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey verification failed');
    } finally {
      setProcessing(false);
    }
  };

  // ── Render ──
  if (isLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B7280]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <SignInStep onMockAuthActive={() => setMockAuthActive(true)} />;
  }

  // Authenticated but identity not yet finalized → show PasskeyStep.
  // Covers both the post-OAuth flow and the case where a real-auth user
  // lands on /login without a registered passkey.
  const needsPasskeyAction =
    !passkeyDone && (needsIdentitySync || (isRealAuth && !passkeyInfo));
  if (needsPasskeyAction) {
    return (
      <PasskeyStep
        user={user}
        existingPasskey={existingPasskey}
        onRegister={handleRegisterPasskey}
        onVerify={handleVerifyPasskey}
        processing={processing}
        error={error}
      />
    );
  }

  // Brief flash before the redirect useEffect runs.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#6B7280]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-[#6B7280]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
