'use client';

import {
  type PaymentChainId,
  getEnabledChains,
  formatChainAmount,
} from '@/lib/payment/chains';

interface ChainSelectorProps {
  selectedChain: PaymentChainId;
  onSelect: (chain: PaymentChainId) => void;
  paymentType: 'coursePurchase' | 'stageUnlock';
  disabled?: boolean;
}

export function ChainSelector({
  selectedChain,
  onSelect,
  paymentType,
  disabled,
}: ChainSelectorProps) {
  const chains = getEnabledChains();

  return (
    <div className="flex gap-2">
      {chains.map((chain) => {
        const isSelected = chain.id === selectedChain;
        return (
          <button
            key={chain.id}
            onClick={() => onSelect(chain.id)}
            disabled={disabled}
            className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
              isSelected
                ? 'border-[#FF9D00] bg-[#FF9D00]/10'
                : 'border-gray-700 bg-[#16162a] hover:border-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{chain.icon}</span>
              <span
                className={`text-xs font-medium ${
                  isSelected ? 'text-[#FF9D00]' : 'text-gray-400'
                }`}
              >
                {chain.name}
              </span>
            </div>
            <p
              className={`text-sm font-bold mt-1 ${
                isSelected ? 'text-white' : 'text-gray-500'
              }`}
            >
              {formatChainAmount(chain.id, paymentType)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
