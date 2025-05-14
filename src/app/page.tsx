
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
  CloudDrizzle,
  PanelLeft // For SidebarTrigger if not default
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
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

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

function HealthAssistChatContent() {
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
  const [showAppointmentDecisionButtons, setShowAppointmentDecisionButtons] = useState(false);
  const [showSymptomSelectionInChatArea, setShowSymptomSelectionInChatArea] = useState(true);


  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { toast } = useToast();
  const { state: sidebarState, isMobile } = useSidebar();

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
        text: "Welcome to HealthAssist! Please select a symptom below to begin your triage.",
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
    setShowAppointmentDecisionButtons(false);
    setShowSymptomSelectionInChatArea(true);
  };
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: message.sender + '-' + Date.now(), timestamp: new Date() }]);
  };

  const handleSymptomSelect = async (symptomName: string) => {
    addMessage({ sender: 'user', text: symptomName });
    setInitialSymptom(symptomName);
    setShowSymptomSelectionInChatArea(false); 
    setIsLoading(true);
    setActiveQuickReplies(undefined); 
    setShowAppointmentDecisionButtons(false);
    // Remove welcome message if it's the first user action and symptom selection is inline
    setMessages(prev => {
      const welcomeMessageIndex = prev.findIndex(msg => msg.id.startsWith('welcome-'));
      if (welcomeMessageIndex !== -1 && prev.length > 1 && prev[welcomeMessageIndex].text.includes("select a symptom below")) {
        // Keep welcome message if it guides to inline symptom selection.
        // If other messages exist or it was a different welcome message, then filter.
        // For now, let's just make sure we don't remove it if it's the *only* message.
        // The user has just clicked a symptom, so the welcome message has served its purpose
        // if it was guiding to select a symptom *below*.
        // Let's assume we always want to keep the welcome message.
      }
      return prev;
    });
    addMessage({ sender: 'bot', text: 'Thinking...', isLoading: true });

    try {
      const aiResponse = await getAiTriageResponse(symptomName);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'bot', text: aiResponse.nextQuestion, aiResponse });
      setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
      setConversationHistory([`User: ${symptomName}`, `AI: ${aiResponse.nextQuestion}`]);
      
      if (aiResponse.urgency === 'Urgent') {
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
    if (!initialSymptom || isTriageComplete || isLoading || awaitingEmailForBooking || showAppointmentDecisionButtons || showSymptomSelectionInChatArea) return;

    addMessage({ sender: 'user', text: responseText });
    const currentActiveQuickReplies = activeQuickReplies; 
    setActiveQuickReplies(undefined); 

    if (!showAppointmentDecisionButtons && (responseText.toLowerCase().includes("schedule") || responseText.toLowerCase().includes("book") || responseText.toLowerCase().includes("help schedule"))) {
        const relevantContextMessage = messages.slice().reverse().find(
            m => (m.sender === 'bot' || m.sender === 'system') && m.aiResponse?.urgency === 'Appointment Needed'
        );
        const wasQuickReply = currentActiveQuickReplies?.map(qr => qr.toLowerCase()).includes(responseText.toLowerCase());

        if (relevantContextMessage || wasQuickReply) {
            setAwaitingEmailForBooking(true);
            addMessage({ sender: 'bot', text: "Okay, to help schedule an appointment, please provide your email address. If you have a preferred date or time (e.g., 'next Tuesday morning' or 'tomorrow around 2 PM'), please include it with your email or as a separate message right after." });
            setConversationHistory(prev => [...prev, `User: ${responseText}`, `AI: Please provide your email address and any date/time preferences.`]);
            return; 
        }
    }

    if (!showAppointmentDecisionButtons && responseText.toLowerCase().includes("i'll manage it")) { 
        const relevantContextMessage = messages.slice().reverse().find(
            m => (m.sender === 'bot' || m.sender === 'system') && m.aiResponse?.urgency === 'Appointment Needed'
        );
        const wasQuickReply = currentActiveQuickReplies?.map(qr => qr.toLowerCase()).includes(responseText.toLowerCase());

        if (relevantContextMessage || wasQuickReply) {
            addMessage({ sender: 'bot', text: "Okay. Please monitor your symptoms and contact a healthcare provider if they worsen or if you have further concerns. You can start a new chat if anything changes." });
            setIsTriageComplete(true);
            setConversationHistory(prev => [...prev, `User: ${responseText}`, `AI: Okay. Please monitor your symptoms...`]);
            return; 
        }
    }
    
    setIsLoading(true);
    addMessage({ sender: 'bot', text: 'Thinking...', isLoading: true });

    const currentConversation = [...conversationHistory, `User: ${responseText}`].join('\n');

    try {
      const aiResponse = await getAiTriageResponse(initialSymptom, currentConversation);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'bot', text: aiResponse.nextQuestion, aiResponse });
      
      const newHistory = [...conversationHistory, `User: ${responseText}`, `AI: ${aiResponse.nextQuestion}`];
      setConversationHistory(newHistory);
      setCurrentTurn(prev => prev + 1);

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
      
      let shouldCompleteAiQuestioningPhase = false;

      if (isCurrentlyAskingAboutBooking) {
        setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
        shouldCompleteAiQuestioningPhase = false; 
      } else if (currentAiResponse.urgency === 'Urgent') {
        shouldCompleteAiQuestioningPhase = true;
      } else if (currentTurn + 1 >= MAX_CONVERSATION_TURNS) {
        shouldCompleteAiQuestioningPhase = true;
      } else if (currentAiResponse.urgency === 'Appointment Needed') {
        shouldCompleteAiQuestioningPhase = true;
      } else { 
        if (isOutcomeFinalSounding || (hasQuestionEnded && currentAiResponse.nextQuestion.trim() !== "")) {
          shouldCompleteAiQuestioningPhase = true;
        }
      }

      if (shouldCompleteAiQuestioningPhase) {
        addMessage({ sender: 'system', text: currentAiResponse.outcome, aiResponse: currentAiResponse });

        if (currentAiResponse.urgency === 'Appointment Needed' && !isCurrentlyAskingAboutBooking) {
          setShowAppointmentDecisionButtons(true);
          setActiveQuickReplies(undefined); 
          setIsTriageComplete(false); 
        } else {
          setIsTriageComplete(true);
          setActiveQuickReplies(undefined);
        }
      } else if (!isCurrentlyAskingAboutBooking) {
         setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
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
  
    const bookingConversationSummary = [...conversationHistory, `User (Email/Preferences): ${emailForBooking}`].join('\n');
    let userEmail = emailForBooking;
    let preferredDate;
    const dateKeywords = [" on ", " for ", " around ", " next ", " tomorrow"];
    for (const keyword of dateKeywords) {
        if (emailForBooking.toLowerCase().includes(keyword)) {
            const parts = emailForBooking.split(new RegExp(keyword, "i"));
            if (parts.length > 1) {
                userEmail = parts[0].trim(); 
                preferredDate = parts.slice(1).join(keyword).trim(); 
                if (preferredDate.toLowerCase().startsWith(keyword.trim())) {
                   preferredDate = preferredDate.substring(keyword.trim().length).trim();
                }
                if (!userEmail.includes('@')) { 
                    userEmail = emailForBooking; 
                    preferredDate = parts.slice(0).join(keyword).trim();
                    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                    const emailMatch = preferredDate.match(emailRegex);
                    if (emailMatch) {
                        userEmail = emailMatch[0];
                        preferredDate = preferredDate.replace(emailMatch[0], "").trim();
                    }
                }
                break;
            }
        }
    }
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const finalEmailMatch = userEmail.match(emailRegex);
    if (finalEmailMatch) {
        userEmail = finalEmailMatch[0];
    }

    const bookingInput: BookAppointmentInput = {
      userEmail: userEmail, 
      symptoms: initialSymptom,
      conversationSummary: bookingConversationSummary,
      preferredDate: preferredDate,
    };

    try {
      const bookingResponse = await bookAppointmentAction(bookingInput);
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'system', text: bookingResponse.confirmationMessage }); 
      
      setAwaitingEmailForBooking(false);
      setEmailForBooking('');
      setIsTriageComplete(true); 
      setActiveQuickReplies(undefined);
      setShowAppointmentDecisionButtons(false);
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
  
  const selectedSymptomData = initialSymptom ? commonSymptoms.find(s => s.name === initialSymptom) : null;

  const showQuickRepliesInChat = activeQuickReplies && activeQuickReplies.length > 0 && !isTriageComplete && !isLoading && !awaitingEmailForBooking && !showAppointmentDecisionButtons && !showSymptomSelectionInChatArea;
  const showChatInputInChat = initialSymptom && !isTriageComplete && !isLoading && !showQuickRepliesInChat && !awaitingEmailForBooking && !showAppointmentDecisionButtons && !showSymptomSelectionInChatArea;


  return (
    <>
      <Sidebar side="left" collapsible="icon" className="border-r hidden md:flex md:flex-col bg-card">
        <SidebarHeader className="p-4 border-b flex items-center justify-center">
           <BotIcon className="h-7 w-7 text-primary group-[[data-sidebar=sidebar][data-collapsible=icon]]:block mx-auto" />
        </SidebarHeader>
        <SidebarContent className="p-0">
          {initialSymptom && (
             <div className="p-4 space-y-3">
               <p className="text-sm font-medium text-foreground group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">Current Triage:</p>
               <div className={`flex items-center gap-2 p-2 border rounded-md ${sidebarState === 'collapsed' && !isMobile ? 'justify-center' : ''}`}>
                 {selectedSymptomData?.icon && <selectedSymptomData.icon className={`h-6 w-6 text-primary ${sidebarState === 'collapsed' && !isMobile ? '' : 'h-5 w-5'}`} />}
                 <span className="text-sm group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">{initialSymptom}</span>
               </div>
               <Button variant="outline" size="sm" onClick={resetChat} className="w-full group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">
                 Start New Triage
               </Button>
                {sidebarState === 'collapsed' && !isMobile && (
                    <Button variant="outline" size="icon" onClick={resetChat} className="w-full mt-2">
                        <PanelLeft className="h-4 w-4" /> 
                    </Button>
                )}
             </div>
          )}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-col h-screen bg-background shadow-xl overflow-hidden">
          <header className="bg-primary text-primary-foreground p-4 flex items-center space-x-3 shadow-md">
            <SidebarTrigger className="mr-1" />
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

          {showSymptomSelectionInChatArea && (
            <div className="p-4 border-t bg-card">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Select your primary symptom:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
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

          {awaitingEmailForBooking && !isTriageComplete && (
            <div className="p-4 border-t bg-card space-y-3">
              <Label htmlFor="emailForBookingInput" className="text-sm font-medium text-foreground">
                Enter your email address. You can also mention preferred dates/times (e.g., "myemail@example.com for next Tuesday morning"):
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="emailForBookingInput"
                  type="text"
                  value={emailForBooking}
                  onChange={(e) => setEmailForBooking(e.target.value)}
                  placeholder="your.email@example.com, preferred time..."
                  disabled={isLoadingBooking}
                  className="flex-grow rounded-full shadow-sm"
                  aria-label="Email and preferences for booking"
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

          {showAppointmentDecisionButtons && !awaitingEmailForBooking && !isTriageComplete && (
            <div className="p-4 bg-card border-t">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                An appointment is recommended. What would you like to do?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => {
                    setShowAppointmentDecisionButtons(false);
                    setAwaitingEmailForBooking(true);
                    addMessage({ sender: 'user', text: "I'd like to book an appointment." });
                    addMessage({ sender: 'bot', text: "Okay, to help schedule an appointment, please provide your email address. If you have a preferred date or time (e.g., 'next Tuesday morning' or 'tomorrow around 2 PM'), please include it with your email or as a separate message right after." });
                    setConversationHistory(prev => [...prev, `User: Wants to book appointment`, `AI: Please provide your email address and any date/time preferences.`]);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  Book Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    addMessage({ sender: 'user', text: "I'll manage the appointment myself." });
                    addMessage({ sender: 'bot', text: "Okay. Please monitor your symptoms and contact a healthcare provider if they worsen or if you have further concerns. You can start a new chat if anything changes." });
                    setShowAppointmentDecisionButtons(false);
                    setIsTriageComplete(true);
                    setConversationHistory(prev => [...prev, `User: I'll manage it`, `AI: Okay. Please monitor your symptoms...`]);
                  }}
                  className="shadow-md"
                >
                  I'll Manage Myself
                </Button>
              </div>
            </div>
          )}

          {showQuickRepliesInChat && (
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

          {showChatInputInChat && (
            <ChatInput onSubmit={handleUserResponse} disabled={isLoading} />
          )}
          
          {isTriageComplete && !awaitingEmailForBooking && !showAppointmentDecisionButtons && !showSymptomSelectionInChatArea && (
            <div className="p-4 bg-background border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">Triage complete. You can start over by using the sidebar or clicking below.</p>
              <Button onClick={resetChat} variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Start New Triage
              </Button>
            </div>
          )}
        </div>
      </SidebarInset>
    </>
  );
}

export default function HealthAssistPage() {
  return (
    <SidebarProvider defaultOpen={true}>
      <HealthAssistChatContent />
    </SidebarProvider>
  );
}
