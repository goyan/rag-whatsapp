/**
 * Query Routes
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getGenerator, getReActAgent } from '../../rag/index.js';
import type { QueryRequest, QueryFilters } from '../../rag/types.js';

const QueryBodySchema = z.object({
  question: z.string().min(1).max(1000),
  filters: z.object({
    participants: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    conversationId: z.string().optional(),
  }).optional(),
  options: z.object({
    topK: z.number().int().min(1).max(20).optional(),
    minScore: z.number().min(0).max(1).optional(),
    useAgent: z.boolean().optional(),
    includeSources: z.boolean().optional(),
    maxTokens: z.number().int().min(50).max(2000).optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional(),
});

export async function registerQueryRoutes(app: FastifyInstance) {
  // Initialize services
  const generator = getGenerator();
  await generator.initialize();

  // POST /api/query - Query conversations
  app.post('/api/query', async (request, reply) => {
    try {
      const body = QueryBodySchema.parse(request.body);

      const filters: QueryFilters | undefined = body.filters ? {
        participants: body.filters.participants,
        dateRange: body.filters.dateRange ? {
          start: body.filters.dateRange.start ? new Date(body.filters.dateRange.start) : undefined,
          end: body.filters.dateRange.end ? new Date(body.filters.dateRange.end) : undefined,
        } : undefined,
        conversationId: body.filters.conversationId,
      } : undefined;

      const queryRequest: QueryRequest = {
        question: body.question,
        filters,
        options: body.options,
      };

      // Use agent for complex queries if requested
      if (body.options?.useAgent) {
        const agent = getReActAgent();
        const result = await agent.run(body.question, filters);
        return result;
      }

      const result = await generator.query(queryRequest);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // WebSocket for streaming responses
  app.get('/api/query/stream', { websocket: true }, (socket) => {
    socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        const body = QueryBodySchema.parse(data);

        const filters: QueryFilters | undefined = body.filters ? {
          participants: body.filters.participants,
          dateRange: body.filters.dateRange ? {
            start: body.filters.dateRange.start ? new Date(body.filters.dateRange.start) : undefined,
            end: body.filters.dateRange.end ? new Date(body.filters.dateRange.end) : undefined,
          } : undefined,
          conversationId: body.filters.conversationId,
        } : undefined;

        const queryRequest: QueryRequest = {
          question: body.question,
          filters,
          options: body.options,
        };

        // Stream the response
        for await (const token of generator.queryStream(queryRequest)) {
          socket.send(JSON.stringify({ type: 'token', data: token }));
        }

        socket.send(JSON.stringify({ type: 'done' }));
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    });
  });
}
