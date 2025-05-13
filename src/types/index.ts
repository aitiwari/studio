import type { TriageOutput } from '@/ai/flows/ai-triage';

export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: Date;
  quickReplies?: string[];
  aiResponse?: TriageOutput;
  isLoading?: boolean;
}

export type SymptomOption = {
  name: string;
  icon: React.ElementType;
};
