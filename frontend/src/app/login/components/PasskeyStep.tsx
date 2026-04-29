'use client';

import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { ClaudeMark } from '@/components/shared/ClaudeMark';
import { Button } from '@/components/ui/button';
import { isPasskeySupported, type PasskeyInfo } from '@/lib/ain/passkey';
import { StepIndicator } from './StepIndicator';

interface PasskeyStepProps {
  user: { username: string; email: string; avatarUrl: string };
  existingPasskey: PasskeyInfo | null;
  onRegister: () => void;
  onVerify: () => void;
  processing: boolean;
  error: string | null;
}

/** Verify existing or register new passkey (passkey is mandatory). */
export function PasskeyStep({
  user,
  existingPasskey,
  onRegister,
  onVerify,
  processing,
  error,
}: PasskeyStepProps) {
  const supportsPasskey = typeof window !== 'undefined' && isPasskeySupported();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <ClaudeMark className="mx-auto" size={48} />
          <h1 className="mt-4 text-2xl font-bold text-[#111827]">
            {existingPasskey ? 'Verify your Passkey' : 'Set up your AIN Wallet'}
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            {existingPasskey
              ? 'Confirm your identity with your registered passkey.'
              : 'Register a passkey to create your on-chain wallet. No seed phrases needed.'}
          </p>
        </div>

        <StepIndicator currentStep={2} />

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
          {/* User info */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E5E7EB]">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.username}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#FF9D00] flex items-center justify-center text-white text-sm font-bold">
                {user.username[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#111827]">{user.username}</p>
              <p className="text-xs text-[#6B7280]">{user.email}</p>
            </div>
          </div>

          {supportsPasskey ? (
            <>
              {existingPasskey ? (
                <Button
                  onClick={onVerify}
                  disabled={processing}
                  className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 mr-2" />
                  )}
                  {processing ? 'Verifying...' : 'Verify Passkey'}
                </Button>
              ) : (
                <Button
                  onClick={onRegister}
                  disabled={processing}
                  className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Fingerprint className="h-5 w-5 mr-2" />
                  )}
                  {processing ? 'Registering...' : 'Register Passkey'}
                </Button>
              )}
              {error && <p className="mt-3 text-xs text-center text-red-500">{error}</p>}
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[#6B7280]">
                Your browser does not support passkeys.
              </p>
              <p className="mt-2 text-xs text-[#9CA3AF]">
                Please use a modern browser (Chrome, Safari, Edge) to continue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
