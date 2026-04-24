import type { Language } from '../types';

/** BCP-47 tags for Web Speech API (India locales where applicable). */
export function languageToSpeechRecognitionLang(language: Language): string {
  switch (language) {
    case 'hi':
      return 'hi-IN';
    case 'ta':
      return 'ta-IN';
    case 'te':
      return 'te-IN';
    case 'bn':
      return 'bn-IN';
    default:
      return 'en-IN';
  }
}

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.webkitSpeechRecognition ?? window.SpeechRecognition ?? null;
}

export function isBrowserSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export type SpeechRecognitionSession = {
  stop: () => void;
};

/**
 * Starts one-shot dictation. Call `stop()` to end early.
 */
export function startSpeechRecognition(params: {
  language: Language;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): SpeechRecognitionSession {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    params.onError?.('Voice input is not supported in this browser.');
    params.onEnd?.();
    return { stop: () => {} };
  }

  const rec = new Ctor();
  rec.lang = languageToSpeechRecognitionLang(params.language);
  rec.interimResults = !!params.onInterim;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const r = event.results[i];
      const t = r[0]?.transcript ?? '';
      if (r.isFinal) final += t;
      else interim += t;
    }
    if (interim && params.onInterim) params.onInterim(interim);
    if (final) params.onFinal(final.trim());
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    params.onError?.(event.message || event.error || 'Speech recognition error');
  };

  rec.onend = () => {
    params.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    params.onError?.('Could not start microphone.');
    params.onEnd?.();
    return { stop: () => {} };
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
