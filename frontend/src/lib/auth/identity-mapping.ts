/**
 * Save a (userId → passkey publicKey) mapping to the AIN blockchain.
 *
 * Fire-and-forget. A 409 (publicKey already registered) is treated as success
 * because the goal is "this passkey is on chain" and a duplicate proves that.
 *
 * The optional `avatarUrl` is stored alongside the key so other clients
 * (e.g. course completers list) can render avatars without assuming a
 * specific OAuth provider.
 */
export async function saveIdentityMapping(args: {
  userId: string;
  publicKey: string;
  provider: string;
  avatarUrl?: string;
}): Promise<void> {
  try {
    await fetch('/api/ain/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch {
    // Best effort — mapping will be created on next login if this fails.
  }
}
