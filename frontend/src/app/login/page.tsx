'use client';

import { useRouter } from 'next/navigation';
import { Github } from 'lucide-react';
import { ClaudeMark } from '@/components/shared/ClaudeMark';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const handleGitHubLogin = () => {
    // 🔌 ADAPTER — Replace with real GitHub OAuth flow
    login({
      id: 'mock-user',
      username: 'developer',
      avatarUrl: '',
      email: 'dev@example.com',
    });
    router.push('/explore');
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E5E7EB]">
          <Button
            onClick={handleGitHubLogin}
            className="w-full bg-[#24292e] hover:bg-[#24292e]/90 text-white h-11"
          >
            <Github className="h-5 w-5 mr-2" />
            Sign in with GitHub
          </Button>
          <p className="mt-4 text-xs text-center text-[#6B7280]">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
