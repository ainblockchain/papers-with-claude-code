import Google from 'next-auth/providers/google';
import { Mail } from 'lucide-react';
import type { AuthProviderPlugin } from '../provider-types';

interface GoogleProfileShape {
  sub?: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
}

const googlePlugin = {
  id: 'google' as const,
  displayName: 'Google',
  buttonIcon: Mail,
  buttonStyle: 'outline',

  provider: () => Google({}),

  mapJWT({ token, user, profile }) {
    const p = profile as GoogleProfileShape;
    // Google's `sub` is the stable, unique account identifier.
    token.id = p.sub ?? user?.id ?? '';
    token.username = p.name ?? user?.name ?? p.email ?? '';
    token.avatarUrl = p.picture ?? user?.image ?? '';
  },

  // Google's sub is always stable — no migration concerns.

  mockUser: {
    id: 'mock-google-user',
    username: 'Google Dev',
    avatarUrl: '',
    email: 'dev@google.example',
  },
} satisfies AuthProviderPlugin;

export default googlePlugin;
