'use client';

import { User, Bot, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ChunkSource } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChunkSource[];
  reasoning?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div
      className={`
        ${isUser ? 'message-enter-user' : 'message-enter-assistant'}
        flex gap-4 ${isUser ? 'flex-row-reverse' : ''}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-1">
        <div
          className={`
            w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm
            transition-transform hover:scale-105
            ${isUser
              ? 'bg-gradient-to-br from-[var(--greenhouse-400)] to-[var(--greenhouse-600)]'
              : 'bg-gradient-to-br from-[var(--earth-300)] to-[var(--earth-400)]'
            }
          `}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" strokeWidth={2} />
          ) : (
            <Bot className="w-5 h-5 text-white" strokeWidth={2} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        {/* Label */}
        <span className={`
          text-xs font-medium mb-1.5 block
          ${isUser ? 'text-[var(--greenhouse-600)]' : 'text-[var(--graphite)]'}
        `}>
          {isUser ? 'You' : 'Assistant'}
        </span>

        {/* Message Bubble */}
        <div
          className={`
            inline-block px-5 py-3.5 max-w-full
            ${isUser ? 'bubble-user' : 'bubble-assistant'}
          `}
        >
          {message.isStreaming && !message.content ? (
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-left">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-current animate-pulse-soft ml-0.5 align-middle" />
              )}
            </p>
          )}
        </div>

        {/* Reasoning (if agent mode) */}
        {message.reasoning && message.reasoning.length > 0 && (
          <div className="mt-3 text-left">
            <button
              onClick={() => setShowSources(!showSources)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--greenhouse-400)] hover:text-[var(--greenhouse-300)] transition-colors"
            >
              <span>Reasoning steps ({message.reasoning.length})</span>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showSources && (
              <div className="mt-2 p-3 rounded-xl bg-[var(--earth-500)] border border-[var(--earth-400)]">
                <ol className="space-y-2 text-xs text-[var(--foreground)]">
                  {message.reasoning.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--greenhouse-600)] text-white flex items-center justify-center font-medium text-[10px]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 text-left">
            <p className="text-xs font-medium text-[var(--graphite)] mb-2 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--greenhouse-400)]" />
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''} found
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source) => (
                <div
                  key={source.chunkId}
                  className="source-tag group cursor-default"
                >
                  <Clock className="w-3 h-3 opacity-60" />
                  <span>{new Date(source.timeRange.start).toLocaleDateString()}</span>
                  <span className="mx-1 opacity-30">|</span>
                  <Users className="w-3 h-3 opacity-60" />
                  <span className="truncate max-w-[100px]">
                    {source.participants.slice(0, 2).join(', ')}
                  </span>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--greenhouse-600)] text-white text-[10px] font-medium">
                    {(source.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className={`
          text-[10px] mt-2 font-mono tracking-wide
          ${isUser ? 'text-[var(--greenhouse-400)]' : 'text-[var(--muted)]'}
        `}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
