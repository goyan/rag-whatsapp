'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Sparkles, CornerDownLeft } from 'lucide-react';

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
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-[var(--earth-500)] bg-[var(--earth-600)] p-5">
      <div className="max-w-3xl mx-auto">
        {/* Agent mode banner */}
        {useAgent && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-[var(--terracotta)]/15 border border-[var(--terracotta)]/30 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--terracotta)]" />
              <span className="text-sm font-medium text-[var(--terracotta)]">
                Agent Mode
              </span>
              <span className="text-xs text-[var(--graphite)]">
                Multi-step reasoning enabled
              </span>
            </div>
          </div>
        )}

        {/* Input container */}
        <div className="relative group">
          {/* Gradient border effect on focus */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--greenhouse-400)] to-[var(--moss)] rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />

          <div className="relative flex items-end gap-3 bg-[var(--earth-500)] rounded-2xl border-2 border-[var(--earth-400)] group-focus-within:border-transparent p-2 transition-colors">
            {/* Agent toggle button */}
            <button
              onClick={() => setUseAgent(!useAgent)}
              className={`
                flex-shrink-0 p-2.5 rounded-xl transition-all duration-200
                ${useAgent
                  ? 'bg-gradient-to-br from-[var(--terracotta)] to-[var(--clay)] text-white shadow-md'
                  : 'text-[var(--muted)] hover:text-[var(--terracotta)] hover:bg-[var(--earth-400)]'
                }
              `}
              title={useAgent ? 'Disable Agent Mode' : 'Enable Agent Mode'}
            >
              <Sparkles className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your conversations..."
              disabled={disabled}
              rows={1}
              className="
                flex-1 py-2.5 px-1 bg-transparent text-[var(--foreground)]
                placeholder:text-[var(--muted)] resize-none
                focus:outline-none text-[15px] leading-relaxed
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={disabled || !input.trim()}
              className={`
                flex-shrink-0 p-3 rounded-xl transition-all duration-200
                ${input.trim() && !disabled
                  ? 'btn-botanical'
                  : 'bg-[var(--earth-400)] text-[var(--muted)] cursor-not-allowed'
                }
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3 h-3" />
            Enter to send
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--earth-400)]" />
          <span>Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
