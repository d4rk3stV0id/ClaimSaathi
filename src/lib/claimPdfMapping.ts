import type { ClaimExtractedField, ClaimPdfFieldMapping } from '../types';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * When the model returns no pdfMappings, try to align AI labels to AcroForm names by fuzzy token overlap.
 */
export function heuristicPdfMappings(fieldNames: string[], fields: ClaimExtractedField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of fieldNames) {
    const nn = norm(name);
    if (nn.length < 3) continue;
    let best: ClaimExtractedField | undefined;
    let bestScore = 0;
    for (const f of fields) {
      const v = f.value?.trim();
      if (!v) continue;
      for (const c of [norm(f.label), norm(f.id)]) {
        if (c.length < 3) continue;
        let s = 0;
        if (nn.includes(c)) s = c.length + 2;
        else if (c.includes(nn)) s = nn.length + 1;
        if (s > bestScore) {
          bestScore = s;
          best = f;
        }
      }
    }
    if (best && bestScore >= 4) out[name] = best.value!.trim();
  }
  return out;
}

/** Model mappings override heuristic when both set a value. */
export function mergeClaimPdfMappings(
  allowedNames: readonly string[],
  heuristic: Record<string, string>,
  model: ClaimPdfFieldMapping[],
): Record<string, string> {
  const allowed = new Set(allowedNames);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(heuristic)) {
    if (allowed.has(k) && v.trim()) out[k] = v.trim();
  }
  for (const m of model) {
    const k = m.pdfFieldName?.trim();
    if (!k || !allowed.has(k)) continue;
    if (m.value?.trim()) out[k] = m.value.trim();
  }
  return out;
}
