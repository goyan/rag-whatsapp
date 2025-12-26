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

CRITICAL RULES FOR SEARCH:
- NEVER translate the user's query - keep it in the ORIGINAL LANGUAGE
- Names like "Romane", "Agnès", "Hervé" are PEOPLE'S NAMES, not objects or food
- This is personal WhatsApp chat history - search for names, topics, and keywords AS-IS
- If the question is in French, search in French
- Preserve accents and special characters in searches

IMPORTANT for Final Answer:
- Reply in the SAME LANGUAGE as the user's question
- Synthesize a clear, direct answer to the user's question
- Extract and highlight the KEY information from the conversations
- Include specific dates, names, and quotes when relevant
- Do NOT just list raw search results - interpret and summarize them
- If asking about advice/recommendations, state what advice was given

Begin!

Question: {question}
Thought:`;

const SYNTHESIS_PROMPT = `Based on the following conversation search results, provide a clear and helpful answer to the user's question.

## Question
{question}

## Search Results
{observations}

## Instructions
- RESPOND IN THE SAME LANGUAGE AS THE QUESTION (if French, reply in French)
- Synthesize the information into a clear, direct answer
- Extract the KEY points that answer the question
- Include specific details: dates, names, exact quotes when relevant
- If the question asks about advice/recommendations, clearly state what was said
- Write naturally, as if explaining to a friend
- If information is incomplete or unclear, acknowledge that
- Do NOT just repeat the raw messages - interpret and summarize them
- Names in the conversations (Romane, Agnès, Hervé, etc.) are PEOPLE

## Answer`;

export class ReActAgent {
  private steps: AgentStep[] = [];
  private currentQuestion: string = '';

  /**
   * Run the agent on a question
   */
  async run(
    question: string,
    _filters?: QueryFilters,
  ): Promise<QueryResponse> {
    const startTime = Date.now();
    this.steps = [];
    this.currentQuestion = question;

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

    // If no final answer after max iterations, use LLM to synthesize
    if (!finalAnswer) {
      finalAnswer = await this.synthesizeAnswer(llm);
    }

    return {
      answer: finalAnswer,
      sources: [],
      reasoning: this.formatReasoningSteps(),
      metadata: {
        queryTime: Date.now() - startTime,
        chunksRetrieved: this.steps.length,
      },
    };
  }

  /**
   * Format reasoning steps in a human-readable way
   */
  private formatReasoningSteps(): string[] {
    return this.steps.map((s) => {
      let formatted = s.thought || '';

      // Make action descriptions human-readable
      if (s.action) {
        const actionDesc = this.describeAction(s.action, s.actionInput);
        formatted = actionDesc;
      }

      return formatted;
    }).filter(s => s.length > 0);
  }

  /**
   * Convert raw action to human-readable description
   */
  private describeAction(action: string, input?: Record<string, unknown>): string {
    switch (action.toLowerCase()) {
      case 'search':
        return `Searched for "${input?.query || 'conversations'}"${input?.participant ? ` involving ${input.participant}` : ''}`;
      case 'filter_by_date':
        return `Filtered results by date range${input?.startDate ? ` from ${input.startDate}` : ''}${input?.endDate ? ` to ${input.endDate}` : ''}`;
      case 'summarize':
        return `Summarized findings about "${input?.topic || 'the topic'}"`;
      case 'get_participants':
        return 'Retrieved list of conversation participants';
      default:
        return `Performed ${action}`;
    }
  }

  /**
   * Use LLM to synthesize a proper answer from observations
   */
  private async synthesizeAnswer(llm: ReturnType<typeof getLLMProvider>): Promise<string> {
    const observations = this.steps
      .filter((s) => s.observation && !s.observation.startsWith('Error'))
      .map((s) => s.observation)
      .join('\n\n---\n\n');

    if (!observations) {
      return "I searched through the conversations but couldn't find relevant information for your question.";
    }

    const prompt = SYNTHESIS_PROMPT
      .replace('{question}', this.currentQuestion)
      .replace('{observations}', observations);

    try {
      const answer = await llm.generate(prompt, {
        maxTokens: 500,
        temperature: 0.5,
      });
      return answer.trim();
    } catch {
      // Fallback to basic summary if LLM fails
      return this.fallbackSummary();
    }
  }

  /**
   * Fallback summary without LLM
   */
  private fallbackSummary(): string {
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
}

// Singleton
let agentInstance: ReActAgent | null = null;

export function getReActAgent(): ReActAgent {
  if (!agentInstance) {
    agentInstance = new ReActAgent();
  }
  return agentInstance;
}
