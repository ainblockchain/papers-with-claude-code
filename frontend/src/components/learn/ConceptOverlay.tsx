'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';

export function ConceptOverlay() {
  const { stages, currentStageIndex, activeConceptId, setActiveConcept } = useLearningStore();

  const currentStage = stages[currentStageIndex];
  if (!currentStage || !activeConceptId) return null;

  const concept = currentStage.concepts.find((c) => c.id === activeConceptId);
  if (!concept) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1F2937]">
          <h3 className="text-white font-bold text-sm">{concept.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveConcept(null)}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <p className="text-sm text-[#374151] whitespace-pre-wrap">{concept.content}</p>
        </div>
        <div className="px-4 pb-4">
          <Button
            size="sm"
            onClick={() => setActiveConcept(null)}
            className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}
