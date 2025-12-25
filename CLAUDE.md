# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAG WhatsApp is a Retrieval-Augmented Generation system for querying WhatsApp chat history. It parses WhatsApp exports, chunks conversations temporally, generates embeddings, and enables semantic search with LLM-powered answers.

## Commands

```bash
# Development
pnpm dev                    # Run server with hot reload (tsx watch)
pnpm serve                  # Run server via CLI

# Build & Type Check
pnpm build                  # Compile TypeScript to dist/
pnpm typecheck              # Type check without emitting

# Testing
pnpm test                   # Run tests in watch mode
pnpm test:run               # Run tests once
vitest run tests/parser.test.ts  # Run single test file

# Linting
pnpm lint                   # ESLint check
pnpm lint:fix               # ESLint auto-fix
pnpm format                 # Prettier format

# CLI Commands
pnpm cli ingest <file>      # Ingest WhatsApp export
pnpm cli query "<question>" # Query conversations
pnpm cli serve              # Start API server

# Docker (infrastructure)
pnpm docker:up              # Start Qdrant, Redis, Ollama
pnpm docker:down            # Stop containers
pnpm docker:logs            # View container logs
pnpm ollama:pull            # Pull required Ollama models (mistral, nomic-embed-text)

# Web UI (Next.js)
pnpm web:dev                # Start web dev server
pnpm web:build              # Build web app
pnpm dev:all                # Run API server + web UI concurrently
```

## Architecture

```
src/
├── api/           # Fastify REST API server
│   └── routes/    # Health, ingest, query endpoints
├── cli/           # Commander.js CLI
│   └── commands/  # ingest, query, serve commands
├── config/        # Zod-validated configuration from env
├── core/
│   ├── parser/    # WhatsApp export parser (multiple date formats)
│   └── chunker/   # Temporal chunking (groups messages by time gaps)
├── ingestion/     # Pipeline: parse → chunk → embed → store
├── providers/     # Multi-provider abstraction
│   ├── types.ts   # LLMProvider & EmbedProvider interfaces
│   ├── ollama.ts  # Ollama (default, local)
│   ├── openai.ts  # OpenAI
│   └── claude.ts  # Claude (LLM only, no embeddings)
├── rag/
│   ├── retriever.ts  # Semantic search via Qdrant
│   ├── generator.ts  # LLM response generation
│   └── agent/        # ReAct agent for complex queries
└── storage/
    └── qdrant.ts     # Qdrant vector store operations

web/               # Next.js frontend (separate package.json)
docker/            # Docker Compose for infrastructure
tests/             # Vitest tests
```

## Key Patterns

### Provider System
Switch between LLM/embedding providers via env vars:
- `LLM_PROVIDER`: `ollama` | `openai` | `claude`
- `EMBED_PROVIDER`: `ollama` | `openai` (Claude lacks embeddings)

### Singleton Pattern
Core services use singleton factories:
```typescript
import { getEmbedProvider, getLLMProvider } from './providers/index.js';
import { getRetriever } from './rag/index.js';
import { getIngestionPipeline } from './ingestion/index.js';
```

### Ingestion Pipeline
1. Parse WhatsApp export (supports US/EU/BR/ISO/DE date formats)
2. Chunk messages by time gaps (default 30 min) and max size (100 messages)
3. Generate embeddings in batches
4. Store in Qdrant with metadata

### RAG Flow
1. Query → embed → vector search in Qdrant
2. Build context from top-K chunks
3. LLM generates answer with sources

## Infrastructure

- **Qdrant** (port 6333): Vector database for embeddings
- **Redis** (port 6379): BullMQ job queues
- **Ollama** (port 11434): Local LLM/embeddings (requires `mistral` and `nomic-embed-text` models)

## Configuration

Copy `.env.example` to `.env`. Key settings:
- `LLM_PROVIDER` / `EMBED_PROVIDER`: Provider selection
- `OLLAMA_MODEL`: LLM model (default: `mistral`)
- `OLLAMA_EMBED_MODEL`: Embedding model (default: `nomic-embed-text`)
- `CHUNK_GAP_MINUTES`: Time gap to split conversations (default: 30)
- `RETRIEVAL_TOP_K`: Number of chunks to retrieve (default: 5)
