'use client';

import { useState, useEffect } from 'react';

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface PasskeyInfo {
  credentialId: string;
  publicKey: string;
  ainAddress: string;
}

export default function AuthGate() {
  const [session, setSession] = useState<{ user?: SessionUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [passkeyInfo, setPasskeyInfo] = useState<PasskeyInfo | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
    const stored = localStorage.getItem('passkey_info');
    if (stored) {
      try {
        setPasskeyInfo(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setSession(data && data.user ? data : null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    // Dynamic import of next-auth to avoid SSR issues
    const { signIn } = await import('next-auth/react');
    signIn('github');
  }

  async function handleSignOut() {
    const { signOut } = await import('next-auth/react');
    signOut();
  }

  function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const b of bytes) {
      str += String.fromCharCode(b);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function deriveAinAddress(publicKeyBytes: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyBytes);
    const hashHex = bufferToHex(hashBuffer);
    return '0x' + hashHex.slice(-40);
  }

  async function handleRegisterPasskey() {
    setRegistering(true);
    setError(null);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'AIN Debug Frontend',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(session?.user?.email || 'user'),
            name: session?.user?.email || 'user',
            displayName: session?.user?.name || 'User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256 (P-256)
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Passkey registration was cancelled');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyDer = response.getPublicKey?.();

      const credentialId = bufferToBase64url(credential.rawId);
      let publicKeyHex = '';
      let ainAddress = '';

      if (publicKeyDer) {
        publicKeyHex = bufferToHex(publicKeyDer);
        ainAddress = await deriveAinAddress(publicKeyDer);
      } else {
        // Fallback: derive from attestationObject
        const attestHex = bufferToHex(response.attestationObject);
        ainAddress = '0x' + attestHex.slice(0, 40);
        publicKeyHex = attestHex.slice(0, 130);
      }

      const info: PasskeyInfo = {
        credentialId,
        publicKey: publicKeyHex,
        ainAddress,
      };

      localStorage.setItem('passkey_info', JSON.stringify(info));
      setPasskeyInfo(info);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Authentication</h2>
        <p className="text-gray-400 mb-4">Sign in with GitHub to get started.</p>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg transition-colors border border-gray-700"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Authentication</h2>

      <div className="flex items-center gap-4 mb-5">
        {session.user.image && (
          <img
            src={session.user.image}
            alt="avatar"
            className="w-10 h-10 rounded-full border border-gray-700"
          />
        )}
        <div>
          <p className="text-white font-medium">{session.user.name}</p>
          <p className="text-gray-400 text-sm">{session.user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="ml-auto text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Passkey Registration</h3>

        {passkeyInfo ? (
          <div className="space-y-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Credential ID</p>
              <p className="text-sm text-gray-300 font-mono break-all">
                {passkeyInfo.credentialId}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Public Key</p>
              <p className="text-sm text-gray-300 font-mono break-all">
                {passkeyInfo.publicKey.slice(0, 64)}...
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Derived AIN Address</p>
              <p className="text-sm text-green-400 font-mono">{passkeyInfo.ainAddress}</p>
            </div>
            <button
              onClick={handleRegisterPasskey}
              disabled={registering}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-2"
            >
              Re-register Passkey
            </button>
          </div>
        ) : (
          <button
            onClick={handleRegisterPasskey}
            disabled={registering}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            {registering && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {registering ? 'Registering...' : 'Register Passkey'}
          </button>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
