export interface FriendlyAiError {
  statusCode: number;
  message: string;
  retryable: boolean;
}

export function formatFriendlyAiError(
  err: any,
  fallbackMessage = 'The AI botanical service is temporarily busy. Please try again in a moment.'
): FriendlyAiError {
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const rawMessage = String(err?.message || '');
  const lower = rawMessage.toLowerCase();

  const isQuotaOrRateLimit =
    status === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit');

  if (isQuotaOrRateLimit) {
    return {
      statusCode: 429,
      message:
        'Live Gemini search/inference rate limit reached for this moment. Please wait a few seconds and retry, or explore the verified 113-species offline Herbarium Library.',
      retryable: true,
    };
  }

  const isTransientUpstream =
    status === 503 ||
    status === 504 ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('timed out') ||
    lower.includes('deadline_exceeded');

  if (isTransientUpstream) {
    return {
      statusCode: 503,
      message: fallbackMessage,
      retryable: true,
    };
  }

  const isAuthOrConfig =
    status === 401 ||
    status === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated');

  if (isAuthOrConfig) {
    return {
      statusCode: 503,
      message: 'AI service credentials require verification. Please retry shortly.',
      retryable: false,
    };
  }

  if (status === 400 || lower.includes('invalid_argument')) {
    return {
      statusCode: 400,
      message: 'Please refine your input and try again.',
      retryable: false,
    };
  }

  // Never leak raw nested Google JSON strings to end users
  const trimmed = rawMessage.trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return {
      statusCode: 503,
      message: fallbackMessage,
      retryable: true,
    };
  }

  return {
    statusCode: 503,
    message: trimmed.slice(0, 240),
    retryable: true,
  };
}
