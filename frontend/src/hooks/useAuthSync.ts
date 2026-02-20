'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/useAuthStore';
import { loadPasskeyInfo } from '@/lib/ain/passkey';

const MOCK_USER = {
  id: 'mock-user',
  username: 'developer',
  avatarUrl: '',
  email: 'dev@example.com',
};

/** Restore passkey info from localStorage on mount */
function usePasskeyRestore() {
  const setPasskeyInfo = useAuthStore((s) => s.setPasskeyInfo);

  useEffect(() => {
    const info = loadPasskeyInfo();
    if (info) setPasskeyInfo(info);
  }, [setPasskeyInfo]);
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
