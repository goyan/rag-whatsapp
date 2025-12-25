/**
 * Fastify API Server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from '../config/index.js';
import { registerQueryRoutes } from './routes/query.js';
import { registerIngestRoutes } from './routes/ingest.js';
import { registerHealthRoutes } from './routes/health.js';

export async function createServer() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  await app.register(websocket);

  // Register routes
  await registerHealthRoutes(app);
  await registerQueryRoutes(app);
  await registerIngestRoutes(app);

  return app;
}

export async function startServer() {
  const app = await createServer();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${config.port}`);
    return app;
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
