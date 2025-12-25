# RAG WhatsApp - Implementation Plan

## Overview

Build a RAG system to query WhatsApp chat history using natural language, with support for multiple LLM providers and parallel agent development.

**Repository**: https://github.com/goyan/rag-whatsapp

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐    │
│  │   CLI   │  │ Web UI  │  │   API   │  │  Parallel Agents    │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────────┬──────────┘    │
└───────┼────────────┼────────────┼──────────────────┼────────────────┘
        │            │            │                  │
        ▼            ▼            ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Fastify)                         │
│  POST /api/ingest  │  POST /api/query  │  GET /api/conversations   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PROVIDER ABSTRACTION                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    LLMProvider Interface                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │   │
│  │  │  Ollama  │  │  OpenAI  │  │  Claude  │                   │   │
│  │  └──────────┘  └──────────┘  └──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  EmbedProvider Interface                     │   │
│  │  ┌──────────┐  ┌──────────┐                                 │   │
│  │  │  Ollama  │  │  OpenAI  │                                 │   │
│  │  └──────────┘  └──────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATION                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Ingestion   │  │  RAG Engine  │  │ ReAct Agent  │              │
│  │  Pipeline    │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE SERVICES                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │   Parser   │  │  Chunker   │  │  Embedder  │  │ Summarizer │    │
│  │ (WhatsApp) │  │ (temporal) │  │            │  │            │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INFRASTRUCTURE                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │     Qdrant     │  │     Redis      │  │     SQLite     │        │
│  │   (vectors)    │  │    (queues)    │  │   (metadata)   │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Provider Abstraction Design

### LLM Provider Interface

```typescript
// src/providers/types.ts
interface LLMProvider {
  name: string;

  generate(prompt: string, options?: GenerateOptions): Promise<string>;

  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;

  chat(messages: Message[], options?: ChatOptions): Promise<string>;
}

interface EmbedProvider {
  name: string;
  dimensions: number;

  embed(text: string): Promise<number[]>;

  embedBatch(texts: string[]): Promise<number[][]>;
}
```

### Provider Factory

```typescript
// src/providers/factory.ts
import { config } from '../config';

export function createLLMProvider(): LLMProvider {
  switch (config.llmProvider) {
    case 'ollama':
      return new OllamaProvider(config.ollama);
    case 'openai':
      return new OpenAIProvider(config.openai);
    case 'claude':
      return new ClaudeProvider(config.anthropic);
    default:
      throw new Error(`Unknown LLM provider: ${config.llmProvider}`);
  }
}

export function createEmbedProvider(): EmbedProvider {
  switch (config.embedProvider) {
    case 'ollama':
      return new OllamaEmbedProvider(config.ollama);
    case 'openai':
      return new OpenAIEmbedProvider(config.openai);
    default:
      throw new Error(`Unknown embed provider: ${config.embedProvider}`);
  }
}
```

---

## Implementation Phases

### Phase 1: Project Setup
**Agent: `setup`**

- [ ] Initialize Node.js project with TypeScript
- [ ] Configure ESLint, Prettier, Vitest
- [ ] Create Docker Compose (Qdrant, Redis, Ollama)
- [ ] Setup environment configuration
- [ ] Create provider abstraction interfaces

**Files:**
```
package.json
tsconfig.json
docker/docker-compose.yml
docker/docker-compose.prod.yml
src/config/index.ts
src/config/schema.ts
.env.example
```

---

### Phase 2: Provider Implementations
**Agent: `providers`**

- [ ] Implement Ollama provider (LLM + Embeddings)
- [ ] Implement OpenAI provider (LLM + Embeddings)
- [ ] Implement Claude provider (LLM only)
- [ ] Create provider factory with runtime switching
- [ ] Add provider health checks

**Files:**
```
src/providers/types.ts
src/providers/factory.ts
src/providers/ollama.ts
src/providers/openai.ts
src/providers/claude.ts
src/providers/health.ts
```

