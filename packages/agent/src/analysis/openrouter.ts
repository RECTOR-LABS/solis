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
 * Check if an error is a server-side (5xx) error — fallback to a different model may help.
 */
export function isServerError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status >= 500 && status < 600;
  }
  return false;
}

/**
 * Transient errors that may resolve with a same-model retry after backoff.
 * - 401: OpenRouter intermittent "User not found" (not a real auth failure)
 * - 408: Request timeout
 * - 429: Rate limited
 */
const TRANSIENT_STATUS_CODES = new Set([401, 408, 429]);
const MAX_TRANSIENT_RETRIES = 2;
const TRANSIENT_BASE_DELAY_MS = 3000;

export function isTransientError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return TRANSIENT_STATUS_CODES.has((err as { status: number }).status);
  }
  return false;
}

function getErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status;
  }
  return undefined;
}

function buildModelChain(): string[] {
  const fallbacks = env.OPENROUTER_FALLBACK_MODELS
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  return [env.OPENROUTER_MODEL, ...fallbacks];
}

/**
 * Send a prompt to an LLM via OpenRouter with automatic retry and model fallback.
 *
 * Retry strategy:
 * - Transient errors (401/408/429): retry same model up to MAX_TRANSIENT_RETRIES with backoff
 * - Server errors (5xx): skip to next model in fallback chain
 * - Other 4xx (400/403): throw immediately — config/auth issue, retrying won't help
 */
export async function analyzeWithLLM(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema?: boolean,
  modelOverride?: string,
): Promise<LLMResponse> {
  const models = modelOverride ? [modelOverride] : buildModelChain();
  const log = logger.child({ component: 'openrouter' });
  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const modelLog = log.child({ model });

    for (let retry = 0; retry <= MAX_TRANSIENT_RETRIES; retry++) {
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
        const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : undefined;
        const latencyMs = Date.now() - start;

        // Transient error — retry same model with backoff
        if (isTransientError(err) && retry < MAX_TRANSIENT_RETRIES) {
          const delay = TRANSIENT_BASE_DELAY_MS * (retry + 1);
          modelLog.warn(
            { status, retry: retry + 1, maxRetries: MAX_TRANSIENT_RETRIES, delayMs: delay, latencyMs },
            `Transient error (${status}) — retrying same model`,
          );
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Server error OR exhausted transient retries — try next model
        if (isServerError(err) || isTransientError(err)) {
          const remaining = models.length - i - 1;
          modelLog.warn(
            { status, latencyMs, fallbacksRemaining: remaining, error: err instanceof Error ? err.message : err },
            `${isTransientError(err) ? `Transient error (${status}) retries exhausted` : `Server error (${status})`} — ${remaining > 0 ? 'trying next model' : 'all models exhausted'}`,
          );
          break; // break retry loop, continue model loop
        }

        // True 4xx (400, 403) or non-HTTP error — throw immediately
        modelLog.error({ status, latencyMs, error: err }, 'LLM analysis failed (non-retryable)');
        throw err;
      }
    }
  }

  // All models exhausted
  log.error({ modelsAttempted: models.length }, 'All models exhausted (server + transient errors)');
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
