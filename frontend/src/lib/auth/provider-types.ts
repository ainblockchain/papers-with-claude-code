import type { Provider } from 'next-auth/providers';
import type { Session, User, Profile } from 'next-auth';
import type { JWT } from '@auth/core/jwt';
import type { LucideIcon } from 'lucide-react';

/**
 * An auth provider plugin.
 *
 * Each provider lives in its own module under `lib/auth/providers/<id>.ts` and
 * is registered in `lib/auth/providers/index.ts`. Adding a provider = create
 * a file + add one line to the registry. Removing = the reverse.
 *
 * The plugin owns:
 *   - the NextAuth provider factory
 *   - how to map its OAuth profile into JWT fields (`mapJWT`)
 *   - any provider-specific stale-session detection
 *   - login-button metadata (label, icon)
 *   - an optional mock user for dev mode
 *
 * Once the plugin's `mapJWT` writes into the token, the rest of the app
 * (passkey flow, identity sync, blockchain mapping) is provider-agnostic.
 */
export interface AuthProviderPlugin {
  /** Must match the NextAuth provider id (i.e. `account.provider`). */
  id: string;
  /** Label shown on the login button. */
  displayName: string;
  /** Lucide icon component rendered in the login button. */
  buttonIcon: LucideIcon;
  /** Visual style of the login button. */
  buttonStyle?: 'primary' | 'outline';

  /** Returns a NextAuth provider config; called once when auth.ts boots. */
  provider: () => Provider;

  /**
   * Map the OAuth profile + user into JWT fields. Runs server-side inside
   * the `auth.ts` jwt callback when a user signs in for the first time.
   * `profile` is loosely typed because each provider returns a different
   * shape; plugin implementations cast to their own profile type.
   */
  mapJWT: (args: {
    token: JWT;
    user?: User;
    profile: Profile;
  }) => void;

  /**
   * Return true if the current session is stale and the user should be
   * forced to sign in again (e.g. token-format migration).
   */
  detectStaleSession?: (session: Session) => boolean;

  /** Mock user data for `NEXT_PUBLIC_AUTH_MODE !== 'real'`. */
  mockUser?: {
    id: string;
    username: string;
    avatarUrl: string;
    email: string;
  };
}
