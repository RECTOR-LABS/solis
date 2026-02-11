import OpenAI from 'openai';
import { env } from '../config.js';
import { logger } from '../logger.js';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://solis.rectorspace.com',
    'X-Title': 'SOLIS',
  },
});

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  costUsd: number;
}

// GLM-4.7 pricing: $0.40/M in, $1.50/M out
const PRICING = {
  'z-ai/glm-4.7': { input: 0.40 / 1_000_000, output: 1.50 / 1_000_000 },
} as Record<string, { input: number; output: number }>;

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model] ?? { input: 0.001, output: 0.003 };
  return promptTokens * pricing.input + completionTokens * pricing.output;
}

/**
 * Send a prompt to GLM-4.7 via OpenRouter and get structured JSON response.
 */
export async function analyzeWithLLM(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema?: boolean,
): Promise<LLMResponse> {
  const model = env.OPENROUTER_MODEL;
  const log = logger.child({ component: 'openrouter', model });
  const start = Date.now();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(jsonSchema ? { response_format: { type: 'json_object' as const } } : {}),
      temperature: 0.3,
      max_tokens: 16_384,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const cost = estimateCost(model, usage.prompt_tokens, usage.completion_tokens);

    log.info({
      latencyMs: Date.now() - start,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      costUsd: cost.toFixed(6),
    }, 'LLM analysis complete');

    return {
      content,
      model,
      tokensUsed: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens,
      },
      costUsd: cost,
    };
  } catch (err) {
    log.error({ error: err, latencyMs: Date.now() - start }, 'LLM analysis failed');
    throw err;
  }
}

/**
 * Parse JSON from LLM response, handling markdown code fences.
 */
export function parseLLMJson<T>(content: string): T {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
