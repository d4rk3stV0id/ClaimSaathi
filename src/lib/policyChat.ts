import type { Language, Policy } from '../types';
import { askAboutPolicyWithGemini, hasGeminiApiKeyForPolicyChat } from './policyChatGemini';

export type PolicyChatTurn = { role: 'user' | 'model'; content: string };

export type AskAboutPolicyParams = {
  base64: string;
  mimeType: string;
  policy: Policy;
  extractedText?: string;
  history: PolicyChatTurn[];
  question: string;
  /** UI / profile language — model replies in this language when using Gemini. */
  responseLanguage: Language;
};

/**
 * Local rule-based answers (English-oriented). Used when Gemini is unavailable or fails.
 */
export function askAboutPolicyLocal(params: Omit<AskAboutPolicyParams, 'responseLanguage' | 'base64' | 'mimeType'>): string {
  const q = params.question.toLowerCase();
  const text = (params.extractedText || '').toLowerCase();

  const pickRelevant = (items: string[]) =>
    items.find((item) => {
      const tokens = item
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3);
      return tokens.some((t) => q.includes(t));
    });

  const coveredHit = pickRelevant(params.policy.covered);
  const excludedHit = pickRelevant(params.policy.excluded);

  if (/sum insured|coverage amount|how much|बीमा राशि|कवरेज|राशि/i.test(q)) {
    return `Your extracted sum insured is ₹${params.policy.coverageAmount.toLocaleString('en-IN')}. Please confirm this against the policy schedule.`;
  }
  if (/valid|expiry|expire|renewal|वैध|समाप्ति|नवीकरण/i.test(q)) {
    return `The extracted policy validity date is ${params.policy.validityDate}. Current status is marked ${params.policy.status}.`;
  }
  if (excludedHit) {
    return `From the extracted policy text, this looks restricted/excluded: "${excludedHit}". Please verify with insurer before claim filing.`;
  }
  if (coveredHit) {
    return `From the extracted policy text, this appears covered: "${coveredHit}". Please verify final eligibility with insurer/TPA.`;
  }

  if (text && q.split(/\s+/).some((t) => t.length > 3 && text.includes(t))) {
    return 'Your question seems related to text present in the uploaded policy, but local mode cannot guarantee exact clause-level interpretation. Please verify with insurer.';
  }
  return 'In local mode, I can answer basic coverage/exclusion/validity questions from extracted text. For clause-accurate advice, check the policy wording or insurer helpdesk.';
}

/**
 * Policy Q&A: uses Gemini when `GEMINI_API_KEY` is set (multilingual replies), otherwise local heuristics.
 */
export async function askAboutPolicy(params: AskAboutPolicyParams): Promise<string> {
  if (hasGeminiApiKeyForPolicyChat()) {
    try {
      return await askAboutPolicyWithGemini({
        policy: params.policy,
        extractedText: params.extractedText,
        history: params.history,
        question: params.question,
        responseLanguage: params.responseLanguage,
      });
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[PolicySaathi] Gemini chat fallback to local rules:', e);
      }
    }
  }
  return askAboutPolicyLocal(params);
}
