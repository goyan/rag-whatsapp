/**
 * Health Check Routes
 */

import type { FastifyInstance } from 'fastify';
import { checkProvidersHealth } from '../../providers/index.js';
import { getRetriever } from '../../rag/index.js';

export async function registerHealthRoutes(app: FastifyInstance) {
  // Basic health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Detailed health check
  app.get('/health/detailed', async () => {
    const providerHealth = await checkProvidersHealth();

    let vectorStoreAvailable = false;
    try {
      const retriever = getRetriever();
      vectorStoreAvailable = await retriever.isAvailable();
    } catch {
      vectorStoreAvailable = false;
    }

    const allHealthy = providerHealth.every((p) => p.available) && vectorStoreAvailable;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        providers: providerHealth,
        vectorStore: {
          name: 'qdrant',
          available: vectorStoreAvailable,
        },
      },
    };
  });
}
