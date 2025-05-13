'use client';

import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, User, AlertTriangle, CalendarClock, ShieldCheck, Info } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  const getUrgencyIcon = (urgency?: 'Urgent' | 'Non-Urgent' | 'Appointment Needed') => {
    switch (urgency) {
      case 'Urgent':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'Appointment Needed':
        return <CalendarClock className="h-5 w-5 text-yellow-500" />;
      case 'Non-Urgent':
        return <ShieldCheck className="h-5 w-5 text-accent" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getUrgencyAlertVariant = (urgency?: 'Urgent' | 'Non-Urgent' | 'Appointment Needed'): "default" | "destructive" => {
    if (urgency === 'Urgent') return "destructive";
    return "default";
  }
  
  const getUrgencyAlertTitle = (urgency?: 'Urgent' | 'Non-Urgent' | 'Appointment Needed'): string => {
     switch (urgency) {
      case 'Urgent':
        return "Urgent Medical Attention Required";
      case 'Appointment Needed':
        return "Appointment Recommended";
      case 'Non-Urgent':
        return "Non-Urgent: Monitor Symptoms";
      default:
        return "Triage Information";
    }
  }


  if (isSystem && message.aiResponse) {
    return (
      <div className="flex justify-center my-4">
        <Alert variant={getUrgencyAlertVariant(message.aiResponse.urgency)} className="w-full max-w-md shadow-lg">
          <div className="flex items-center space-x-2">
            {getUrgencyIcon(message.aiResponse.urgency)}
            <AlertTitle className="font-semibold">{getUrgencyAlertTitle(message.aiResponse.urgency)}</AlertTitle>
          </div>
          <AlertDescription className="mt-2 text-sm">
            {message.text}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (message.isLoading) {
     return (
        <div className={cn('flex items-end space-x-2 my-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && (
            <Avatar className="h-8 w-8">
              <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
            </Avatar>
          )}
          <div
            className={cn(
              'max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-xl shadow-md',
              isUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card text-card-foreground rounded-bl-none'
            )}
          >
            <div className="flex space-x-1 animate-pulse">
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animation-delay-200"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animation-delay-400"></div>
            </div>
          </div>
        </div>
     );
  }


  return (
    <div className={cn('flex items-end space-x-2 my-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8">
           <AvatarFallback><Bot className="h-5 w-5 text-primary"/></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-xl shadow-md',
          isUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card text-card-foreground rounded-bl-none'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p className="text-xs mt-1 opacity-75 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
         <Avatar className="h-8 w-8">
           <AvatarFallback><User className="h-5 w-5 text-primary"/></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
