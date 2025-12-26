'use client';

import { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { query, type ChunkSource } from '@/lib/api';
import { MessageCircle, Search, Calendar, Users, ArrowRight, Leaf } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChunkSource[];
  reasoning?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

const exampleQueries = [
  {
    icon: Calendar,
    text: 'When did John want to meet?',
    color: 'var(--greenhouse-500)',
  },
  {
    icon: Search,
    text: 'What did we discuss about the project?',
    color: 'var(--moss)',
  },
  {
    icon: Users,
    text: 'Who mentioned the restaurant last week?',
    color: 'var(--terracotta)',
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string, useAgent: boolean) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await query({
        question: content,
        options: {
          useAgent,
          includeSources: true,
          topK: 5,
        },
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: response.answer,
                sources: response.sources,
                reasoning: response.reasoning,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
                {/* Logo/Hero */}
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--greenhouse-400)] to-[var(--greenhouse-600)] flex items-center justify-center shadow-[var(--shadow-botanical)] animate-float">
                    <Leaf className="w-12 h-12 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--terracotta)] to-[var(--clay)] flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-display font-semibold text-[var(--foreground)] text-center mb-3 text-balance">
                  Your conversations,{' '}
                  <span className="gradient-text">remembered</span>
                </h1>
                <p className="text-[var(--graphite)] text-center max-w-md mb-10 text-balance leading-relaxed">
                  Ask questions about your WhatsApp history. Find dates, names,
                  and topics from past conversations instantly.
                </p>

                {/* Example Queries */}
                <div className="w-full max-w-md space-y-3">
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-4 text-center">
                    Try asking
                  </p>
                  {exampleQueries.map(({ icon: Icon, text, color }, index) => (
                    <button
                      key={text}
                      onClick={() => handleSend(text, false)}
                      className="
                        w-full group flex items-center gap-4 p-4 rounded-2xl
                        bg-[var(--earth-500)] border border-[var(--earth-400)]
                        hover:border-[var(--greenhouse-400)] hover:bg-[var(--earth-400)]
                        transition-all duration-200 text-left
                        animate-fadeIn
                      "
                      style={{
                        animationDelay: `${index * 100 + 200}ms`,
                        animationFillMode: 'both',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${color}25` }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color }}
                        />
                      </div>
                      <span className="flex-1 text-sm text-[var(--foreground)] font-medium">
                        "{text}"
                      </span>
                      <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--greenhouse-400)] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-10">
                  {['Semantic Search', 'Source Citations', 'Agent Mode'].map(
                    (feature, i) => (
                      <span
                        key={feature}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--earth-400)] text-[var(--graphite)] animate-fadeIn"
                        style={{
                          animationDelay: `${i * 100 + 500}ms`,
                          animationFillMode: 'both',
                        }}
                      >
                        {feature}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="space-y-6">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSend} disabled={loading} />
      </main>
    </div>
  );
}
