import GitHub from 'next-auth/providers/github';
import { Github } from 'lucide-react';
import type { AuthProviderPlugin } from '../provider-types';

interface GitHubProfileShape {
  id?: number;
  login?: string;
  avatar_url?: string;
}

const githubPlugin = {
  id: 'github' as const,
  displayName: 'GitHub',
  buttonIcon: Github,
  buttonStyle: 'primary',

  provider: () => GitHub({}),

  mapJWT({ token, user, profile }) {
    const p = profile as GitHubProfileShape;
    // Use GitHub's stable numeric ID, not NextAuth's random UUID.
    token.id = String(p.id ?? user?.id ?? '');
    token.username = p.login ?? user?.name ?? '';
    token.avatarUrl = p.avatar_url ?? user?.image ?? '';
  },

  // GitHub's user.id must be a numeric string. Anything else is a stale JWT
  // from before the auth.ts migration that used NextAuth's UUID.
  detectStaleSession(session) {
    return !!session.user.id && !/^\d+$/.test(session.user.id);
  },

  mockUser: {
    id: 'mock-user',
    username: 'developer',
    avatarUrl: '',
    email: 'dev@example.com',
  },
} satisfies AuthProviderPlugin;

export default githubPlugin;
