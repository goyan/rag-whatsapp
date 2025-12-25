'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, useAgent: boolean) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [useAgent, setUseAgent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim(), useAgent);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your conversations..."
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-300 dark:border-gray-600
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none disabled:opacity-50"
            />
            <button
              onClick={() => setUseAgent(!useAgent)}
              className={`absolute right-12 bottom-3 p-1 rounded-full transition-colors
                        ${useAgent ? 'text-purple-500 bg-purple-100 dark:bg-purple-900' : 'text-gray-400 hover:text-gray-600'}`}
              title={useAgent ? 'Agent mode ON' : 'Agent mode OFF'}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {useAgent ? (
            <span className="text-purple-500">Agent mode: multi-step reasoning enabled</span>
          ) : (
            'Press Enter to send, Shift+Enter for new line'
          )}
        </p>
      </div>
    </div>
  );
}
