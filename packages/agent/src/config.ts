import { cleanEnv, str, num, bool } from 'envalid';
import { resolve } from 'node:path';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'] as const,
    default: 'development',
  }),

  // OpenRouter — GLM-4.7 analysis
  OPENROUTER_API_KEY: str({
    desc: 'OpenRouter API key for GLM-4.7',
  }),

  // GitHub API — Layer 1 (Leading)
  GITHUB_TOKEN: str({
    desc: 'GitHub personal access token (5K req/hr)',
  }),

  // Helius — Layer 2 (Coincident / Onchain)
  HELIUS_API_KEY: str({
    desc: 'Helius API key (1M credits/mo free)',
  }),

  // CoinGecko — Layer 3 (Confirming)
  COINGECKO_API_KEY: str({
    default: '',
    desc: 'CoinGecko API key (optional, increases rate limit)',
  }),

  // Analysis config
  OPENROUTER_MODEL: str({
    default: 'z-ai/glm-4.7',
    desc: 'OpenRouter model ID for analysis',
  }),
  ANOMALY_THRESHOLD: num({
    default: 2.0,
    desc: 'Z-score threshold for anomaly detection',
  }),

  // Output — resolve to monorepo root (packages/agent/ → ../../reports)
  REPORTS_DIR: str({
    default: resolve(import.meta.dirname, '..', '..', '..', 'reports'),
    desc: 'Directory for report output',
  }),

  LOG_LEVEL: str({
    choices: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const,
    default: 'info',
  }),

  // Repo discovery — opt-in dynamic GitHub Search
  ENABLE_REPO_DISCOVERY: bool({
    default: false,
    desc: 'Enable dynamic Solana repo discovery via GitHub Search API',
  }),
  DISCOVERY_MIN_STARS: num({
    default: 50,
    desc: 'Minimum stars threshold for discovered repos',
  }),
});
