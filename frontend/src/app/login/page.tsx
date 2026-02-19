'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Github, Fingerprint, Loader2 } from 'lucide-react';
import { ClaudeMark } from '@/components/shared/ClaudeMark';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { isRealAuth } from '@/lib/auth-mode';
import { registerPasskey, isPasskeySupported } from '@/lib/ain/passkey';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, passkeyInfo, login, setPasskeyInfo } = useAuthStore();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After login + passkey registered → redirect to /explore
  useEffect(() => {
    if (isAuthenticated && passkeyInfo) {
      router.push('/explore');
    }
  }, [isAuthenticated, passkeyInfo, router]);

  const handleGitHubLogin = () => {
    if (isRealAuth) {
      // Redirect back to /login for passkey registration step
      signIn('github', { redirectTo: '/login' });
    } else {
      login({
        id: 'mock-user',
        username: 'developer',
        avatarUrl: '',
        email: 'dev@example.com',
      });
    }
  };

  const handleRegisterPasskey = async () => {
    if (!user) return;
    setRegistering(true);
    setError(null);
    try {
      const info = await registerPasskey(user.id, user.username || user.email);
      setPasskeyInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleSkipPasskey = () => {
    router.push('/explore');
  };

  // Step 2: Authenticated but no passkey → show passkey registration
  if (isAuthenticated && user && !passkeyInfo) {
    const supportsPasskey = typeof window !== 'undefined' && isPasskeySupported();

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm mx-4">
          <div className="text-center mb-8">
            <ClaudeMark className="mx-auto" size={48} />
            <h1 className="mt-4 text-2xl font-bold text-[#111827]">Set up your AIN Wallet</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Register a passkey to create your on-chain wallet. No seed phrases needed.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E5E7EB]">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="h-10 w-10 rounded-full" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#FF9D00] flex items-center justify-center text-white text-sm font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[#111827]">{user.username}</p>
                <p className="text-xs text-[#6B7280]">{user.email}</p>
              </div>
            </div>

            {supportsPasskey ? (
              <>
                <Button
                  onClick={handleRegisterPasskey}
                  disabled={registering}
                  className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
                >
                  {registering ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Fingerprint className="h-5 w-5 mr-2" />
                  )}
                  {registering ? 'Registering...' : 'Register Passkey'}
                </Button>
                {error && (
                  <p className="mt-3 text-xs text-center text-red-500">{error}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-center text-[#6B7280]">
                Your browser does not support passkeys.
              </p>
            )}

            <button
              onClick={handleSkipPasskey}
              className="mt-3 w-full text-xs text-center text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Not authenticated → show GitHub sign in
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
          <Button
            onClick={handleGitHubLogin}
            className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
          >
            <Github className="h-5 w-5 mr-2" />
            Sign in with GitHub
          </Button>
          <p className="mt-4 text-xs text-center text-[#6B7280]">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
