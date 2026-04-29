import { ArrowRight, Fingerprint, LogIn, ShieldCheck } from 'lucide-react';

/** Step progress indicator (1. Sign In → 2. Passkey) */
export function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          currentStep === 1
            ? 'bg-[#24292e] text-white'
            : 'bg-green-100 text-green-700'
        }`}
      >
        {currentStep > 1 ? <ShieldCheck className="h-3 w-3" /> : <LogIn className="h-3 w-3" />}
        1. Sign In
      </div>
      <ArrowRight className="h-3 w-3 text-[#9CA3AF]" />
      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          currentStep === 2
            ? 'bg-[#24292e] text-white'
            : 'bg-[#E5E7EB] text-[#6B7280]'
        }`}
      >
        <Fingerprint className="h-3 w-3" />
        2. Passkey
      </div>
    </div>
  );
}
