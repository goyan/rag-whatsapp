'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { getHealth, type HealthStatus } from '@/lib/api';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Server,
  Database,
  Cpu,
  ExternalLink,
  Zap,
} from 'lucide-react';

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[var(--background)] p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10 animate-fadeIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--earth-300)] to-[var(--earth-500)] flex items-center justify-center shadow-md">
                <Settings className="w-6 h-6 text-[var(--graphite)]" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-semibold text-[var(--foreground)]">
                  Settings
                </h1>
                <p className="text-sm text-[var(--graphite)]">
                  System status and configuration
                </p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <section
            className="paper-card p-6 mb-6 animate-fadeIn"
            style={{ animationDelay: '100ms', animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-[var(--greenhouse-600)]" />
                <h2 className="text-lg font-display font-semibold text-[var(--foreground)]">
                  System Status
                </h2>
              </div>
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="p-2.5 rounded-xl text-[var(--graphite)] hover:bg-[var(--earth-500)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {health?.components ? (
              <div className="space-y-3">
                {/* Providers */}
                {health.components.providers.map((provider, index) => (
                  <div
                    key={provider.provider}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--earth-500)] border border-[var(--earth-400)] animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          provider.available
                            ? 'bg-[var(--greenhouse-700)]'
                            : 'bg-red-900/30'
                        }`}
                      >
                        {provider.available ? (
                          <CheckCircle className="w-5 h-5 text-[var(--greenhouse-400)]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)] capitalize">
                          {provider.provider}
                        </p>
                        <p className="text-xs text-[var(--graphite)]">
                          {provider.available ? 'Connected' : 'Unavailable'}
                        </p>
                      </div>
                    </div>
                    {provider.latencyMs && (
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[var(--greenhouse-400)]" />
                        <span className="text-sm font-mono text-[var(--graphite)]">
                          {provider.latencyMs}ms
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Vector Store */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--earth-500)] border border-[var(--earth-400)]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        health.components.vectorStore.available
                          ? 'bg-[var(--greenhouse-700)]'
                          : 'bg-red-900/30'
                      }`}
                    >
                      <Database
                        className={`w-5 h-5 ${
                          health.components.vectorStore.available
                            ? 'text-[var(--greenhouse-400)]'
                            : 'text-red-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {health.components.vectorStore.name}
                      </p>
                      <p className="text-xs text-[var(--graphite)]">
                        Vector Database
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      health.components.vectorStore.available
                        ? 'bg-[var(--greenhouse-700)] text-[var(--greenhouse-300)]'
                        : 'bg-red-900/30 text-red-400'
                    }`}
                  >
                    {health.components.vectorStore.available ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-[var(--graphite)]">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Checking system status...</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-[var(--foreground)] font-medium">
                    Unable to connect
                  </p>
                  <p className="text-sm text-[var(--graphite)] mt-1">
                    Make sure the API server is running
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Configuration */}
          <section
            className="paper-card p-6 animate-fadeIn"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-[var(--graphite)]" />
              <h2 className="text-lg font-display font-semibold text-[var(--foreground)]">
                Configuration
              </h2>
            </div>

            <p className="text-sm text-[var(--graphite)] mb-6">
              System configuration is managed via environment variables.
            </p>

            <div className="space-y-3">
              {[
                { label: 'API Server', value: 'localhost:3000', type: 'endpoint' },
                { label: 'Web UI', value: 'localhost:3001', type: 'endpoint' },
                { label: 'Vector Store', value: 'Qdrant (localhost:6333)', type: 'service' },
                { label: 'Queue', value: 'Redis (localhost:6379)', type: 'service' },
              ].map(({ label, value, type }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3 border-b border-[var(--earth-300)] last:border-0"
                >
                  <span className="text-sm text-[var(--graphite)]">{label}</span>
                  <span className="text-sm font-mono text-[var(--foreground)] bg-[var(--earth-500)] px-2.5 py-1 rounded-lg">
                    {value}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--graphite)]">Documentation</span>
                <a
                  href="https://github.com/goyan/rag-whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-[var(--greenhouse-400)] hover:text-[var(--greenhouse-300)] transition-colors"
                >
                  GitHub
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--muted)] mt-8 animate-fadeIn" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            RAG WhatsApp v1.0 • Built with Qdrant, Ollama & Next.js
          </p>
        </div>
      </main>
    </div>
  );
}
