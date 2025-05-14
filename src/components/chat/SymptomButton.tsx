
'use client';

import type { SymptomOption } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SymptomButtonProps {
  symptom: SymptomOption;
  onSelect: (symptomName: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SymptomButton({ symptom, onSelect, disabled, className }: SymptomButtonProps) {
  const IconComponent = symptom.icon;
  return (
    <Button
      variant="outline"
      className={cn(
        "flex flex-col items-center justify-center h-24 w-24 p-2 shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out bg-card text-card-foreground hover:bg-secondary",
        "group-[[data-sidebar=sidebar][data-collapsible=icon]]:h-12 group-[[data-sidebar=sidebar][data-collapsible=icon]]:w-12 group-[[data-sidebar=sidebar][data-collapsible=icon]]:p-1 group-[[data-sidebar=sidebar][data-collapsible=icon]]:justify-center",
        className
      )}
      onClick={() => onSelect(symptom.name)}
      disabled={disabled}
      aria-label={`Select symptom: ${symptom.name}`}
    >
      <IconComponent className={cn("h-8 w-8 mb-1 text-primary", "group-[[data-sidebar=sidebar][data-collapsible=icon]]:h-6 group-[[data-sidebar=sidebar][data-collapsible=icon]]:w-6 group-[[data-sidebar=sidebar][data-collapsible=icon]]:mb-0")} />
      <span className="text-xs text-center break-words group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">{symptom.name}</span>
    </Button>
  );
}

