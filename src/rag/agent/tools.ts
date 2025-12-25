/**
 * Agent Tools
 * Tools available to the ReAct agent
 */

import { getRetriever } from '../retriever.js';
import { getChunkText } from '../../core/chunker/index.js';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

/**
 * Search tool - semantic search through conversations
 */
export const searchTool: Tool = {
  name: 'search',
  description: 'Search through WhatsApp conversations for relevant messages. Use this to find information about specific topics, people, or time periods.',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query - what you want to find',
      required: true,
    },
    participant: {
      type: 'string',
      description: 'Filter by participant name (optional)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results (default: 3)',
    },
  },
  execute: async (params) => {
    const query = params.query as string;
    const participant = params.participant as string | undefined;
    const limit = (params.limit as number) || 3;

    const retriever = getRetriever();
    const { chunks, scores } = await retriever.retrieve(query, {
      topK: limit,
      minScore: 0.6,
      filters: participant ? { participants: [participant] } : undefined,
    });

    if (chunks.length === 0) {
      return 'No relevant conversations found for this query.';
    }

    return chunks.map((chunk, i) => {
      const text = getChunkText(chunk);
      const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text;
      return `[Result ${i + 1}, Score: ${scores[i].toFixed(2)}]\n${truncated}`;
    }).join('\n\n---\n\n');
  },
};

/**
 * Filter by date tool
 */
export const filterByDateTool: Tool = {
  name: 'filter_by_date',
  description: 'Search conversations within a specific date range.',
  parameters: {
    query: {
      type: 'string',
      description: 'What to search for',
      required: true,
    },
    startDate: {
      type: 'string',
      description: 'Start date in YYYY-MM-DD format',
    },
    endDate: {
      type: 'string',
      description: 'End date in YYYY-MM-DD format',
    },
  },
  execute: async (params) => {
    const query = params.query as string;
    const startDate = params.startDate ? new Date(params.startDate as string) : undefined;
    const endDate = params.endDate ? new Date(params.endDate as string) : undefined;

    const retriever = getRetriever();
    const { chunks, scores } = await retriever.retrieve(query, {
      topK: 3,
      minScore: 0.5,
      filters: {
        dateRange: { start: startDate, end: endDate },
      },
    });

    if (chunks.length === 0) {
      return 'No conversations found in the specified date range.';
    }

    return chunks.map((chunk, i) => {
      const dateRange = `${chunk.startTime.toLocaleDateString()} - ${chunk.endTime.toLocaleDateString()}`;
      const text = getChunkText(chunk);
      const truncated = text.length > 400 ? text.slice(0, 400) + '...' : text;
      return `[${dateRange}, Score: ${scores[i].toFixed(2)}]\n${truncated}`;
    }).join('\n\n---\n\n');
  },
};

/**
 * List participants tool
 */
export const listParticipantsTool: Tool = {
  name: 'list_participants',
  description: 'List all participants in the conversations related to a topic.',
  parameters: {
    topic: {
      type: 'string',
      description: 'Topic to search for',
      required: true,
    },
  },
  execute: async (params) => {
    const topic = params.topic as string;

    const retriever = getRetriever();
    const { chunks } = await retriever.retrieve(topic, { topK: 10, minScore: 0.5 });

    const participants = new Set<string>();
    chunks.forEach((chunk) => {
      chunk.participants.forEach((p) => participants.add(p));
    });

    if (participants.size === 0) {
      return 'No participants found for this topic.';
    }

    return `Participants discussing "${topic}":\n${Array.from(participants).join('\n')}`;
  },
};

/**
 * Get conversation summary tool
 */
export const summarizeConversationTool: Tool = {
  name: 'summarize',
  description: 'Get a summary of conversations about a specific topic.',
  parameters: {
    topic: {
      type: 'string',
      description: 'Topic to summarize',
      required: true,
    },
  },
  execute: async (params) => {
    const topic = params.topic as string;

    const retriever = getRetriever();
    const { chunks } = await retriever.retrieve(topic, { topK: 5, minScore: 0.6 });

    if (chunks.length === 0) {
      return 'No conversations found to summarize.';
    }

    // Build a brief overview
    const overview = chunks.map((chunk) => {
      const date = chunk.startTime.toLocaleDateString();
      const people = chunk.participants.slice(0, 3).join(', ');
      const messageCount = chunk.metadata.messageCount;
      return `- ${date}: ${people} (${messageCount} messages)`;
    }).join('\n');

    return `Found ${chunks.length} conversation segments about "${topic}":\n${overview}`;
  },
};

/**
 * All available tools
 */
export const AGENT_TOOLS: Tool[] = [
  searchTool,
  filterByDateTool,
  listParticipantsTool,
  summarizeConversationTool,
];

/**
 * Get tool by name
 */
export function getTool(name: string): Tool | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}

/**
 * Format tools for prompt
 */
export function formatToolsForPrompt(): string {
  return AGENT_TOOLS.map((tool) => {
    const params = Object.entries(tool.parameters)
      .map(([name, info]) => `  - ${name} (${info.type}${info.required ? ', required' : ''}): ${info.description}`)
      .join('\n');
    return `${tool.name}: ${tool.description}\nParameters:\n${params}`;
  }).join('\n\n');
}
