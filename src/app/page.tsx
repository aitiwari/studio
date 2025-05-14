
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Thermometer, 
  Brain, 
  Battery, 
  CircleAlert, 
  Mic2, 
  Waves, 
  Orbit, 
  AppWindow, 
  Wind, 
  HeartPulse, 
  PersonStanding, 
  CloudDrizzle,
  PanelLeft,
  ListChecks, 
  ShieldAlert, 
  Heart, 
  Bandage, 
  Bone,    
  Flame,   
  Droplets, 
  Zap,     
  Frown,   
  Bed,     
  ShieldQuestion, 
  Pill,    
  AlertTriangle, 
  FileSearch,   
  HelpCircle, 
  UserCircle, 
  Menu, 
  Search,
  Info, // Added for "About Us"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

// Inline SVG for Lungs icon
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

// Custom SVG for Dental Icon
const ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.365 3.412A2 2 0 0 1 10.999 3h2a2 2 0 0 1 1.634.412l4.366 4.588A2 2 0 0 1 19 9.588v.824a2 2 0 0 1-.586 1.414L16 14.24l-1.414 4.356A2 2 0 0 1 12.586 20h-1.172a2 2 0 0 1-1.919-1.414L8 14.24l-2.414-2.414A2 2 0 0 1 5 10.412v-.824a2 2 0 0 1 .634-1.588z"/>
    <path d="M15 14h-2c-1 0-2-1-2-2V9c0-1 1-2 2-2h2c1 0 2 1 2 2v3c0 1-1 2-2 2z" />
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

interface HealthCategory {
  name: string;
  icon: React.ElementType;
  description?: string;
  prompt: string;
  options: SymptomOption[];
}

