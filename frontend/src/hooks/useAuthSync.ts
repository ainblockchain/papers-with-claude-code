'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAuthStore } from '@/stores/useAuthStore';
import { loadPasskeyInfo } from '@/lib/ain/passkey';

const MOCK_USER = {
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
      // Migration: stale GitHub tokens have UUID-style IDs (pre stable-ID fix).
      // GitHub numeric IDs are purely digits; force re-auth to get the correct ID.
      if (
        session.user.provider === 'github' &&
        session.user.id &&
        !/^\d+$/.test(session.user.id)
      ) {
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

/** Sets mock user immediately. Used when GitHub OAuth is not configured. */
export function MockAuthEffect() {
  const login = useAuthStore((s) => s.login);
  const setLoading = useAuthStore((s) => s.setLoading);

  usePasskeyRestore();

  useEffect(() => {
    setLoading(false);
    login(MOCK_USER);
  }, [login, setLoading]);

  return null;
}
