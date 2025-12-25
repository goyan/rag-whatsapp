/**
 * ReAct Agent
 * Implements the ReAct (Reasoning + Acting) pattern for complex queries
 */

import { getLLMProvider } from '../../providers/index.js';
import { AGENT_TOOLS, getTool, formatToolsForPrompt } from './tools.js';
import type { QueryFilters, QueryResponse } from '../types.js';

const MAX_ITERATIONS = 5;

interface AgentStep {
  thought: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  observation?: string;
}

const REACT_PROMPT = `You are an AI assistant that helps users query their WhatsApp conversation history.
You have access to the following tools:

${formatToolsForPrompt()}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${AGENT_TOOLS.map((t) => t.name).join(', ')}]
Action Input: the input to the action as JSON
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {question}
Thought:`;

export class ReActAgent {
  private steps: AgentStep[] = [];

  /**
   * Run the agent on a question
   */
  async run(
    question: string,
    _filters?: QueryFilters,
  ): Promise<QueryResponse> {
    const startTime = Date.now();
    this.steps = [];

    const llm = getLLMProvider();
    let prompt = REACT_PROMPT.replace('{question}', question);
    let iterations = 0;
    let finalAnswer = '';

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Get next step from LLM
      const response = await llm.generate(prompt, {
        maxTokens: 500,
        temperature: 0.3,
        stopSequences: ['\nObservation:', '\nQuestion:'],
      });

      const parsed = this.parseResponse(response);

      if (parsed.finalAnswer) {
        finalAnswer = parsed.finalAnswer;
        break;
      }

      if (parsed.action && parsed.actionInput) {
        // Execute the tool
        const tool = getTool(parsed.action);
        let observation: string;

        if (tool) {
          try {
            observation = await tool.execute(parsed.actionInput);
          } catch (error) {
            observation = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        } else {
          observation = `Error: Unknown tool "${parsed.action}"`;
        }

        this.steps.push({
          thought: parsed.thought || '',
          action: parsed.action,
          actionInput: parsed.actionInput,
          observation,
        });

        // Add to prompt for next iteration
        prompt += response + `\nObservation: ${observation}\nThought:`;
      } else {
        // No action parsed, try to get final answer
        prompt += response + '\nThought: I should provide a final answer now.\nFinal Answer:';
      }
    }

    // If no final answer after max iterations, summarize what we found
    if (!finalAnswer) {
      finalAnswer = this.summarizeSteps();
    }

    return {
      answer: finalAnswer,
      sources: [],
      reasoning: this.steps.map((s) => {
        let step = `Thought: ${s.thought}`;
        if (s.action) step += `\nAction: ${s.action}(${JSON.stringify(s.actionInput)})`;
        if (s.observation) step += `\nObservation: ${s.observation.slice(0, 200)}...`;
        return step;
      }),
      metadata: {
        queryTime: Date.now() - startTime,
        chunksRetrieved: this.steps.length,
      },
    };
  }

  private parseResponse(response: string): {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    finalAnswer?: string;
  } {
    const result: {
      thought?: string;
      action?: string;
      actionInput?: Record<string, unknown>;
      finalAnswer?: string;
    } = {};

    // Check for final answer
    const finalMatch = response.match(/Final Answer:\s*([\s\S]*?)(?:$|\n\n)/i);
    if (finalMatch) {
      result.finalAnswer = finalMatch[1].trim();
      return result;
    }

    // Parse thought
    const thoughtMatch = response.match(/(?:^|\n)(.+?)(?=\nAction:|$)/s);
    if (thoughtMatch) {
      result.thought = thoughtMatch[1].trim();
    }

    // Parse action
    const actionMatch = response.match(/Action:\s*(\w+)/i);
    if (actionMatch) {
      result.action = actionMatch[1];
    }

    // Parse action input
    const inputMatch = response.match(/Action Input:\s*(\{[\s\S]*?\})/i);
    if (inputMatch) {
      try {
        result.actionInput = JSON.parse(inputMatch[1]);
      } catch {
        // Try to parse as simple key-value
        const simpleMatch = response.match(/Action Input:\s*(.+?)(?:\n|$)/i);
        if (simpleMatch) {
          result.actionInput = { query: simpleMatch[1].trim() };
        }
      }
    }

    return result;
  }

  private summarizeSteps(): string {
    if (this.steps.length === 0) {
      return "I wasn't able to find relevant information for your question.";
    }

    const observations = this.steps
      .filter((s) => s.observation && !s.observation.startsWith('Error'))
      .map((s) => s.observation)
      .join('\n\n');

    if (!observations) {
      return "I searched but couldn't find relevant information in the conversations.";
    }

    return `Based on my search, here's what I found:\n\n${observations}`;
  }
}

// Singleton
let agentInstance: ReActAgent | null = null;

export function getReActAgent(): ReActAgent {
  if (!agentInstance) {
    agentInstance = new ReActAgent();
  }
  return agentInstance;
}
