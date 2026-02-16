import { cleanEnv, str, num, bool } from 'envalid';

export const webEnv = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'] as const,
    default: 'development',
  }),

  // OpenRouter — custom query API
  OPENROUTER_API_KEY: str({ default: '' }),
  QUERY_API_MODEL: str({ default: 'anthropic/claude-haiku-4-5-20251001' }),

  // API rate limiting
  API_RATE_LIMIT: num({ default: 30 }),
  API_RATE_WINDOW_MS: num({ default: 3_600_000 }),

  // x402 micropayments
  ENABLE_X402: bool({ default: false }),
  X402_RECEIVER_ADDRESS: str({ default: '' }),
  X402_PRICE_CENTS: num({ default: 1 }),
  X402_FACILITATOR_URL: str({ default: 'https://x402.org/facilitator' }),

  // Email digest
  RESEND_API_KEY: str({ default: '' }),
  DIGEST_FROM_EMAIL: str({ default: 'digest@solis.rectorspace.com' }),
  DIGEST_UNSUBSCRIBE_SECRET: str({ default: '' }),
  DIGEST_API_SECRET: str({ default: '' }),

  // Data
  DATA_DIR: str({ default: '' }),
  REPORTS_DIR: str({ default: '' }),
});
