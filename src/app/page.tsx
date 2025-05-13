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
import { getAiTriageResponse, bookAppointmentAction } from './actions';
import type { BookAppointmentInput } from '@/ai/flows/book-appointment-flow';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { SymptomButton } from '@/components/chat/SymptomButton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const [awaitingEmailForBooking, setAwaitingEmailForBooking] = useState(false);
  const [emailForBooking, setEmailForBooking] = useState('');
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);


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
    setAwaitingEmailForBooking(false);
    setEmailForBooking('');
    setIsLoadingBooking(false);
  };
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: message.sender + '-' + Date.now(), timestamp: new Date() }]);
  };

  const handleSymptomSelect = async (symptomName: string) => {
    addMessage({ sender: 'user', text: symptomName });
    setInitialSymptom(symptomName);
    setIsLoading(true);
    setActiveQuickReplies(undefined); 
    addMessage({ sender: 'bot', text: 'Thinking...', isLoading: true });

    try {
      const aiResponse = await getAiTriageResponse(symptomName);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'bot', text: aiResponse.nextQuestion, aiResponse });
      setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
      setConversationHistory([`User: ${symptomName}`, `AI: ${aiResponse.nextQuestion}`]);
      
      if (aiResponse.urgency === 'Urgent') { // Only complete for 'Urgent' here, Appointment Needed has a flow.
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
    if (!initialSymptom || isTriageComplete || awaitingEmailForBooking && !isLoadingBooking) return;

    addMessage({ sender: 'user', text: responseText });

    const latestBotMessage = messages.filter(m => m.sender === 'bot' && m.aiResponse).pop();
    const latestBotAiResponse = latestBotMessage?.aiResponse;

    if (latestBotAiResponse?.urgency === 'Appointment Needed' && 
        (responseText.toLowerCase().includes("schedule") || responseText.toLowerCase().includes("book") || responseText.toLowerCase().includes("help schedule"))) {
      setAwaitingEmailForBooking(true);
      setActiveQuickReplies(undefined); 
      addMessage({ sender: 'bot', text: "Okay, to help schedule an appointment, please provide your email address below." });
      setConversationHistory(prev => [...prev, `User: ${responseText}`, `AI: Please provide your email address.`]);
      setIsLoading(false); 
      return; 
    }
    
    setIsLoading(true);
    setActiveQuickReplies(undefined); 
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

      // Determine if triage should be marked complete
      const currentAiResponse = aiResponse;
      const isOutcomeFinalSounding = currentAiResponse.outcome.toLowerCase().includes("seek immediate medical attention") ||
                                   currentAiResponse.outcome.toLowerCase().includes("final recommendation") ||
                                   currentAiResponse.outcome.toLowerCase().includes("my assessment is");
      const hasQuestionEnded = !currentAiResponse.nextQuestion.trim().endsWith('?');

      const isCurrentlyAskingAboutBooking = (currentAiResponse.urgency === 'Appointment Needed') &&
                                        (currentAiResponse.nextQuestion.toLowerCase().includes("schedule") ||
                                         currentAiResponse.nextQuestion.toLowerCase().includes("book") ||
                                         currentAiResponse.nextQuestion.toLowerCase().includes("assistance") ||
                                         currentAiResponse.nextQuestion.toLowerCase().includes("manage this yourself"));
      
      let shouldCompleteTriage = false;

      if (isCurrentlyAskingAboutBooking) {
        // If AI is currently asking about booking, do not complete triage yet.
        // Let the user respond to the booking question.
        shouldCompleteTriage = false;
      } else if (currentAiResponse.urgency === 'Urgent') {
        shouldCompleteTriage = true;
      } else if (currentTurn + 1 >= MAX_CONVERSATION_TURNS) {
        shouldCompleteTriage = true;
      } else if (currentAiResponse.urgency === 'Appointment Needed') {
        // Not asking about booking, but urgency is Appointment Needed.
        // This means user likely declined help, or AI is giving a follow-up.
        // Complete if conversation seems over (e.g. AI gives empty/non-question).
        if (hasQuestionEnded || currentAiResponse.nextQuestion.trim() === "") {
          shouldCompleteTriage = true;
        }
        // Also, if the outcome is very final (and not asking about booking), complete.
        if (isOutcomeFinalSounding) { 
            shouldCompleteTriage = true;
        }
      } else { // Non-Urgent
        if (isOutcomeFinalSounding || (hasQuestionEnded && currentAiResponse.nextQuestion.trim() !== "")) {
          shouldCompleteTriage = true;
        }
      }

      if (shouldCompleteTriage) {
        addMessage({ sender: 'system', text: currentAiResponse.outcome, aiResponse: currentAiResponse });
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

  const handleEmailSubmitForBooking = async () => {
    if (!emailForBooking.trim() || !initialSymptom) {
      toast({ title: "Email Required", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsLoadingBooking(true);
    addMessage({ sender: 'user', text: `My email for booking: ${emailForBooking}` });
    addMessage({ sender: 'bot', text: 'Attempting to book your appointment...', isLoading: true });
  
    const bookingConversationSummary = conversationHistory.join('\n') + `\nUser: My email is ${emailForBooking}`;

    const bookingInput: BookAppointmentInput = {
      userEmail: emailForBooking,
      symptoms: initialSymptom,
      conversationSummary: bookingConversationSummary,
    };

    try {
      const bookingResponse = await bookAppointmentAction(bookingInput);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'system', text: bookingResponse.confirmationMessage }); 
      
      setAwaitingEmailForBooking(false);
      setEmailForBooking('');
      setIsTriageComplete(true); 
      setActiveQuickReplies(undefined);
      setConversationHistory(prev => [...prev, `AI: ${bookingResponse.confirmationMessage}`]);


    } catch (error) {
      console.error("Booking submission error:", error);
      setMessages(prev => prev.filter(m => !m.isLoading));
      addMessage({ sender: 'bot', text: "Sorry, there was an error trying to book your appointment. Please try again later or contact a clinic directly."});
      toast({ title: "Booking Error", description: "Could not book the appointment at this time.", variant: "destructive" });
    } finally {
      setIsLoadingBooking(false);
    }
  };
  
  const showSymptomSelector = !initialSymptom && !isTriageComplete && !awaitingEmailForBooking;
  const showQuickReplies = activeQuickReplies && activeQuickReplies.length > 0 && !isTriageComplete && !isLoading && !awaitingEmailForBooking;
  const showChatInput = initialSymptom && !isTriageComplete && !isLoading && !showQuickReplies && !awaitingEmailForBooking;


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

      {awaitingEmailForBooking && !isTriageComplete && (
        <div className="p-4 border-t bg-card space-y-3">
          <Label htmlFor="emailForBookingInput" className="text-sm font-medium text-foreground">
            Enter your email address for appointment scheduling:
          </Label>
          <div className="flex items-center space-x-2">
            <Input
              id="emailForBookingInput"
              type="email"
              value={emailForBooking}
              onChange={(e) => setEmailForBooking(e.target.value)}
              placeholder="your.email@example.com"
              disabled={isLoadingBooking}
              className="flex-grow rounded-full shadow-sm"
              aria-label="Email for booking"
            />
            <Button 
              onClick={handleEmailSubmitForBooking} 
              disabled={isLoadingBooking || !emailForBooking.trim()}
              className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoadingBooking ? "Submitting..." : "Submit Email"}
            </Button>
          </div>
        </div>
      )}

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
          <p className="text-sm text-muted-foreground mb-2 text-center">Select a response:</p>
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
      
      {isTriageComplete && !awaitingEmailForBooking && (
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
