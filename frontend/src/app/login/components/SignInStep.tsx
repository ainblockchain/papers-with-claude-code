'use client';

import { signIn } from 'next-auth/react';
import { ClaudeMark } from '@/components/shared/ClaudeMark';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { isRealAuth } from '@/lib/auth-mode';
import { AUTH_PROVIDERS } from '@/lib/auth/providers';
import { StepIndicator } from './StepIndicator';

interface SignInStepProps {
  /** Set to true after a mock-mode sign-in so the page knows to flow into PasskeyStep. */
  onMockAuthActive: () => void;
}

/**
 * Step 1 — choose a sign-in provider.
 *
 * Buttons are derived from the AUTH_PROVIDERS registry. Adding/removing a
 * provider updates the layout automatically; this component never branches
 * on a specific provider id.
 */
export function SignInStep({ onMockAuthActive }: SignInStepProps) {
  const login = useAuthStore((s) => s.login);

  const handleSignIn = (providerId: string) => {
    if (isRealAuth) {
      signIn(providerId, { redirectTo: '/login?from=oauth' });
      return;
    }
    // Mock mode: log in immediately with the plugin's mock user.
    const plugin = AUTH_PROVIDERS.find((p) => p.id === providerId);
    if (plugin?.mockUser) {
      login({ ...plugin.mockUser, provider: plugin.id });
      onMockAuthActive();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <ClaudeMark className="mx-auto" size={48} />
          <h1 className="mt-4 text-2xl font-bold text-[#111827]">Papers with Claude Code</h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Learn research papers interactively with AI
          </p>
        </div>

        <StepIndicator currentStep={1} />

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
          <div className="space-y-3">
            {AUTH_PROVIDERS.map((plugin) => {
              const Icon = plugin.buttonIcon;
              const isPrimary = (plugin.buttonStyle ?? 'primary') === 'primary';
              return (
                <Button
                  key={plugin.id}
                  onClick={() => handleSignIn(plugin.id)}
                  variant={isPrimary ? 'default' : 'outline'}
                  className={
                    isPrimary
                      ? 'w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11'
                      : 'w-full h-11 border-[#E5E7EB] hover:bg-[#F9FAFB]'
                  }
                >
                  <Icon className={`h-5 w-5 mr-2 ${isPrimary ? '' : 'text-[#6B7280]'}`} />
                  Sign in with {plugin.displayName}
                </Button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-center text-[#6B7280]">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
