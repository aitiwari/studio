
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Thermometer, 
  Brain, 
  Battery, 
  CircleAlert, 
  BotIcon,
  Mic2, 
  Waves, 
  Orbit, 
  AppWindow, 
  Wind, 
  HeartPulse, 
  PersonStanding, 
  CloudDrizzle 
} from 'lucide-react';
import type { Message, SymptomOption } from '@/types';
import { getAiTriageResponse } from './actions';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { SymptomButton } from '@/components/chat/SymptomButton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";

// Inline SVG for Lungs icon as it's not in lucide-react
const LungsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 20c-2.5-1.5-5-1.5-5-5V9c0-2.5 2-4 4-4h2c2 0 4 1.5 4 4v6c0 3.5-2.5 3.5-5 5Z" />
    <path d="M9 15c0 1.5 1 2.5 2.5 2.5S14 16.5 14 15" />
    <path d="M17.5 11c1.5 0 2.5-1 2.5-2.5S19 6 17.5 6h-1c-1 0-1.5.5-1.5 1.5" />
    <path d="M6.5 11C5 11 4 10 4 8.5S5 6 6.5 6h1C8.5 6 9 6.5 9 7.5" />
  </svg>
);


const commonSymptoms: SymptomOption[] = [
  { name: "Fever", icon: Thermometer },
  { name: "Cough", icon: LungsIcon },
  { name: "Headache", icon: Brain },
  { name: "Fatigue", icon: Battery },
  { name: "Stomach Pain", icon: CircleAlert },
  { name: "Sore Throat", icon: Mic2 },
  { name: "Nausea / Vomiting", icon: Waves },
  { name: "Dizziness", icon: Orbit },
  { name: "Skin Rash", icon: AppWindow },
  { name: "Shortness of Breath", icon: Wind },
  { name: "Chest Pain", icon: HeartPulse },
  { name: "Back Pain", icon: PersonStanding },
  { name: "Runny Nose / Congestion", icon: CloudDrizzle },
];

const MAX_CONVERSATION_TURNS = 5; 

export default function HealthAssistPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialSymptom, setInitialSymptom] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [isTriageComplete, setIsTriageComplete] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [activeQuickReplies, setActiveQuickReplies] = useState<string[] | undefined>(undefined);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    resetChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        sender: 'bot',
        text: "Hello! I'm HealthAssist. I can help you understand your symptoms. Please select a primary symptom to begin:",
        timestamp: new Date(),
      }
    ]);
    setIsLoading(false);
    setInitialSymptom(null);
    setConversationHistory([]);
    setIsTriageComplete(false);
    setCurrentTurn(0);
    setActiveQuickReplies(undefined);
  };
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: message.sender + '-' + Date.now(), timestamp: new Date() }]);
  };

  const handleSymptomSelect = async (symptomName: string) => {
    addMessage({ sender: 'user', text: symptomName });
    setInitialSymptom(symptomName);
    setIsLoading(true);
    setActiveQuickReplies(undefined); // Clear any previous quick replies
    addMessage({ sender: 'bot', text: 'Thinking...', isLoading: true });

    try {
      const aiResponse = await getAiTriageResponse(symptomName);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'bot', text: aiResponse.nextQuestion, aiResponse });
      setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
      setConversationHistory([`User: ${symptomName}`, `AI: ${aiResponse.nextQuestion}`]);
      
      if (aiResponse.urgency === 'Urgent' || aiResponse.outcome.toLowerCase().includes("seek immediate medical attention")) {
        addMessage({ sender: 'system', text: aiResponse.outcome, aiResponse });
        setIsTriageComplete(true);
        setActiveQuickReplies(undefined);
      }
    } catch (error) {
      console.error("Symptom selection error:", error);
      setMessages(prev => prev.filter(m => !m.isLoading));
      addMessage({ sender: 'bot', text: "Sorry, I encountered an error. Please try again."});
      toast({ title: "Error", description: "Could not process your request.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserResponse = async (responseText: string) => {
    if (!initialSymptom || isTriageComplete) return;

    addMessage({ sender: 'user', text: responseText });
    setIsLoading(true);
    setActiveQuickReplies(undefined); // Clear quick replies upon user response
    addMessage({ sender: 'bot', text: 'Thinking...', isLoading: true });

    const currentConversation = [...conversationHistory, `User: ${responseText}`].join('\n');

    try {
      const aiResponse = await getAiTriageResponse(initialSymptom, currentConversation);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'bot', text: aiResponse.nextQuestion, aiResponse });
      setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
      
      const newHistory = [...conversationHistory, `User: ${responseText}`, `AI: ${aiResponse.nextQuestion}`];
      setConversationHistory(newHistory);
      setCurrentTurn(prev => prev + 1);

      const isUrgent = aiResponse.urgency === 'Urgent';
      const isOutcomeFinalSounding = aiResponse.outcome.toLowerCase().includes("seek immediate medical attention") || 
                                   aiResponse.outcome.toLowerCase().includes("final recommendation") ||
                                   aiResponse.outcome.toLowerCase().includes("my assessment is");
      const hasQuestionEnded = !aiResponse.nextQuestion.trim().endsWith('?');

      if (isUrgent || isOutcomeFinalSounding || currentTurn + 1 >= MAX_CONVERSATION_TURNS || hasQuestionEnded) {
        addMessage({ sender: 'system', text: aiResponse.outcome, aiResponse });
        setIsTriageComplete(true);
        setActiveQuickReplies(undefined);
      }
    } catch (error) {
      console.error("User response error:", error);
      setMessages(prev => prev.filter(m => !m.isLoading));
      addMessage({ sender: 'bot', text: "Sorry, I encountered an error. Please try again."});
      toast({ title: "Error", description: "Could not process your request.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const showSymptomSelector = !initialSymptom && !isTriageComplete;
  const showChatInput = initialSymptom && !isTriageComplete && !isLoading;
  const showQuickReplies = activeQuickReplies && !isTriageComplete && !isLoading;


  return (
    <div className="flex flex-col h-screen bg-background max-w-4xl mx-auto shadow-2xl rounded-lg overflow-hidden">
      <header className="bg-primary text-primary-foreground p-4 flex items-center space-x-3 shadow-md">
        <BotIcon className="h-8 w-8" />
        <h1 className="text-2xl font-semibold">HealthAssist Chat</h1>
      </header>

      <ScrollArea className="flex-grow p-4 space-y-4 bg-secondary/30">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <Separator />

      {showSymptomSelector && (
        <div className="p-4 bg-background">
          <p className="text-sm text-muted-foreground mb-3 text-center">Select a symptom to start:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {commonSymptoms.map((symptom) => (
              <SymptomButton 
                key={symptom.name} 
                symptom={symptom} 
                onSelect={handleSymptomSelect}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {showQuickReplies && (
         <div className="p-4 bg-card border-t">
          <p className="text-sm text-muted-foreground mb-2 text-center">Or select a quick response:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {activeQuickReplies.map((reply) => (
              <Button
                key={reply}
                variant="outline"
                size="sm"
                onClick={() => handleUserResponse(reply)}
                disabled={isLoading}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showChatInput && (
        <ChatInput onSubmit={handleUserResponse} disabled={isLoading} />
      )}
      
      {isTriageComplete && (
        <div className="p-4 bg-background border-t text-center">
          <p className="text-sm text-muted-foreground mb-2">Triage complete. You can start a new session if needed.</p>
          <Button onClick={resetChat} variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}
