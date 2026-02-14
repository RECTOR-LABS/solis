const DEFAULT_MODEL = 'anthropic/claude-haiku-4-5-20251001';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string };
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface QueryResult {
  content: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
}

export async function queryLLM(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
): Promise<QueryResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const selectedModel = model || process.env.QUERY_API_MODEL || DEFAULT_MODEL;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://solis.rectorspace.com',
      'X-Title': 'SOLIS Query API',
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content ?? '';
  const tokensUsed = data.usage?.total_tokens ?? 0;

  // Rough cost estimation (varies by model, using Haiku pricing as baseline)
  const costPer1kTokens = 0.001;
  const costUsd = (tokensUsed / 1000) * costPer1kTokens;

  return {
    content,
    model: data.model || selectedModel,
    tokensUsed,
    costUsd,
  };
}
