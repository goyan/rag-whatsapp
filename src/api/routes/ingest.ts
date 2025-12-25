/**
 * Ingest Routes
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { getIngestionPipeline } from '../../ingestion/index.js';

const IngestOptionsSchema = z.object({
  conversationName: z.string().optional(),
  chunkGapMinutes: z.number().int().min(1).max(1440).optional(),
  chunkMaxMessages: z.number().int().min(10).max(500).optional(),
  generateSummaries: z.boolean().optional(),
  includeSystemMessages: z.boolean().optional(),
  includeDeletedMessages: z.boolean().optional(),
});

export async function registerIngestRoutes(app: FastifyInstance) {
  // Initialize pipeline
  const pipeline = getIngestionPipeline();
  await pipeline.initialize();

  // POST /api/ingest - Ingest a WhatsApp export file
  app.post('/api/ingest', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // Get options from fields
    const fields = data.fields as Record<string, { value?: string }>;
    const optionsRaw: Record<string, unknown> = {};

    if (fields.conversationName?.value) {
      optionsRaw.conversationName = fields.conversationName.value;
    }
    if (fields.chunkGapMinutes?.value) {
      optionsRaw.chunkGapMinutes = parseInt(fields.chunkGapMinutes.value, 10);
    }
    if (fields.chunkMaxMessages?.value) {
      optionsRaw.chunkMaxMessages = parseInt(fields.chunkMaxMessages.value, 10);
    }
    if (fields.generateSummaries?.value) {
      optionsRaw.generateSummaries = fields.generateSummaries.value === 'true';
    }
    if (fields.includeSystemMessages?.value) {
      optionsRaw.includeSystemMessages = fields.includeSystemMessages.value === 'true';
    }
    if (fields.includeDeletedMessages?.value) {
      optionsRaw.includeDeletedMessages = fields.includeDeletedMessages.value === 'true';
    }

    let options;
    try {
      options = IngestOptionsSchema.parse(optionsRaw);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }

    // Save file temporarily
    const tempDir = join(process.cwd(), 'temp');
    await mkdir(tempDir, { recursive: true });
    const tempPath = join(tempDir, `${nanoid()}.txt`);

    try {
      const buffer = await data.toBuffer();
      await writeFile(tempPath, buffer);

      // Ingest the file
      const result = await pipeline.ingest(
        tempPath,
        options.conversationName,
        {
          chunkGapMinutes: options.chunkGapMinutes,
          chunkMaxMessages: options.chunkMaxMessages,
          generateSummaries: options.generateSummaries,
          includeSystemMessages: options.includeSystemMessages,
          includeDeletedMessages: options.includeDeletedMessages,
        },
      );

      return {
        success: true,
        result,
      };
    } finally {
      // Clean up temp file
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // GET /api/ingest/:jobId - Get ingestion progress
  app.get<{ Params: { jobId: string } }>('/api/ingest/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const progress = pipeline.getProgress(jobId);

    if (!progress) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    return progress;
  });
}
