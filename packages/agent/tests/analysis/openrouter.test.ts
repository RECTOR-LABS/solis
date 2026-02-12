import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

vi.mock('../../src/config.js', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'anthropic/claude-haiku-4.5',
    OPENROUTER_FALLBACK_MODELS: 'z-ai/glm-4.7,z-ai/glm-4.7-flash',
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
      child: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    }),
  },
}));

function makeSuccessResponse(content = '{"ok":true}') {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

function makeServerError(status = 502) {
  const err = new Error(`${status} Bad Gateway`);
  (err as any).status = status;
  return err;
}

function makeClientError(status = 401) {
  const err = new Error(`${status} Unauthorized`);
  (err as any).status = status;
  return err;
}

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

describe('isServerError', () => {
  it('should return true for 500', async () => {
    const { isServerError } = await import('../../src/analysis/openrouter.js');
    expect(isServerError({ status: 500 })).toBe(true);
  });

  it('should return true for 502', async () => {
    const { isServerError } = await import('../../src/analysis/openrouter.js');
    expect(isServerError({ status: 502 })).toBe(true);
  });

  it('should return true for 503', async () => {
    const { isServerError } = await import('../../src/analysis/openrouter.js');
    expect(isServerError({ status: 503 })).toBe(true);
  });

  it('should return false for 401', async () => {
    const { isServerError } = await import('../../src/analysis/openrouter.js');
    expect(isServerError({ status: 401 })).toBe(false);
  });

  it('should return false for 429', async () => {
    const { isServerError } = await import('../../src/analysis/openrouter.js');
    expect(isServerError({ status: 429 })).toBe(false);
  });

  it('should return false for non-object errors', async () => {
    const { isServerError } = await import('../../src/analysis/openrouter.js');
    expect(isServerError(new Error('network'))).toBe(false);
    expect(isServerError(null)).toBe(false);
    expect(isServerError(undefined)).toBe(false);
  });
});

describe('analyzeWithLLM — model fallback', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('should succeed on primary model without fallback', async () => {
    mockCreate.mockResolvedValueOnce(makeSuccessResponse());

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    const result = await analyzeWithLLM('system', 'user');

    expect(result.model).toBe('anthropic/claude-haiku-4.5');
    expect(result.content).toBe('{"ok":true}');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'anthropic/claude-haiku-4.5' }),
    );
  });

  it('should fallback to second model on primary 502', async () => {
    mockCreate
      .mockRejectedValueOnce(makeServerError(502))
      .mockResolvedValueOnce(makeSuccessResponse('{"fallback":true}'));

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    const result = await analyzeWithLLM('system', 'user');

    expect(result.model).toBe('z-ai/glm-4.7');
    expect(result.content).toBe('{"fallback":true}');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: 'anthropic/claude-haiku-4.5' }));
    expect(mockCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'z-ai/glm-4.7' }));
  });

  it('should fallback through entire chain on 502s', async () => {
    mockCreate
      .mockRejectedValueOnce(makeServerError(502))
      .mockRejectedValueOnce(makeServerError(503))
      .mockResolvedValueOnce(makeSuccessResponse('{"last":true}'));

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    const result = await analyzeWithLLM('system', 'user');

    expect(result.model).toBe('z-ai/glm-4.7-flash');
    expect(result.content).toBe('{"last":true}');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('should throw after all models return 5xx', async () => {
    mockCreate
      .mockRejectedValueOnce(makeServerError(502))
      .mockRejectedValueOnce(makeServerError(503))
      .mockRejectedValueOnce(makeServerError(500));

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    await expect(analyzeWithLLM('system', 'user')).rejects.toThrow('500 Bad Gateway');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('should throw immediately on 401 without fallback', async () => {
    mockCreate.mockRejectedValueOnce(makeClientError(401));

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    await expect(analyzeWithLLM('system', 'user')).rejects.toThrow('401 Unauthorized');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately on 429 without fallback', async () => {
    mockCreate.mockRejectedValueOnce(makeClientError(429));

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    await expect(analyzeWithLLM('system', 'user')).rejects.toThrow();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should pass jsonSchema option correctly', async () => {
    mockCreate.mockResolvedValueOnce(makeSuccessResponse());

    const { analyzeWithLLM } = await import('../../src/analysis/openrouter.js');
    await analyzeWithLLM('system', 'user', true);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: 'json_object' } }),
    );
  });
});
