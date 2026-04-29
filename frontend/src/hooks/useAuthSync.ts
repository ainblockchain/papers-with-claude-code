'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAuthStore } from '@/stores/useAuthStore';
import { loadPasskeyInfo } from '@/lib/ain/passkey';
import { AUTH_PROVIDERS, findAuthProvider } from '@/lib/auth/providers';

const FALLBACK_MOCK_USER = {
  id: 'mock-user',
  username: 'developer',
  avatarUrl: '',
  email: 'dev@example.com',
};

/** Restore passkey info from localStorage, falling back to blockchain identity recovery */
function usePasskeyRestore() {
  const setPasskeyInfo = useAuthStore((s) => s.setPasskeyInfo);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const info = loadPasskeyInfo();
    if (info) {
      setPasskeyInfo(info);
      return;
    }
    if (!user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ain/identity?userId=${encodeURIComponent(user.id)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.ok && json.data?.publicKey) {
          const { reconstructPasskeyInfo } = await import('@/lib/ain/passkey');
          const recovered = await reconstructPasskeyInfo(json.data.publicKey);
          if (!cancelled) setPasskeyInfo(recovered);
        }
      } catch {
        // blockchain unavailable — keep current local-only behavior
      }
    })();
    return () => { cancelled = true; };
  }, [setPasskeyInfo, user]);
}

/** Syncs NextAuth session → Zustand store. Must be inside SessionProvider. */
export function AuthSyncEffect() {
  const { data: session, status } = useSession();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setLoading = useAuthStore((s) => s.setLoading);

  usePasskeyRestore();

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    setLoading(false);

    if (status === 'authenticated' && session?.user) {
      // Provider-specific stale detection (e.g. GitHub's pre-migration UUID
      // tokens). Each plugin decides what "stale" means for itself.
      const plugin = findAuthProvider(session.user.provider);
      if (plugin?.detectStaleSession?.(session)) {
        signOut({ redirectTo: '/login' });
        return;
      }
      login({
        id: session.user.id,
        username: session.user.username || session.user.name || '',
        avatarUrl: session.user.avatarUrl || session.user.image || '',
        email: session.user.email || '',
        provider: session.user.provider,
      });
    } else {
      logout();
    }
  }, [session, status, login, logout, setLoading]);

  return null;
}

/** Sets mock user immediately. Used when no real OAuth is configured. */
export function MockAuthEffect() {
  const login = useAuthStore((s) => s.login);
  const setLoading = useAuthStore((s) => s.setLoading);

  usePasskeyRestore();

  useEffect(() => {
    setLoading(false);
    const defaultPlugin = AUTH_PROVIDERS[0];
    login(defaultPlugin?.mockUser ?? FALLBACK_MOCK_USER);
  }, [login, setLoading]);

  return null;
}
