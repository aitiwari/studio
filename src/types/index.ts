import type { TriageOutput } from '@/ai/flows/ai-triage';

export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: Date;
  // Quick replies are part of TriageOutput, which is in aiResponse
  // quickReplies?: string[]; 
  aiResponse?: TriageOutput; // TriageOutput now includes optional quickReplies
  isLoading?: boolean;
}

export type SymptomOption = {
  name: string;
  icon: React.ElementType;
};
