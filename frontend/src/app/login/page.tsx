'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Github, Fingerprint, Loader2, ShieldCheck, ArrowRight, LogIn, KeyRound } from 'lucide-react';
import { ClaudeMark } from '@/components/shared/ClaudeMark';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { isRealAuth } from '@/lib/auth-mode';
import {
  registerPasskey,
  authenticatePasskey,
  isPasskeySupported,
  loadPasskeyInfo,
  reconstructPasskeyInfo,
  type PasskeyInfo,
} from '@/lib/ain/passkey';

/** Step progress indicator (1. Sign In → 2. Passkey) */
function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          currentStep === 1
            ? 'bg-[#24292e] text-white'
            : 'bg-green-100 text-green-700'
        }`}
      >
        {currentStep > 1 ? <ShieldCheck className="h-3 w-3" /> : <LogIn className="h-3 w-3" />}
        1. Sign In
      </div>
      <ArrowRight className="h-3 w-3 text-[#9CA3AF]" />
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          currentStep === 2
            ? 'bg-[#24292e] text-white'
            : 'bg-[#E5E7EB] text-[#6B7280]'
        }`}
      >
        <Fingerprint className="h-3 w-3" />
        2. Passkey
      </div>
    </div>
  );
}

/** Passkey step — verify existing or register new (passkey is mandatory) */
function PasskeyStep({
  user,
  existingPasskey,
  onRegister,
  onVerify,
  processing,
  error,
}: {
  user: { username: string; email: string; avatarUrl: string };
  existingPasskey: PasskeyInfo | null;
  onRegister: () => void;
  onVerify: () => void;
  processing: boolean;
  error: string | null;
}) {
  const supportsPasskey = typeof window !== 'undefined' && isPasskeySupported();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <ClaudeMark className="mx-auto" size={48} />
          <h1 className="mt-4 text-2xl font-bold text-[#111827]">
            {existingPasskey ? 'Verify your Passkey' : 'Set up your AIN Wallet'}
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            {existingPasskey
              ? 'Confirm your identity with your registered passkey.'
              : 'Register a passkey to create your on-chain wallet. No seed phrases needed.'}
          </p>
        </div>

        <StepIndicator currentStep={2} />

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
          {/* User info */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E5E7EB]">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#FF9D00] flex items-center justify-center text-white text-sm font-bold">
                {user.username[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#111827]">{user.username}</p>
              <p className="text-xs text-[#6B7280]">{user.email}</p>
            </div>
          </div>

          {supportsPasskey ? (
            <>
              {existingPasskey ? (
                <Button
                  onClick={onVerify}
                  disabled={processing}
                  className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 mr-2" />
                  )}
                  {processing ? 'Verifying...' : 'Verify Passkey'}
                </Button>
              ) : (
                <Button
                  onClick={onRegister}
                  disabled={processing}
                  className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Fingerprint className="h-5 w-5 mr-2" />
                  )}
                  {processing ? 'Registering...' : 'Register Passkey'}
                </Button>
              )}
              {error && <p className="mt-3 text-xs text-center text-red-500">{error}</p>}
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[#6B7280]">
                Your browser does not support passkeys.
              </p>
              <p className="mt-2 text-xs text-[#9CA3AF]">
                Please use a modern browser (Chrome, Safari, Edge) to continue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, passkeyInfo, isLoading, login, setPasskeyInfo } =
    useAuthStore();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [mockAuthActive, setMockAuthActive] = useState(false);
  const [identityChecking, setIdentityChecking] = useState(false);
  const identityChecked = useRef(false);

  const fromOAuth = searchParams.get('from') === 'oauth';
  const existingPasskey = typeof window !== 'undefined' ? loadPasskeyInfo() : null;

  // ── Identity sync: recover from blockchain OR save existing passkey mapping ──
  const inLoginFlow = fromOAuth || mockAuthActive;
  const needsIdentitySync = inLoginFlow || (isRealAuth && isAuthenticated && !!user && !passkeyInfo && !existingPasskey);
  useEffect(() => {
    if (!isAuthenticated || !user || !needsIdentitySync) return;
    if (identityChecked.current) return;

    identityChecked.current = true;
    let cancelled = false;
    setIdentityChecking(true);

    async function syncIdentity() {
      try {
        console.log('[identity-sync] Looking up identity for userId:', user!.id);
        const res = await fetch(`/api/ain/identity?userId=${encodeURIComponent(user!.id)}`);
        const json = await res.json();
        if (cancelled) { console.log('[identity-sync] Cancelled after fetch'); return; }

        if (json.ok && json.data?.publicKey) {
          console.log('[identity-sync] Found mapping on blockchain, recovering wallet...');
          const localPasskey = loadPasskeyInfo();
          if (!localPasskey || localPasskey.publicKey !== json.data.publicKey) {
            console.log('[identity-sync] Reconstructing PasskeyInfo from blockchain publicKey');
            const info = await reconstructPasskeyInfo(json.data.publicKey);
            setPasskeyInfo(info);
            console.log('[identity-sync] Recovered AIN address:', info.ainAddress);
          } else {
            console.log('[identity-sync] Local passkey matches blockchain, no change needed');
          }
          setPasskeyDone(true);
          return;
        }

        console.log('[identity-sync] No mapping found on blockchain');
        // No mapping on blockchain → save current passkey if we have one
        const localPasskey = loadPasskeyInfo();
        if (localPasskey?.publicKey) {
          console.log('[identity-sync] Saving local passkey to blockchain');
          await saveIdentityMapping(localPasskey.publicKey);
          if (cancelled) return;
          setPasskeyDone(true);
          return;
        }
        console.log('[identity-sync] No local passkey either, showing registration UI');
      } catch (err) {
        console.error('[identity-sync] Error:', err);
      } finally {
        if (!cancelled) setIdentityChecking(false);
      }
    }
    syncIdentity();
    return () => {
      cancelled = true;
      identityChecked.current = false;
      setIdentityChecking(false);
    };
  }, [isAuthenticated, user, needsIdentitySync]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redirect logic ──
  useEffect(() => {
    if (isLoading) return;

    if (passkeyDone) {
      router.push('/explore');
      return;
    }

    // Already fully authenticated + NOT in a login flow → redirect
    if (isAuthenticated && passkeyInfo && !fromOAuth && !mockAuthActive) {
      router.push('/explore');
    }
  }, [isLoading, isAuthenticated, passkeyInfo, fromOAuth, mockAuthActive, passkeyDone, router]);

  // ── Handlers ──
  const handleGitHubLogin = () => {
    if (isRealAuth) {
      signIn('github', { redirectTo: '/login?from=oauth' });
    } else {
      login({ id: 'mock-user', username: 'developer', avatarUrl: '', email: 'dev@example.com', provider: 'github' });
      setMockAuthActive(true);
    }
  };

  const handleKiteLogin = () => {
    if (isRealAuth) {
      signIn('kite-passport', { redirectTo: '/login?from=oauth' });
    } else {
      login({ id: 'mock-kite-user', username: 'kite-agent', avatarUrl: '', email: '', provider: 'kite-passport' });
      setMockAuthActive(true);
    }
  };

  /** Save identity mapping to blockchain (fire-and-forget, 409 = already exists = OK) */
  const saveIdentityMapping = async (publicKey: string) => {
    if (!user) return;
    try {
      await fetch('/api/ain/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          publicKey,
          provider: user.provider ?? 'github',
        }),
      });
    } catch {
      // Best effort — mapping will be created on next login if this fails
    }
  };

  const handleRegisterPasskey = async () => {
    if (!user) return;
    setProcessing(true);
    setError(null);
    try {
      const info = await registerPasskey(user.id, user.username || user.email);
      setPasskeyInfo(info);
      await saveIdentityMapping(info.publicKey);
      setPasskeyDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPasskey = async () => {
    if (!existingPasskey) return;
    setProcessing(true);
    setError(null);
    try {
      const info = await authenticatePasskey(existingPasskey.credentialId);
      setPasskeyInfo(info);
      await saveIdentityMapping(info.publicKey);
      setPasskeyDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey verification failed');
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading ──
  if (isLoading || identityChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B7280]" />
      </div>
    );
  }

  // ── Step 2: Passkey (authenticated via OAuth or mock) ──
  if (isAuthenticated && user && needsIdentitySync && !passkeyDone) {
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

  // ── Step 2 fallback: real auth session without passkey (direct /login navigation) ──
  // In mock mode, skip this so the user always sees the GitHub button first.
  if (isRealAuth && isAuthenticated && user && !passkeyInfo) {
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

  // ── Step 1: Not authenticated → choose sign-in provider ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <ClaudeMark className="mx-auto" size={48} />
          <h1 className="mt-4 text-2xl font-bold text-[#111827]">Papers with Claude Code</h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Learn research papers interactively with AI
          </p>
        </div>

        <StepIndicator currentStep={1} />

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
          <Button
            onClick={handleGitHubLogin}
            className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
          >
            <Github className="h-5 w-5 mr-2" />
            Sign in with GitHub
          </Button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-xs text-[#9CA3AF]">or</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          <Button
            onClick={handleKiteLogin}
            variant="outline"
            className="w-full h-11 border-[#E5E7EB] hover:bg-[#F9FAFB]"
          >
            <KeyRound className="h-5 w-5 mr-2 text-[#6B7280]" />
            Sign in with Kite Passport
          </Button>

          <p className="mt-4 text-xs text-center text-[#6B7280]">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
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