---

### Phase 3: WhatsApp Parser & Chunker
**Agent: `parser`**

- [ ] Parse WhatsApp export format (multiple locales)
- [ ] Handle media placeholders
- [ ] Implement temporal chunking (30min gap)
- [ ] Extract metadata (participants, dates)
- [ ] Unit tests for parser

**Files:**
```
src/core/parser/whatsapp.ts
src/core/parser/types.ts
src/core/chunker/temporal.ts
src/core/chunker/types.ts
tests/parser.test.ts
tests/chunker.test.ts
```

---

### Phase 4: Ingestion Pipeline
**Agent: `ingestion`**

- [ ] Create ingestion queue (BullMQ)
- [ ] Implement chunk summarization
- [ ] Generate embeddings for chunks
- [ ] Store in Qdrant with metadata
- [ ] Progress tracking & resumable imports

**Files:**
```
src/ingestion/pipeline.ts
src/ingestion/queue.ts
src/ingestion/worker.ts
src/core/summarizer/index.ts
src/storage/vector.ts
src/storage/metadata.ts
```

---

### Phase 5: RAG Engine
**Agent: `rag`**

- [ ] Implement semantic retrieval
- [ ] Add metadata filtering (person, date)
- [ ] Hybrid search (semantic + filters)
- [ ] Response generation with context
- [ ] Citation support

**Files:**
```
src/rag/retriever.ts
src/rag/generator.ts
src/rag/filters.ts
src/rag/types.ts
tests/rag.test.ts
```

---

### Phase 6: ReAct Agent
**Agent: `agent`**

- [ ] Define agent tools (search, filter, extract)
- [ ] Implement ReAct reasoning loop
- [ ] Add temporal query understanding
- [ ] Multi-step query decomposition
- [ ] Agent memory for context

**Files:**
```
src/rag/agent/index.ts
src/rag/agent/tools.ts
src/rag/agent/prompts.ts
src/rag/agent/memory.ts
tests/agent.test.ts
```

---

### Phase 7: API Layer
**Agent: `api`**

- [ ] Fastify server setup
- [ ] POST /api/ingest (file upload)
- [ ] POST /api/query (RAG query)
- [ ] GET /api/conversations (list)
- [ ] WebSocket for streaming responses
- [ ] OpenAPI documentation

**Files:**
```
src/api/server.ts
src/api/routes/ingest.ts
src/api/routes/query.ts
src/api/routes/conversations.ts
src/api/websocket.ts
src/api/openapi.ts
```

---

### Phase 8: CLI
**Agent: `cli`**

- [ ] Ingest command
- [ ] Query command (interactive)
- [ ] Config command
- [ ] Status command
- [ ] Rich terminal output (ora, chalk)

**Files:**
```
src/cli/index.ts
src/cli/commands/ingest.ts
src/cli/commands/query.ts
src/cli/commands/config.ts
scripts/cli.ts
```

---

### Phase 9: Web UI
**Agent: `ui`**

- [ ] Next.js setup
- [ ] Chat interface
- [ ] File upload for ingestion
- [ ] Conversation browser
- [ ] Settings page (provider switch)

**Files:**
```
web/
├── app/
│   ├── page.tsx
│   ├── chat/page.tsx
│   ├── settings/page.tsx
│   └── api/
├── components/
│   ├── ChatInput.tsx
│   ├── MessageList.tsx
│   └── FileUpload.tsx
└── lib/
    └── api.ts
```

---

### Phase 10: Deployment
**Agent: `devops`**

- [ ] Production Docker Compose
- [ ] Nginx reverse proxy config
- [ ] SSL with Let's Encrypt
- [ ] Systemd service files
- [ ] Backup scripts
- [ ] Monitoring (health endpoints)

**Files:**
```
docker/docker-compose.prod.yml
docker/nginx.conf
deploy/setup.sh
deploy/backup.sh
deploy/rag-whatsapp.service
```

---

