import type {
  ClaimFieldConfidence,
  ClaimFormAnalysisResult,
  ClaimExtractedField,
  ClaimMedicalBundle,
} from '../types';

export type { ClaimMedicalDocKey, ClaimMedicalBundle } from '../types';
import { tryVisionClaimExtraction } from './claimFormVisionExtraction';
import { extractTextFromFile } from './localDocumentText';

/** If Gemini returns fewer than this many field rows, we also run local OCR/heuristics and merge. */
const MERGE_LOCAL_OCR_IF_VISION_FIELDS_BELOW = 20;

function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function assertPdfOrImage(mime: string, label: string) {
  if (mime !== 'application/pdf' && !mime.startsWith('image/')) {
    throw new Error(`${label}: please use a PDF or a clear photo (JPG/PNG).`);
  }
}

function isJunkHospitalLine(value: string): boolean {
  const s = value.trim();
  if (s.length < 3 || s.length > 85) return true;
  const low = s.toLowerCase();
  if (
    /\btranslate\b|information\s*system|informagion|\bgystem\b|\bemr\b|software|module|login|hospital\s+information|^\*+$|title\s+id|id\s+ttle|\bhis\b|\berp\b/i.test(
      low,
    )
  ) {
    return true;
  }
  if ((s.match(/\*/g) ?? []).length >= 2) return true;
  const letters = (s.match(/[a-z]/gi) ?? []).length;
  if (letters / Math.max(s.replace(/\s/g, '').length, 1) < 0.45) return true;
  return false;
}

