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

  // Collection periods
  COLLECTION_PERIOD_DAYS: num({
    default: 14,
    desc: 'Lookback period for signal collection (days)',
  }),

  // LLM signal condensation limits
  LLM_TOP_REPOS: num({
    default: 30,
    desc: 'Max repos sent to LLM for clustering',
  }),
  LLM_TOP_PROGRAMS: num({
    default: 15,
    desc: 'Max onchain programs sent to LLM for clustering',
  }),
  LLM_TOP_TOKENS: num({
    default: 20,
    desc: 'Max tokens sent to LLM for clustering',
  }),

  // API throttle delays (ms)
  GITHUB_THROTTLE_MS: num({
    default: 500,
    desc: 'Delay between GitHub API batch requests (ms)',
  }),
  COINGECKO_THROTTLE_MS: num({
    default: 2000,
    desc: 'Delay between CoinGecko API requests (ms)',
  }),
  HELIUS_THROTTLE_MS: num({
    default: 300,
    desc: 'Delay between Helius RPC batch requests (ms)',
  }),

  // CoinGecko pagination
  COINGECKO_MAX_PAGES: num({
    default: 2,
    desc: 'Max pages of Solana tokens to fetch (100 per page)',
  }),

  // DeFi Llama filters
  DEFILLAMA_MIN_TVL: num({
    default: 100_000,
    desc: 'Minimum TVL ($) to include a protocol',
  }),

  // Helius programs config (JSON file path)
  HELIUS_PROGRAMS_PATH: str({
    default: '',
    desc: 'Path to JSON file with Helius programs to track (overrides built-in list)',
  }),

  // Alerting
  ALERTS_ENABLED: bool({
    default: false,
    desc: 'Enable post-pipeline alert notifications',
  }),
  ALERT_CHANNEL: str({
    choices: ['telegram', 'discord'] as const,
    default: 'telegram',
    desc: 'Notification channel for alerts',
  }),
  TELEGRAM_BOT_TOKEN: str({
    default: '',
    desc: 'Telegram bot token from @BotFather',
  }),
  TELEGRAM_CHAT_ID: str({
    default: '',
    desc: 'Telegram chat/channel ID for alerts',
  }),
  DISCORD_WEBHOOK_URL: str({
    default: '',
    desc: 'Discord webhook URL for alerts',
  }),
  ALERT_ANOMALY_THRESHOLD: num({
    default: 3.0,
    desc: 'Z-score threshold to trigger anomaly spike alerts',
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

  // Social signals — opt-in LunarCrush Layer 0
  ENABLE_SOCIAL_SIGNALS: bool({
    default: false,
    desc: 'Enable social signal collection via LunarCrush API',
  }),
  LUNARCRUSH_API_KEY: str({
    default: '',
    desc: 'LunarCrush API key (v4 Bearer token)',
  }),
  LUNARCRUSH_THROTTLE_MS: num({
    default: 1000,
    desc: 'Delay between LunarCrush API requests (ms)',
  }),
  LLM_TOP_SOCIAL_COINS: num({
    default: 20,
    desc: 'Max social coins sent to LLM for clustering',
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
