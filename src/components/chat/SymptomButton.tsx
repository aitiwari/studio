'use client';

import type { SymptomOption } from '@/types';
import { Button } from '@/components/ui/button';

interface SymptomButtonProps {
  symptom: SymptomOption;
  onSelect: (symptomName: string) => void;
  disabled?: boolean;
}

export function SymptomButton({ symptom, onSelect, disabled }: SymptomButtonProps) {
  const IconComponent = symptom.icon;
  return (
    <Button
      variant="outline"
      className="flex flex-col items-center justify-center h-24 w-24 p-2 shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out bg-card text-card-foreground hover:bg-secondary"
      onClick={() => onSelect(symptom.name)}
      disabled={disabled}
      aria-label={`Select symptom: ${symptom.name}`}
    >
      <IconComponent className="h-8 w-8 mb-1 text-primary" />
      <span className="text-xs text-center">{symptom.name}</span>
    </Button>
  );
}
