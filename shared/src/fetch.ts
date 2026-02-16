const DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const { timeoutMs: _, signal: externalSignal, ...rest } = init ?? {};

  // Link external signal if provided
  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
  }

  const timer = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
