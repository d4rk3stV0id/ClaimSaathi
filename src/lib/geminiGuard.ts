export function isGeminiQuotaOrRateError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate') ||
    lower.includes('resource_exhausted')
  );
}

export function shouldTryAnotherGeminiKey(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    isGeminiQuotaOrRateError(error) ||
    lower.includes('503') ||
    lower.includes('service unavailable') ||
    lower.includes('api key') ||
    lower.includes('apikey') ||
    lower.includes('unauth') ||
    lower.includes('forbidden') ||
    lower.includes('permission')
  );
}

export function toReadableGeminiError(error: unknown, context: string): Error {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('api key') || lower.includes('apikey')) {
    return new Error(`${context}: invalid or missing Gemini API key in .env.`);
  }
  if (lower.includes('status of 400') || lower.includes('bad request') || lower.includes('invalid argument')) {
    return new Error(`${context}: request rejected (400). Try smaller/clearer files and avoid scanned images with very high resolution.`);
  }
  if (lower.includes('payload') || lower.includes('too large') || lower.includes('request size')) {
    return new Error(`${context}: uploaded files are too large for AI processing. Use smaller PDFs/images.`);
  }
  if (lower.includes('503') || lower.includes('service unavailable')) {
    return new Error(`${context}: Gemini service is temporarily unavailable (503). Please retry in a minute.`);
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate')) {
    return new Error(`${context}: Gemini quota/rate limit reached. Wait and retry.`);
  }
  return new Error(`${context}: ${msg}`);
}