const healthCategories: HealthCategory[] = [
  { 
    name: "Symptoms", 
    icon: ListChecks, 
    description: "General symptoms triage.",
    prompt: "Please select your primary symptom to begin your triage:",
    options: commonSymptoms
  },
  { 
    name: "Injury", 
    icon: ShieldAlert, 
    description: "Support for physical injuries.",
    prompt: "Please select the type of injury you are concerned about:",
    options: [
      { name: "Cut / Laceration", icon: Bandage },
      { name: "Sprain / Strain", icon: Bone },
      { name: "Burn", icon: Flame },
      { name: "Head Injury", icon: Brain },
      { name: "Bruise / Contusion", icon: CircleAlert },
      { name: "Possible Fracture", icon: Bone },
    ]
  },
  { 
    name: "Dental", 
    icon: ToothIcon, 
    description: "Dental health concerns.",
    prompt: "Please select your primary dental concern:",
    options: [
      { name: "Toothache", icon: ToothIcon },
      { name: "Bleeding Gums", icon: Droplets },
      { name: "Swollen Jaw / Face", icon: UserCircle },
      { name: "Lost Filling / Crown", icon: HelpCircle },
      { name: "Chipped / Broken Tooth", icon: AlertTriangle },
    ]
  },
  { 
    name: "Mental", 
    icon: Brain, 
    description: "Mental wellbeing support.",
    prompt: "How can we help with your mental wellbeing today? Select an option:",
    options: [
      { name: "Stress / Anxiety", icon: Zap },
      { name: "Low Mood / Depression", icon: Frown },
      { name: "Sleep Problems", icon: Bed },
      { name: "Panic Attack", icon: AlertTriangle },
      { name: "Feeling Overwhelmed", icon: Brain },
    ]
  },
  { 
    name: "Sexual", 
    icon: Heart, 
    description: "Sexual health questions.",
    prompt: "Please select your sexual health concern or query:",
    options: [
      { name: "STI Concerns", icon: ShieldQuestion },
      { name: "Contraception", icon: Pill },
      { name: "Pain or Discomfort", icon: AlertTriangle },
      { name: "Testing Information", icon: FileSearch },
      { name: "General Question", icon: HelpCircle },
    ]
  },
  {
    name: "Search All",
    icon: Search,
    description: "Find a specific symptom or concern from a comprehensive list.",
    prompt: "Find your symptom or concern from the list below:",
    options: [], // This will be populated dynamically
  }
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
  
  const [activeCategory, setActiveCategory] = useState<string>(healthCategories[0].name);
  const [currentCategoryPrompt, setCurrentCategoryPrompt] = useState<string>(healthCategories[0].prompt);
  const [currentCategoryOptionsList, setCurrentCategoryOptionsList] = useState<SymptomOption[]>(healthCategories[0].options);
  const [showSymptomSelectionInChatArea, setShowSymptomSelectionInChatArea] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [allAggregatedOptions, setAllAggregatedOptions] = useState<SymptomOption[]>([]);


  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { toast } = useToast();
  const { state: sidebarState, isMobile } = useSidebar();

  useEffect(() => {
    const defaultCategory = healthCategories.find(c => c.name === "Symptoms") || healthCategories[0];
    resetChatForCategory(defaultCategory.name);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeCategory === "Search All") {
      if (searchTerm.trim() === "") {
        setCurrentCategoryOptionsList(allAggregatedOptions);
      } else {
        const filtered = allAggregatedOptions.filter(option =>
          option.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setCurrentCategoryOptionsList(filtered);
      }
    }
  }, [searchTerm, allAggregatedOptions, activeCategory]);

  const resetChatForCategory = (categoryName: string) => {
    const selectedCategory = healthCategories.find(c => c.name === categoryName) || healthCategories[0];
    
    let optionsToList = selectedCategory.options;
    let promptToUse = selectedCategory.prompt;

    setSearchTerm(''); 

    if (categoryName === "Search All") {
      const allOptionsSet = new Map<string, SymptomOption>();
      healthCategories.forEach(cat => {
        if (cat.name !== "Search All") { 
          cat.options.forEach(opt => {
            if (!allOptionsSet.has(opt.name)) {
              allOptionsSet.set(opt.name, opt);
            }
          });
        }
      });
      const aggregatedOptions = Array.from(allOptionsSet.values());
      aggregatedOptions.sort((a, b) => a.name.localeCompare(b.name)); 
      
      setAllAggregatedOptions(aggregatedOptions);
      optionsToList = aggregatedOptions; 
      promptToUse = selectedCategory.prompt;
    } else {
      setAllAggregatedOptions([]); 
    }
    
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        sender: 'bot',
        text: promptToUse,
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
    
    setActiveCategory(selectedCategory.name);
    setCurrentCategoryPrompt(promptToUse);
    setCurrentCategoryOptionsList(optionsToList);
    setShowSymptomSelectionInChatArea(optionsToList.length > 0 || categoryName === "Search All");
  };

  const resetChat = () => {
    const defaultCategory = healthCategories.find(c => c.name === "Symptoms") || healthCategories[0];
    resetChatForCategory(defaultCategory.name);
  }
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: message.sender + '-' + Date.now(), timestamp: new Date() }]);
  };

  const handleCategorySelect = (categoryName: string) => {
    resetChatForCategory(categoryName);
  };

  const getOriginalCategoryForOption = (optionName: string): string | undefined => {
    for (const category of healthCategories) {
      if (category.name !== "Search All" && category.options.some(opt => opt.name === optionName)) {
        return category.name;
      }
    }
    return undefined;
  };

  const handleOptionSelect = async (optionName: string) => {
    addMessage({ sender: 'user', text: optionName });
    setShowSymptomSelectionInChatArea(false); 
    setActiveQuickReplies(undefined); 
    setShowAppointmentDecisionButtons(false);
    setSearchTerm('');

    setInitialSymptom(optionName);
    setIsLoading(true);
    addMessage({ sender: 'bot', text: 'Thinking...', isLoading: true });

    let categoryForTriage = activeCategory;
    if (activeCategory === "Search All") {
      categoryForTriage = getOriginalCategoryForOption(optionName) || "Symptoms"; // Default to "Symptoms" if not found, though it should be
    }

    try {
      const aiResponse = await getAiTriageResponse(optionName, undefined, categoryForTriage); 
      setMessages(prev => prev.filter(m => !m.isLoading)); 
      addMessage({ sender: 'bot', text: aiResponse.nextQuestion, aiResponse });
      setActiveQuickReplies(aiResponse.quickReplies?.length ? aiResponse.quickReplies : undefined);
      setConversationHistory([`User (selected ${optionName} from ${categoryForTriage}): ${optionName}`, `AI: ${aiResponse.nextQuestion}`]);
      
      if (aiResponse.urgency === 'Urgent') {
        addMessage({ sender: 'system', text: aiResponse.outcome, aiResponse });
        setIsTriageComplete(true);
        setActiveQuickReplies(undefined);
      }
    } catch (error) {
      console.error(`Symptom selection error (${categoryForTriage} category):`, error);
      setMessages(prev => prev.filter(m => !m.isLoading));
      addMessage({ sender: 'bot', text: "Sorry, I encountered an error. Please try again."});
      toast({ title: "Error", description: "Could not process your request.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserResponse = async (responseText: string) => {
    if (!initialSymptom || isTriageComplete || isLoading || awaitingEmailForBooking || showAppointmentDecisionButtons || showSymptomSelectionInChatArea) {
        return;
    }

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
    let categoryForTriage = activeCategory;
    if (activeCategory === "Search All" && initialSymptom) {
        categoryForTriage = getOriginalCategoryForOption(initialSymptom) || "Symptoms";
    }


    try {
      const aiResponse = await getAiTriageResponse(initialSymptom!, currentConversation, categoryForTriage); 
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
      console.error(`User response error (${categoryForTriage} category):`, error);
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

    const emailAndDateRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*(?:for|on|around|next|,)?\s*(.*)/i;
    const emailOnlyRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;

    const emailAndDateMatch = emailForBooking.match(emailAndDateRegex);

    if (emailAndDateMatch && emailAndDateMatch[1]) {
        userEmail = emailAndDateMatch[1];
        if (emailAndDateMatch[2] && emailAndDateMatch[2].trim() !== "") {
             preferredDate = emailAndDateMatch[2].trim();
        }
    } else {
        const emailMatch = emailForBooking.match(emailOnlyRegex);
        if (emailMatch && emailMatch[0]) {
            userEmail = emailMatch[0];
            const potentialDatePart = emailForBooking.replace(userEmail, "").trim();
            if (potentialDatePart.length > 3) { 
                preferredDate = potentialDatePart;
            }
        }
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
  
  const getSelectedOptionData = (optionName: string | null): SymptomOption | null => {
    if (!optionName) return null;
    for (const category of healthCategories) {
      // Also check "Search All" effective options if needed, though allAggregatedOptions is better for that
      const optionsToCheck = category.name === "Search All" ? allAggregatedOptions : category.options;
      const foundOption = optionsToCheck.find(opt => opt.name === optionName);
      if (foundOption) return foundOption;
    }
    return null;
  };

  const selectedInitialOptionData = getSelectedOptionData(initialSymptom);

  const showQuickRepliesInChat = activeQuickReplies && activeQuickReplies.length > 0 && !isTriageComplete && !isLoading && !awaitingEmailForBooking && !showAppointmentDecisionButtons && !showSymptomSelectionInChatArea;
  const showChatInputInChatArea = initialSymptom && !isTriageComplete && !isLoading && !showQuickRepliesInChat && !awaitingEmailForBooking && !showAppointmentDecisionButtons;


  return (
    <>
      <Sidebar side="left" collapsible="icon" className="border-r hidden md:flex md:flex-col bg-card">
        <SidebarHeader className="p-4 border-b flex items-center justify-center">
           {/* Intentionally empty for cleaner look, or add a small static brand icon if sidebar is always visible for branding */}
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu className="mt-4">
            {healthCategories.map((category) => (
              <SidebarMenuItem key={category.name}>
                <SidebarMenuButton
                  onClick={() => handleCategorySelect(category.name)}
                  isActive={activeCategory === category.name}
                  tooltip={category.name}
                  className="w-full"
                >
                  <category.icon className="h-5 w-5" />
                  <span className="group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">{category.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          {initialSymptom && ( 
             <div className="p-2 mt-auto border-t">
               <p className="text-sm font-medium text-foreground group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">Current Triage:</p>
               <div className={`flex items-center gap-2 p-2 border rounded-md mt-1 ${sidebarState === 'collapsed' && !isMobile ? 'justify-center' : ''}`}>
                 {selectedInitialOptionData?.icon && <selectedInitialOptionData.icon className={`h-6 w-6 text-primary ${sidebarState === 'collapsed' && !isMobile ? '' : 'h-5 w-5'}`} />}
                 <span className="text-sm group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">{initialSymptom}</span>
               </div>
               <Button variant="outline" size="sm" onClick={resetChat} className="w-full mt-2 group-[[data-sidebar=sidebar][data-collapsible=icon]]:hidden">
                 Start New Triage
               </Button>
                {sidebarState === 'collapsed' && !isMobile && (
                    <Button variant="outline" size="icon" onClick={resetChat} className="w-full mt-2">
                        <Menu className="h-4 w-4" /> 
                    </Button>
                )}
             </div>
          )}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-col h-screen bg-background shadow-xl overflow-hidden">
          <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center space-x-3 shadow-md">
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
            <div className="flex items-center space-x-2">
              <HeartPulse className="h-7 w-7" />
              <h1 className="text-2xl font-semibold">Symptom Scout AI</h1>
            </div>
          </header>

          <ScrollArea className="flex-grow p-4 space-y-4 bg-secondary/30">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <Separator />

          {showSymptomSelectionInChatArea && (currentCategoryOptionsList.length > 0 || activeCategory === "Search All") && (
            <div className="p-4 border-t bg-card">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                {currentCategoryPrompt.replace(" below", "")} 
              </p>
              {activeCategory === "Search All" && (
                <div className="mb-4 px-2">
                  <Label htmlFor="symptomSearchInput" className="text-xs font-medium text-muted-foreground">
                    Filter options:
                  </Label>
                  <Input
                    id="symptomSearchInput"
                    type="text"
                    placeholder="Type to filter symptoms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 w-full rounded-full shadow-sm h-9 text-sm"
                  />
                </div>
              )}
              {currentCategoryOptionsList.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {currentCategoryOptionsList.map((option) => (
                    <SymptomButton
                      key={option.name}
                      symptom={option} 
                      onSelect={handleOptionSelect}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              ) : (
                activeCategory === "Search All" && searchTerm.trim() !== "" && (
                  <p className="text-sm text-muted-foreground text-center">No symptoms match your search.</p>
                )
              )}
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

          {showChatInputInChatArea && (
            <ChatInput 
                onSubmit={handleUserResponse} 
                disabled={isLoading} 
                placeholder="Type your response..."
            />
          )}
          
           {(isTriageComplete && !awaitingEmailForBooking && !showAppointmentDecisionButtons && !showSymptomSelectionInChatArea) && (
             <div className="p-4 bg-background border-t text-center">
               <p className="text-sm text-muted-foreground mb-2">
                 Triage complete for '{initialSymptom}' in the '{activeCategory}' category. You can start over by selecting a category or clicking below.
               </p>
               <Button onClick={resetChat} variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                 Start New Chat
               </Button>
             </div>
           )}
           
          <footer className="p-4 border-t bg-card text-center text-xs text-muted-foreground">
            <div className="flex justify-center items-center space-x-4">
              <p>&copy; {new Date().getFullYear()} Symptom Scout AI. All rights reserved.</p>
              <Separator orientation="vertical" className="h-4" />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-xs p-0 h-auto text-muted-foreground hover:text-primary">
                    <Info className="h-3 w-3 mr-1" />
                    About Us
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <HeartPulse className="h-6 w-6 mr-2 text-primary" />
                      About Symptom Scout AI
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-3 text-sm">
                    <p>
                      Symptom Scout AI is an intelligent assistant designed to help you understand potential health concerns by triaging symptoms and providing guidance. 
                    </p>
                    <p>
                      Our goal is to empower you with information and help you decide on appropriate next steps, whether it's self-care, seeking professional medical advice, or scheduling an appointment.
                    </p>
                    <Separator className="my-3" />
                    <h3 className="font-semibold text-foreground">A Note from the Developer:</h3>
                    <p>
                      My name is Sachin Tiwari, and I am a Microsoft Certified AI Engineer Associate. Symptom Scout AI is a project I developed to demonstrate the practical applications of artificial intelligence in the healthcare domain.
                    </p>
                    <p>
                      This application is built using React and Next.js, leveraging modern web technologies to create an interactive and helpful user experience.
                    </p>
                    <Separator className="my-3" />
                    <p className="font-semibold text-destructive">
                      Important: Symptom Scout AI is not a substitute for professional medical diagnosis or treatment. Always consult with a qualified healthcare provider for any health concerns or before making any decisions related to your health. This tool is for informational purposes only.
                    </p>
                  </div>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="mt-2 w-full">
                      Close
                    </Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
            </div>
            <p className="mt-2">
              Disclaimer: This application is for informational purposes only and does not constitute medical advice. Always consult a healthcare professional for medical concerns.
            </p>
          </footer>
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

    