/** Prefer labelled lines, then "Name … Hospital", and reject EMR chrome like "Hospital Information System". */
function extractHospitalNameFromBill(billText: string): { value: string; confidence: ClaimFieldConfidence } | null {
  const labeled = billText.match(
    /(?:hospital\s*name|name\s*of\s*(?:the\s*)?hospital)\s*[:\-]\s*([^\n]+)/i,
  );
  if (labeled?.[1]) {
    const v = labeled[1].replace(/\s+/g, ' ').trim();
    if (!isJunkHospitalLine(v)) return { value: v, confidence: 'high' };
  }
  const hospitalColon = billText.match(/\bhospital\s*[:\-]\s*([^\n]+)/i);
  if (hospitalColon?.[1]) {
    const v = hospitalColon[1].replace(/\s+/g, ' ').trim();
    if (!isJunkHospitalLine(v)) return { value: v, confidence: 'high' };
  }
  const beforeHospital = billText.match(
    /([A-Z][A-Za-z0-9.'\-\s,&]{2,48}?)\s+Hospitals?\b(?:\s*[,\n]|$)/i,
  );
  if (beforeHospital?.[1]) {
    const v = beforeHospital[1].replace(/\s+/g, ' ').trim();
    if (!isJunkHospitalLine(v)) return { value: v, confidence: 'medium' };
  }
  return null;
}

const DOC_ORDER = [
  { key: 'hospitalBill' as const, title: 'Hospital bill' },
  { key: 'dischargeSummary' as const, title: 'Discharge summary' },
  { key: 'idProof' as const, title: 'ID proof' },
];

function mergeVisionWithLocal(vision: ClaimFormAnalysisResult, local: ClaimFormAnalysisResult): ClaimFormAnalysisResult {
  const visionIds = new Set(
    vision.fields.filter((f) => f.id !== 'no_fields').map((f) => f.id.toLowerCase()),
  );
  const localExtras = local.fields.filter(
    (f) => f.id !== 'no_fields' && f.value?.trim() && !visionIds.has(f.id.toLowerCase()),
  );
  const fields =
    vision.fields.filter((f) => f.id !== 'no_fields').length > 0
      ? [...vision.fields.filter((f) => f.id !== 'no_fields'), ...localExtras]
      : local.fields;

  const pdfKeys = new Set(vision.pdfMappings.map((m) => m.pdfFieldName));
  const pdfMappings = [
    ...vision.pdfMappings,
    ...local.pdfMappings.filter((m) => m.value?.trim() && !pdfKeys.has(m.pdfFieldName)),
  ];

  const totalClaimAmountInr = Math.max(vision.totalClaimAmountInr || 0, local.totalClaimAmountInr || 0);

  const caveats = [...vision.caveats];

  return {
    fields: fields.length ? fields : local.fields,
    totalClaimAmountInr,
    caveats,
    pdfMappings,
  };
}

async function analyzeClaimDocumentsLocal(input: {
  medical: ClaimMedicalBundle;
  claimForm: File;
  acroFormFieldNames?: string[];
}): Promise<ClaimFormAnalysisResult> {
  const files: { title: string; file: File }[] = [
    ...DOC_ORDER.map((d) => ({ title: d.title, file: input.medical[d.key] })),
    { title: 'Insurer claim form (template)', file: input.claimForm },
  ];

  for (const { title, file } of files) {
    const mime = inferMimeType(file);
    assertPdfOrImage(mime, title);
  }

  const textByTitle: Record<string, string> = {};
  for (const { title, file } of files) {
    textByTitle[title] = await extractTextFromFile(file);
  }

  const names = (input.acroFormFieldNames ?? []).slice(0, 260);
  const billText = textByTitle['Hospital bill'] || '';
  const summaryText = textByTitle['Discharge summary'] || '';
  const idText = textByTitle['ID proof'] || '';
  const merged = `${billText}\n${summaryText}\n${idText}`;

  const capture = (
    haystack: string,
    sourceLabel: string,
    id: string,
    label: string,
    pattern: RegExp,
    confidence: ClaimFieldConfidence = 'medium',
  ) => {
    const hit = haystack.match(pattern)?.[1]?.trim();
    return hit
      ? { id, label, value: hit, confidence, source: sourceLabel }
      : null;
  };

  const hospital = extractHospitalNameFromBill(billText);
  const fields = [
    hospital
      ? {
          id: 'hospital_name',
          label: 'Hospital Name',
          value: hospital.value,
          confidence: hospital.confidence,
          source: 'Hospital bill',
        }
      : null,
    capture(billText, 'Hospital bill', 'bill_number', 'Hospital Bill Number', /(?:bill\s*(?:no|number)|invoice\s*(?:no|number))\s*[:\-]?\s*([A-Z0-9\-\/]+)/i, 'high'),
    capture(summaryText, 'Discharge summary', 'diagnosis', 'Diagnosis', /diagnosis\s*[:\-]?\s*([^\n]+)/i, 'medium'),
    capture(summaryText, 'Discharge summary', 'admission_date', 'Admission Date', /admission\s*date\s*[:\-]?\s*([^\n]+)/i, 'high'),
    capture(summaryText, 'Discharge summary', 'discharge_date', 'Discharge Date', /discharge\s*date\s*[:\-]?\s*([^\n]+)/i, 'high'),
    capture(idText, 'ID proof', 'patient_name', 'Patient / Insured Name', /(?:name|patient)\s*[:\-]?\s*([A-Za-z][A-Za-z .]{2,})/i, 'medium'),
    capture(idText, 'ID proof', 'id_number', 'ID Number', /(?:aadhaar|aadhar|id|number)\s*[:\-]?\s*([0-9]{8,16}|[A-Z0-9\-]{6,})/i, 'high'),
  ].filter(Boolean) as ClaimExtractedField[];

  const amountRaw =
    billText.match(/(?:total|net payable|claim amount)[^\d]{0,20}((?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?)/i)?.[1] ||
    merged.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i)?.[1] ||
    '';
  const total = amountRaw ? Math.max(0, Math.round(Number(amountRaw.replace(/[^\d.]/g, '')) || 0)) : 0;

  const caveats = [
    'In-browser OCR (Tesseract; English + Hindi when available). Scanned PDFs are rendered to images per page—verify every value before filing.',
    ...(fields.length < 5 ? ['Some fields may be missing due to unreadable scan/OCR limits.'] : []),
  ];

  const allowedPdf = new Set(names);
  const candidateValueByName = new Map<string, string>();
  for (const f of fields) {
    candidateValueByName.set(f.label.toLowerCase(), f.value);
    candidateValueByName.set(f.id.toLowerCase(), f.value);
  }
  const pdfMappings = names
    .map((name) => {
      const n = name.toLowerCase();
      let value = '';
      if (/name|patient|insured/.test(n)) value = candidateValueByName.get('patient_name') || '';
      else if (/hospital/.test(n)) value = candidateValueByName.get('hospital_name') || '';
      else if (/bill|invoice/.test(n)) value = candidateValueByName.get('bill_number') || '';
      else if (/admission/.test(n)) value = candidateValueByName.get('admission_date') || '';
      else if (/discharge/.test(n)) value = candidateValueByName.get('discharge_date') || '';
      else if (/diagnosis/.test(n)) value = candidateValueByName.get('diagnosis') || '';
      else if (/id|aadhaar|aadhar|member/.test(n)) value = candidateValueByName.get('id_number') || '';
      else if (/amount|total|claim/.test(n) && total > 0) value = String(total);
      return { pdfFieldName: name, value: value.trim() };
    })
    .filter((m) => m.value && allowedPdf.has(m.pdfFieldName));

  return {
    fields: fields.length
      ? fields
      : [
          {
            id: 'no_fields',
            label: 'Extraction',
            value: 'No fields were returned. Try clearer scans or a smaller claim form PDF.',
            confidence: 'low',
            source: 'model',
          },
        ],
    totalClaimAmountInr: total,
    caveats: caveats.length
      ? caveats
      : ['Verify every value with your hospital and insurer before submitting the official form.'],
    pdfMappings,
  };
}

/**
 * Reads medical proofs + insurer claim form and returns suggested field values.
 * For hackathon / assistive use only — user must verify with the insurer.
 */
export async function analyzeClaimDocuments(input: {
  medical: ClaimMedicalBundle;
  claimForm: File;
  /** Exact AcroForm field names from the claim PDF (may be empty). */
  acroFormFieldNames?: string[];
}): Promise<ClaimFormAnalysisResult> {
  const names = (input.acroFormFieldNames ?? []).slice(0, 260);

  const vision = await tryVisionClaimExtraction({
    medical: input.medical,
    claimForm: input.claimForm,
    acroFormFieldNames: names,
  });

  if (!vision) return analyzeClaimDocumentsLocal(input);

  const visionCount = vision.fields.filter((f) => f.id !== 'no_fields').length;
  if (visionCount >= MERGE_LOCAL_OCR_IF_VISION_FIELDS_BELOW) return vision;

  const local = await analyzeClaimDocumentsLocal(input);
  return mergeVisionWithLocal(vision, local);
}
