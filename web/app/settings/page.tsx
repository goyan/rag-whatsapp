'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { getHealth, type HealthStatus } from '@/lib/api';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
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

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Settings
          </h1>

          {/* System Status */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                System Status
              </h2>
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {health?.components ? (
              <div className="space-y-3">
                {/* Providers */}
                {health.components.providers.map((provider) => (
                  <div
                    key={provider.provider}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {provider.available ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-gray-700 dark:text-gray-300">
                        {provider.provider}
                      </span>
                    </div>
                    {provider.latencyMs && (
                      <span className="text-sm text-gray-400">
                        {provider.latencyMs}ms
                      </span>
                    )}
                  </div>
                ))}

                {/* Vector Store */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {health.components.vectorStore.available ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">
                      Vector Store ({health.components.vectorStore.name})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading...</p>
            )}
          </section>

          {/* Configuration Info */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configuration
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              These settings are configured via environment variables.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">API Server</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono">
                  localhost:3000
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Web UI</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono">
                  localhost:3001
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Docs</span>
                <a
                  href="https://github.com/goyan/rag-whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  GitHub
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
