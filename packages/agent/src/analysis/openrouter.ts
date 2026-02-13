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

const PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-haiku-4.5': { input: 1.00 / 1_000_000, output: 5.00 / 1_000_000 },
  'z-ai/glm-4.7': { input: 0.40 / 1_000_000, output: 1.50 / 1_000_000 },
  'z-ai/glm-5': { input: 0.80 / 1_000_000, output: 2.56 / 1_000_000 },
  'z-ai/glm-4.7-flash': { input: 0.06 / 1_000_000, output: 0.40 / 1_000_000 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model] ?? { input: 0.001, output: 0.003 };
  return promptTokens * pricing.input + completionTokens * pricing.output;
}

/**
 * Check if an error is a server-side (5xx) error — fallback may help.
 */
export function isServerError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status >= 500 && status < 600;
  }
  return false;
}

function buildModelChain(): string[] {
  const fallbacks = env.OPENROUTER_FALLBACK_MODELS
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  return [env.OPENROUTER_MODEL, ...fallbacks];
}

/**
 * Send a prompt to an LLM via OpenRouter with automatic model fallback on 5xx errors.
 * Tries each model in the chain; on 4xx/other errors throws immediately (auth/config issue).
 */
export async function analyzeWithLLM(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema?: boolean,
): Promise<LLMResponse> {
  const models = buildModelChain();
  const log = logger.child({ component: 'openrouter' });
  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const modelLog = log.child({ model });
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

      if (i > 0) {
        modelLog.info('Fallback model succeeded');
      }

      modelLog.info({
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
      lastError = err;

      if (isServerError(err)) {
        const remaining = models.length - i - 1;
        modelLog.warn(
          { error: err instanceof Error ? err.message : err, latencyMs: Date.now() - start, fallbacksRemaining: remaining },
          `Server error (5xx) — ${remaining > 0 ? 'trying next model' : 'all models exhausted'}`,
        );
        continue;
      }

      // 4xx or non-HTTP error — throw immediately, fallback won't help
      modelLog.error({ error: err, latencyMs: Date.now() - start }, 'LLM analysis failed (non-retryable)');
      throw err;
    }
  }

  // All models exhausted with 5xx errors
  log.error({ modelsAttempted: models.length }, 'All fallback models exhausted');
  throw lastError;
}

/**
 * Parse JSON from LLM response, handling markdown code fences and trailing commentary.
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

  // First try: direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // LLMs sometimes append commentary after JSON — find the top-level closing brace
    const start = cleaned.indexOf('{');
    if (start !== -1) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\' && inString) { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) {
          try { return JSON.parse(cleaned.slice(start, i + 1)) as T; } catch { break; }
        }}
      }
    }

    const head = cleaned.slice(0, 200);
    const tail = cleaned.slice(-200);
    throw new Error(`Failed to parse LLM JSON (len=${cleaned.length}): head=${head} | tail=${tail}`);
  }
}
