import { cleanEnv, str, num } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'] as const,
    default: 'development',
  }),

  // Claude Agent SDK — orchestration
  ANTHROPIC_API_KEY: str({
    desc: 'Anthropic API key for Claude Agent SDK',
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

  // Output
  REPORTS_DIR: str({
    default: './reports',
    desc: 'Directory for report output',
  }),

  LOG_LEVEL: str({
    choices: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const,
    default: 'info',
  }),
});
