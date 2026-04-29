import type { AuthProviderPlugin } from '../provider-types';
import githubPlugin from './github';

/**
 * Registered auth providers.
 *
 * To add a provider: create `lib/auth/providers/<name>.ts` and add it here.
 * To remove a provider: drop it from this array and delete its file.
 *
 * The order here is the order login buttons appear on `/login`.
 */
export const AUTH_PROVIDERS = [githubPlugin] as const;

/** Union of all registered provider ids. Auto-expands when you add a plugin. */
export type AuthProviderId = (typeof AUTH_PROVIDERS)[number]['id'];

/** Look up a provider plugin by id. */
export function findAuthProvider(
  id: string | undefined | null,
): AuthProviderPlugin | undefined {
  if (!id) return undefined;
  return AUTH_PROVIDERS.find((p) => p.id === id);
}
