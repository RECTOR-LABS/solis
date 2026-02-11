import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'z-ai/glm-4.7',
    LOG_LEVEL: 'error',
    isDevelopment: false,
  },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('parseLLMJson', () => {
  it('should parse clean JSON', async () => {
    const { parseLLMJson } = await import('../../src/analysis/openrouter.js');
    const result = parseLLMJson<{ name: string }>('{"name": "test"}');
    expect(result.name).toBe('test');
  });

  it('should strip markdown code fences', async () => {
    const { parseLLMJson } = await import('../../src/analysis/openrouter.js');
    const result = parseLLMJson<{ value: number }>('```json\n{"value": 42}\n```');
    expect(result.value).toBe(42);
  });

  it('should strip generic code fences', async () => {
    const { parseLLMJson } = await import('../../src/analysis/openrouter.js');
    const result = parseLLMJson<{ ok: boolean }>('```\n{"ok": true}\n```');
    expect(result.ok).toBe(true);
  });

  it('should handle whitespace around JSON', async () => {
    const { parseLLMJson } = await import('../../src/analysis/openrouter.js');
    const result = parseLLMJson<{ items: number[] }>('  \n  {"items": [1, 2, 3]}  \n  ');
    expect(result.items).toEqual([1, 2, 3]);
  });

  it('should throw on invalid JSON', async () => {
    const { parseLLMJson } = await import('../../src/analysis/openrouter.js');
    expect(() => parseLLMJson('not json')).toThrow();
  });
});
