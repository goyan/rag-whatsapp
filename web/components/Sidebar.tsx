'use client';

import { MessageSquare, Upload, Settings, Leaf, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Chat', icon: MessageSquare, description: 'Ask questions' },
  { href: '/import', label: 'Import', icon: Upload, description: 'Add conversations' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'System status' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 flex flex-col bg-[var(--earth-700)] border-r border-[var(--earth-500)] relative overflow-hidden">
      {/* Subtle decorative pattern */}
      <div className="absolute inset-0 leaf-pattern opacity-20 pointer-events-none" />

      {/* Logo Section */}
      <div className="relative p-6 border-b border-[var(--earth-500)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--greenhouse-400)] to-[var(--greenhouse-600)] flex items-center justify-center shadow-[var(--shadow-botanical)]">
              <Leaf className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--greenhouse-400)] border-2 border-[var(--earth-700)]" />
          </div>
          <div>
            <h1 className="text-lg font-display font-semibold text-[var(--foreground)] tracking-tight">
              RAG WhatsApp
            </h1>
            <p className="text-xs text-[var(--graphite)] mt-0.5">
              Memory-powered chat
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 relative">
        {navItems.map(({ href, label, icon: Icon, description }, index) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-[var(--earth-500)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--graphite)] hover:bg-[var(--earth-600)] hover:text-[var(--foreground)]'
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`
                w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                ${isActive
                  ? 'bg-[var(--greenhouse-500)] text-white shadow-[var(--shadow-botanical)]'
                  : 'bg-[var(--earth-500)] text-[var(--graphite)] group-hover:bg-[var(--greenhouse-700)] group-hover:text-[var(--greenhouse-300)]'
                }
              `}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-sm">{label}</span>
                <span className={`
                  block text-xs truncate transition-colors
                  ${isActive ? 'text-[var(--greenhouse-400)]' : 'text-[var(--muted)]'}
                `}>
                  {description}
                </span>
              </div>
              {isActive && (
                <div className="w-1.5 h-8 rounded-full bg-[var(--greenhouse-500)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Feature hint */}
      <div className="relative mx-4 mb-4 p-4 rounded-xl bg-[var(--earth-600)] border border-[var(--earth-500)]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--terracotta)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[var(--terracotta)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed">
              Enable Agent Mode for multi-step reasoning
            </p>
            <p className="text-xs text-[var(--graphite)] mt-1">
              Click the sparkle icon when chatting
            </p>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="relative p-4 border-t border-[var(--earth-500)] bg-[var(--earth-800)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="status-dot online" />
            <span className="text-xs font-medium text-[var(--graphite)]">
              System Online
            </span>
          </div>
          <span className="text-[10px] text-[var(--muted)] font-mono">
            v1.0
          </span>
        </div>
      </div>
    </aside>
  );
}
