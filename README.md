# RAG WhatsApp

A smart RAG (Retrieval-Augmented Generation) system to query your WhatsApp chat history using natural language.

## Features

- **Semantic Search**: Find messages by meaning, not just keywords
- **Temporal Understanding**: "What did John say last week?"
- **Multi-step Reasoning**: ReAct agent for complex queries
- **Multi-Provider**: Ollama, OpenAI, or Claude - switch with one env var
- **Parallel Agents**: Run multiple agents for concurrent feature development

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### One-Line Install

```bash
# Clone, install, and start infrastructure
git clone https://github.com/goyan/rag-whatsapp && cd rag-whatsapp && pnpm install && pnpm docker:up
```

### Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Start infrastructure (Qdrant, Redis, Ollama)
pnpm docker:up

# 4. Pull Ollama models (first time only)
pnpm ollama:pull

# 5. Start dev server
pnpm dev
```

## Configuration

### LLM Provider Switch

Edit `.env` to switch between providers:

```bash
# === LLM PROVIDER ===
# Options: ollama | openai | claude
LLM_PROVIDER=ollama

# === OLLAMA (local, free) ===
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_EMBED_MODEL=nomic-embed-text

# === OPENAI ===
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# === CLAUDE (Anthropic) ===
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# === EMBEDDINGS PROVIDER ===
# Options: ollama | openai
# Note: Claude doesn't have embeddings API, use ollama or openai
EMBED_PROVIDER=ollama
```

### Provider Comparison

| Provider | Cost | Speed | Quality | Local |
|----------|------|-------|---------|-------|
| **Ollama** | Free | Medium | Good | Yes |
| **OpenAI** | $$$ | Fast | Excellent | No |
| **Claude** | $$$ | Fast | Excellent | No |

### Recommended Configurations

**Development (Free)**
```bash
LLM_PROVIDER=ollama
EMBED_PROVIDER=ollama
```

**Production (Best Quality)**
```bash
LLM_PROVIDER=claude
EMBED_PROVIDER=openai
```

**Hybrid (Cost-Effective)**
```bash
LLM_PROVIDER=openai
EMBED_PROVIDER=ollama  # Embeddings locally, LLM via API
```

## Usage

### Import WhatsApp Export

```bash
# Export your WhatsApp chat (from app: Chat > More > Export Chat)
pnpm ingest ./path/to/whatsapp-export.txt
```

### Query via CLI

```bash
pnpm query "When did John want to meet?"
pnpm query "What did we discuss about the project last week?"
```

### Query via API

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "When did John want to meet?"}'
```

### Start Web UI

```bash
pnpm dev:web
# Open http://localhost:3001
```

## Parallel Agents (Vibe Coding)

Run multiple development agents in parallel for faster feature implementation:

```bash
# Terminal 1: Core RAG features
pnpm agent:start rag

# Terminal 2: API development
pnpm agent:start api

# Terminal 3: UI components
pnpm agent:start ui

# Or run all in parallel
pnpm agents:parallel
```

### Agent Configuration

Create custom agents in `agents/`:

```typescript
// agents/custom-agent.ts
export default {
  name: 'custom',
  focus: ['src/features/custom/**'],
  tasks: [
    'Implement custom feature X',
    'Add tests for feature X',
  ],
};
```

### Agent Commands

```bash
pnpm agent:list          # List available agents
pnpm agent:start <name>  # Start specific agent
pnpm agent:stop <name>   # Stop specific agent
pnpm agents:status       # Show all running agents
pnpm agents:parallel     # Start all agents in parallel
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests |
| `pnpm docker:up` | Start infrastructure |
| `pnpm docker:down` | Stop infrastructure |
| `pnpm ollama:pull` | Pull Ollama models |
| `pnpm ingest <file>` | Ingest WhatsApp export |
| `pnpm query "<q>"` | Query via CLI |

## Project Structure

```
rag-whatsapp/
├── src/
│   ├── api/              # Fastify API routes
│   ├── core/             # Core services
│   │   ├── parser/       # WhatsApp export parser
│   │   ├── chunker/      # Temporal chunking
│   │   ├── embedder/     # Multi-provider embeddings
│   │   └── summarizer/   # LLM summarization
│   ├── rag/              # RAG engine & ReAct agent
│   ├── providers/        # LLM provider abstractions
│   │   ├── ollama.ts
│   │   ├── openai.ts
│   │   └── claude.ts
│   ├── storage/          # Qdrant & SQLite
│   └── config/           # Configuration
├── agents/               # Parallel agent definitions
├── docker/               # Docker configs
├── scripts/              # CLI scripts
└── tests/
```

## Deployment (VPS OVH)

```bash
# On VPS
git clone https://github.com/goyan/rag-whatsapp
cd rag-whatsapp
cp .env.example .env
# Edit .env with production values

# Start with Docker Compose
docker compose -f docker/docker-compose.prod.yml up -d
```

### VPS Requirements

| Config | RAM | Use Case |
|--------|-----|----------|
| Starter | 4GB | API providers only |
| Essential | 8GB | Ollama embeddings |
| Comfort | 16GB | Full Ollama stack |

## License

MIT
