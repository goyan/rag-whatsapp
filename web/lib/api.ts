/**
 * API Client for RAG WhatsApp
 */

const API_BASE = '/api';

export interface QueryRequest {
  question: string;
  filters?: {
    participants?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  options?: {
    topK?: number;
    useAgent?: boolean;
    includeSources?: boolean;
  };
}

export interface ChunkSource {
  chunkId: string;
  score: number;
  participants: string[];
  timeRange: {
    start: string;
    end: string;
  };
  preview: string;
}

export interface QueryResponse {
  answer: string;
  sources: ChunkSource[];
  reasoning?: string[];
  metadata: {
    queryTime: number;
    chunksRetrieved: number;
  };
}

export interface IngestResult {
  success: boolean;
  result: {
    jobId: string;
    conversationId: string;
    conversationName?: string;
    totalMessages: number;
    totalChunks: number;
    participants: string[];
    dateRange: {
      start: string | null;
      end: string | null;
    };
    duration: number;
  };
}

export interface HealthStatus {
  status: 'ok' | 'healthy' | 'degraded';
  timestamp: string;
  components?: {
    providers: Array<{
      provider: string;
      available: boolean;
      latencyMs?: number;
    }>;
    vectorStore: {
      name: string;
      available: boolean;
    };
  };
}

/**
 * Query the RAG system
 */
export async function query(request: QueryRequest): Promise<QueryResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (err) {
    throw new Error('Failed to connect to API server. Is it running on port 3000?');
  }

  const text = await response.text();

  if (!response.ok) {
    try {
      const error = JSON.parse(text);
      throw new Error(error.error || 'Query failed');
    } catch {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from API');
  }
}

/**
 * Stream query response via WebSocket
 */
export function queryStream(
  request: QueryRequest,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {
  const ws = new WebSocket(`ws://${window.location.host}/api/query/stream`);

  ws.onopen = () => {
    ws.send(JSON.stringify(request));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'token') {
      onToken(data.data);
    } else if (data.type === 'done') {
      onDone();
      ws.close();
    } else if (data.type === 'error') {
      onError(data.error);
      ws.close();
    }
  };

  ws.onerror = () => {
    onError('WebSocket connection failed');
  };

  return () => ws.close();
}

/**
 * Ingest a WhatsApp export file
 */
export async function ingest(
  file: File,
  options?: {
    conversationName?: string;
    generateSummaries?: boolean;
  },
): Promise<IngestResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options?.conversationName) {
    formData.append('conversationName', options.conversationName);
  }
  if (options?.generateSummaries) {
    formData.append('generateSummaries', 'true');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/ingest`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Failed to connect to API server. Is it running on port 3000?');
  }

  const text = await response.text();

  if (!response.ok) {
    try {
      const error = JSON.parse(text);
      throw new Error(error.error || 'Ingestion failed');
    } catch {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from API');
  }
}

/**
 * Check system health
 */
export async function getHealth(): Promise<HealthStatus> {
  let response: Response;
  try {
    response = await fetch(`/health/detailed`);
  } catch {
    throw new Error('Failed to connect to API server');
  }

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from health check');
  }
}