## Parallel Agent System

### Agent Definition

```typescript
// agents/types.ts
interface AgentConfig {
  name: string;
  description: string;
  focus: string[];           // Glob patterns for files
  dependencies: string[];    // Other agents that must complete first
  tasks: Task[];
}

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  files: string[];
}
```

### Agent Registry

```typescript
// agents/registry.ts
export const agents: AgentConfig[] = [
  {
    name: 'setup',
    description: 'Project initialization and configuration',
    focus: ['package.json', 'tsconfig.json', 'docker/**', 'src/config/**'],
    dependencies: [],
    tasks: [...]
  },
  {
    name: 'providers',
    description: 'LLM provider implementations',
    focus: ['src/providers/**'],
    dependencies: ['setup'],
    tasks: [...]
  },
  {
    name: 'parser',
    description: 'WhatsApp parsing and chunking',
    focus: ['src/core/parser/**', 'src/core/chunker/**'],
    dependencies: ['setup'],
    tasks: [...]
  },
  // ... more agents
];
```

### Parallel Execution

```bash
# These can run in parallel (no dependencies between them)
pnpm agent:start providers &
pnpm agent:start parser &
pnpm agent:start api &

# Or use the orchestrator
pnpm agents:parallel --max-concurrent=3
```

### Agent Orchestrator

```typescript
// agents/orchestrator.ts
class AgentOrchestrator {
  async runParallel(maxConcurrent: number = 3) {
    const ready = this.getReadyAgents();  // No pending dependencies
    const running: Promise<void>[] = [];

    for (const agent of ready) {
      if (running.length >= maxConcurrent) {
        await Promise.race(running);
      }
      running.push(this.runAgent(agent));
    }

    await Promise.all(running);
  }
}
```

---

## Data Models

### Message

```typescript
interface Message {
  id: string;
  timestamp: Date;
  sender: string;
  content: string;
  type: 'text' | 'media' | 'system';
}
```

### Chunk

```typescript
interface Chunk {
  id: string;
  messages: Message[];
  participants: string[];
  startTime: Date;
  endTime: Date;
  summary: string;
  embedding?: number[];
  metadata: {
    messageCount: number;
    conversationId: string;
  };
}
```

### Query

```typescript
interface QueryRequest {
  question: string;
  filters?: {
    participants?: string[];
    dateRange?: { start: Date; end: Date };
  };
  useAgent?: boolean;  // Use ReAct agent for complex queries
}

interface QueryResponse {
  answer: string;
  sources: ChunkReference[];
  reasoning?: string[];  // Agent reasoning steps
}
```

---

## Tech Stack Summary

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 20 | LTS, native fetch, ESM |
| Language | TypeScript 5 | Type safety, DX |
| API | Fastify | Performance, schema validation |
| Vector DB | Qdrant | Filtering, lightweight, Docker |
| Queue | BullMQ + Redis | Reliable async processing |
| Metadata DB | SQLite (dev) / PostgreSQL (prod) | Simple, no setup |
| LLM | Ollama / OpenAI / Claude | Flexibility |
| Embeddings | Ollama / OpenAI | Cost vs quality choice |
| Web UI | Next.js 14 | React, SSR, API routes |
| Testing | Vitest | Fast, ESM native |

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# LLM Provider: ollama | openai | claude
LLM_PROVIDER=ollama

# Embeddings Provider: ollama | openai
EMBED_PROVIDER=ollama

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_EMBED_MODEL=nomic-embed-text

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# Anthropic (Claude)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=whatsapp_chunks

# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=sqlite://./data/metadata.db
```

---

## Next Steps

1. Run `pnpm agent:start setup` to initialize project
2. Run providers, parser, and api agents in parallel
3. Integrate and test end-to-end
4. Deploy to VPS OVH

---

## Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [LangChain.js](https://js.langchain.com/)
- [Fastify](https://fastify.dev/)
- [BullMQ](https://docs.bullmq.io/)
