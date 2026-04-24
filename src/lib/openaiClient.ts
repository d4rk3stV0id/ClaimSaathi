export type OpenAiFileInput = {
  base64: string;
  mimeType: string;
  filename: string;
};

export function getOpenAiApiKeyOptional(): string | undefined {
  const env = typeof process !== 'undefined' ? (process as { env?: { OPENAI_API_KEY?: string } }).env : undefined;
  const key = env?.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function getOpenAiApiKey(): string {
  const key = getOpenAiApiKeyOptional();
  if (!key) {
    throw new Error('Missing OPENAI_API_KEY. Add OPENAI_API_KEY=your_key to .env and restart dev server.');
  }
  return key;
}

function extractTextFromResponsesPayload(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks: string[] = [];
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

export function parseJsonFromModelText<T>(text: string): T {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(withoutFences) as T;
}

export async function callOpenAiResponses(params: {
  prompt: string;
  files?: OpenAiFileInput[];
  model?: string;
  /** When set, used instead of OPENAI_API_KEY from the environment. */
  apiKey?: string;
}): Promise<string> {
  const key = params.apiKey?.trim() || getOpenAiApiKeyOptional();
  if (!key) {
    throw new Error('Missing OPENAI_API_KEY. Add OPENAI_API_KEY=your_key to .env and restart dev server.');
  }
  const model = params.model || 'gpt-4.1-mini';
  const fileParts = (params.files ?? []).map((f) => {
    const dataUrl = `data:${f.mimeType};base64,${f.base64}`;
    if (f.mimeType.startsWith('image/')) {
      return { type: 'input_image', image_url: dataUrl };
    }
    return { type: 'input_file', filename: f.filename, file_data: dataUrl };
  });

  const body = {
    model,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: params.prompt }, ...fileParts],
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed (${response.status}). ${details}`);
  }

  const payload = await response.json();
  const text = extractTextFromResponsesPayload(payload);
  if (!text) {
    throw new Error('OpenAI returned empty output.');
  }
  return text;
}
