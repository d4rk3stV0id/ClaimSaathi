import * as pdfjsLib from 'pdfjs-dist';
import { createWorker, OEM, PSM, setLogging, type Worker } from 'tesseract.js';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  setLogging(false);
}

const MIN_TEXT_CHARS_FOR_SKIP_OCR = 120;
const PDF_OCR_MAX_PAGES = 8;
const PDF_RENDER_SCALE = 2.65;
const OCR_MAX_EDGE_PX = 2800;
const OCR_MIN_EDGE_PX = 1180;

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Many PDFs ship a long but broken text layer (EMR “copy”, OCR garbage). Skip-only-on-length hides real OCR. */
function looksSuspectEmbeddedPdfText(text: string): boolean {
  const sample = text.slice(0, 12000);
  if (sample.length < 100) return false;
  const lower = sample.toLowerCase();
  if (/\btranslate\b/.test(lower)) return true;
  if (/informagion|\bgystem\b|id\s+ttle|title\s+id\b|hospital\s+information\s+system/i.test(sample)) return true;
  const compact = sample.replace(/\s/g, '');
  const alnum = (sample.match(/[a-z0-9]/gi) ?? []).length;
  if (alnum / Math.max(compact.length, 1) < 0.38) return true;
  if ((sample.match(/\*/g) ?? []).length >= 10) return true;
  return false;
}

function otsuThreshold(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i += 1) hist[gray[i]] += 1;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Resize toward a stable OCR size, then grayscale + Otsu binarization (helps Tesseract on scans). */
function preprocessCanvasForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  let w = source.width;
  let h = source.height;
  if (w <= 0 || h <= 0) return source;

  let scale = 1;
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  if (short < OCR_MIN_EDGE_PX) scale = Math.min(2.8, OCR_MIN_EDGE_PX / short);
  if (long * scale > OCR_MAX_EDGE_PX) scale = OCR_MAX_EDGE_PX / long;
  scale = Math.max(0.85, Math.min(scale, 3.2));

  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * scale));
  out.height = Math.max(1, Math.round(h * scale));
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0, out.width, out.height);

  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const gray = new Uint8Array(out.width * out.height);
  for (let i = 0, p = 0; p < gray.length; i += 4, p += 1) {
    gray[p] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  }
  let lo = 255;
  let hi = 0;
  for (let p = 0; p < gray.length; p += 1) {
    const v = gray[p];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi > lo) {
    const inv = 255 / (hi - lo);
    for (let p = 0; p < gray.length; p += 1) {
      gray[p] = Math.min(255, Math.round((gray[p] - lo) * inv));
    }
  }
  const thr = otsuThreshold(gray);
  for (let i = 0, p = 0; p < gray.length; i += 4, p += 1) {
    const v = gray[p] > thr ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

let ocrWorkerPromise: Promise<Worker> | null = null;

async function getOcrWorker(): Promise<Worker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      // English LSTM only: fewer Latin/Hindi script clashes on hospital letterheads than eng+hin.
      const w = await createWorker('eng', OEM.LSTM_ONLY, { logger: () => {} });
      await w.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
      });
      return w;
    })();
  }
  return ocrWorkerPromise;
}

async function runOcrOnCanvas(canvas: HTMLCanvasElement): Promise<string> {
  const worker = await getOcrWorker();
  const processed = preprocessCanvasForOcr(canvas);
  const { data } = await worker.recognize(processed);
  return (data.text || '').trim();
}

async function extractPdfTextLayer(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = (content.items as { str?: string }[])
      .map((item) => (typeof item?.str === 'string' ? item.str : ''))
      .filter(Boolean);
    if (lines.length > 0) pages.push(lines.join(' '));
  }
  return normalizeText(pages.join('\n\n'));
}

async function ocrPdfPagesToText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, PDF_OCR_MAX_PAGES);
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const text = await runOcrOnCanvas(canvas);
    if (text) chunks.push(`--- Page ${pageNumber} ---\n${text}`);
  }

  return normalizeText(chunks.join('\n\n'));
}

async function extractPdfText(file: File): Promise<string> {
  const fromTextLayer = await extractPdfTextLayer(file);
  const layerCompactLen = fromTextLayer.replace(/\s/g, '').length;
  const short = layerCompactLen < MIN_TEXT_CHARS_FOR_SKIP_OCR;
  const suspect = looksSuspectEmbeddedPdfText(fromTextLayer);

  if (!short && !suspect) {
    return fromTextLayer;
  }

  const fromOcr = await ocrPdfPagesToText(file);
  const ocrCompactLen = fromOcr.replace(/\s/g, '').length;

  if (suspect) {
    return normalizeText(`${fromOcr}\n\n${fromTextLayer}`.trim());
  }

  if (short && ocrCompactLen > layerCompactLen) {
    return fromOcr || fromTextLayer;
  }
  return fromTextLayer || fromOcr;
}

async function extractImageText(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0);
    return normalizeText(await runOcrOnCanvas(canvas));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const comma = result.indexOf(',');
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!base64) reject(new Error('Could not read file'));
      else resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromFile(file: File): Promise<string> {
  const mime = inferMimeType(file);
  if (mime === 'application/pdf') {
    return extractPdfText(file);
  }
  if (mime.startsWith('image/')) {
    return extractImageText(file);
  }
  throw new Error('Unsupported file type. Use PDF or image.');
}
