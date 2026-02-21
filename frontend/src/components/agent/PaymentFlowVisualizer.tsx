'use client';

import { ArrowRight, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAgentStore, type PaymentFlowStep } from '@/stores/useAgentStore';

const FLOW_STEPS = [
  { label: 'Request', description: 'API call to course stage' },
  { label: '402 Received', description: 'Payment required response' },
  { label: 'MCP Sign', description: 'Agent signs via MCP tool' },
  { label: 'Settle', description: 'On-chain settlement' },
  { label: 'Confirmed', description: 'Transaction confirmed' },
] as const;

function StepDot({
  index,
  currentStep,
  active,
}: {
  index: number;
  currentStep: PaymentFlowStep;
  active: boolean;
}) {
  const stepNum = index + 1;
  const isComplete = currentStep >= stepNum;
  const isCurrent = currentStep === stepNum && active;

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div
        className={`
          relative flex items-center justify-center h-9 w-9 rounded-full border-2 text-xs font-bold transition-all duration-500
          ${
            isComplete
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'bg-[#16162a] border-gray-700 text-gray-500'
          }
          ${isCurrent ? 'ring-2 ring-green-400/40 animate-pulse' : ''}
        `}
      >
        {stepNum}
      </div>
      <span
        className={`text-[10px] font-medium text-center leading-tight transition-colors duration-300 ${
          isComplete ? 'text-green-400' : 'text-gray-500'
        }`}
      >
        {FLOW_STEPS[index].label}
      </span>
      <span className="text-[9px] text-gray-600 text-center leading-tight hidden sm:block">
        {FLOW_STEPS[index].description}
      </span>
    </div>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return (
    <div className="flex items-center pb-6 sm:pb-8">
      <ArrowRight
        className={`h-3 w-3 transition-colors duration-300 ${
          active ? 'text-green-400' : 'text-gray-700'
        }`}
      />
    </div>
  );
}

export function PaymentFlowVisualizer() {
  const { paymentFlowStep, paymentFlowActive, simulatePaymentFlow, resetPaymentFlow } =
    useAgentStore();

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-100">x402 Payment Flow</CardTitle>
          <div className="flex items-center gap-2">
            {paymentFlowStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPaymentFlow}
                className="h-7 text-xs text-gray-400 hover:text-white"
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={simulatePaymentFlow}
              disabled={paymentFlowActive}
              className="h-7 bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-black text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Simulate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-1">
          {FLOW_STEPS.map((_, i) => (
            <div key={i} className="flex items-start gap-1">
              <StepDot index={i} currentStep={paymentFlowStep} active={paymentFlowActive} />
              {i < FLOW_STEPS.length - 1 && (
                <StepConnector active={paymentFlowStep > i + 1} />
              )}
            </div>
          ))}
        </div>
        {paymentFlowStep === 5 && !paymentFlowActive && (
          <div className="mt-4 p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <span className="text-xs text-green-400">
              Payment confirmed on-chain. Course stage unlocked.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
