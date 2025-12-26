'use client';

import { Sidebar } from '@/components/Sidebar';
import { FileUpload } from '@/components/FileUpload';
import { Upload, MessageSquare, Smartphone, FileText, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Smartphone,
    title: 'Open WhatsApp',
    description: 'Navigate to the chat you want to export',
  },
  {
    icon: MessageSquare,
    title: 'Export Chat',
    description: 'Tap menu → More → Export Chat',
  },
  {
    icon: FileText,
    title: 'Choose Format',
    description: 'Select "Without Media" for faster processing',
  },
  {
    icon: Upload,
    title: 'Upload Here',
    description: 'Drop the .txt file in the upload area',
  },
];

export default function ImportPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[var(--background)] p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10 animate-fadeIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--greenhouse-400)] to-[var(--greenhouse-600)] flex items-center justify-center shadow-[var(--shadow-botanical)]">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-semibold text-[var(--foreground)]">
                  Import Conversations
                </h1>
                <p className="text-sm text-[var(--graphite)]">
                  Add your WhatsApp exports to the knowledge base
                </p>
              </div>
            </div>
          </div>

          {/* Upload Component */}
          <div className="mb-10 animate-fadeIn" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <FileUpload />
          </div>

          {/* How-to Section */}
          <div
            className="paper-card p-6 animate-fadeIn"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <h2 className="text-lg font-display font-semibold text-[var(--foreground)] mb-6">
              How to export from WhatsApp
            </h2>

            <div className="space-y-4">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--greenhouse-100)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--greenhouse-600)]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--greenhouse-500)]">
                        Step {index + 1}
                      </span>
                      {index < steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-[var(--muted)]" />
                      )}
                    </div>
                    <h3 className="font-medium text-[var(--foreground)]">{title}</h3>
                    <p className="text-sm text-[var(--graphite)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">
                Tips
              </p>
              <ul className="space-y-2 text-sm text-[var(--graphite)]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--greenhouse-400)] mt-1.5 flex-shrink-0" />
                  Export without media for faster processing
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--greenhouse-400)] mt-1.5 flex-shrink-0" />
                  Large conversations may take a few seconds to process
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--greenhouse-400)] mt-1.5 flex-shrink-0" />
                  Your data stays on your machine
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
