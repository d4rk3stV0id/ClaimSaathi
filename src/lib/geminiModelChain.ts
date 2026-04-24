import { isGeminiQuotaOrRateError } from './geminiGuard';

/**
 * Default order: **Flash Lite** and **1.5** first (separate / lower free-tier pressure than `gemini-2.0-flash`).
 * Set `GEMINI_*_MODEL` env to force one id first; remaining ids are tried on quota / 404 / 503.
 */
export const GEMINI_FLASH_MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const;

export function buildGeminiModelFallbackChain(preferred?: string | null): string[] {
  const p = preferred?.trim();
  if (p) return [p, ...GEMINI_FLASH_MODEL_FALLBACKS.filter((m) => m !== p)];
  return [...GEMINI_FLASH_MODEL_FALLBACKS];
}

export function isRetryableGeminiModelError(e: unknown): boolean {
  if (isGeminiQuotaOrRateError(e)) return true;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('invalid model') ||
    msg.includes('unsupported') ||
    msg.includes('was not found')
  );
}
