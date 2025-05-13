'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, disabled, placeholder = "Type your response..." }: ChatInputProps) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText.trim());
      setInputText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4 border-t bg-background">
      <Input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-grow rounded-full shadow-sm focus:ring-primary focus:border-primary"
        aria-label="Chat input"
      />
      <Button type="submit" disabled={disabled || !inputText.trim()} size="icon" className="rounded-full bg-primary hover:bg-primary/90">
        <Send className="h-5 w-5 text-primary-foreground" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
