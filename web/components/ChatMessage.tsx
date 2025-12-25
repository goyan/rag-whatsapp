'use client';

import { User, Bot, Clock, Users } from 'lucide-react';
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
  const isUser = message.role === 'user';

  return (
    <div className={`message-enter flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : 'bg-green-500'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Sources:
            </p>
            {message.sources.map((source, i) => (
              <div
                key={source.chunkId}
                className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 inline-block mr-1"
              >
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(source.timeRange.start).toLocaleDateString()}</span>
                  <Users className="w-3 h-3 ml-2" />
                  <span>{source.participants.slice(0, 2).join(', ')}</span>
                  <span className="text-gray-400 ml-1">
                    ({(source.score * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
