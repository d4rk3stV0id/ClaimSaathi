import { jsPDF } from 'jspdf';
import type { ClaimFormAnalysisResult } from '../types';

const DISCLAIMER =
  'This document is an AI-assisted draft from ClaimSaathi. It does not replace your insurer claim form. Verify every value with your hospital and insurer before filing.';

export type ClaimReportPdfOptions = {
  draft: ClaimFormAnalysisResult;
  /** Shown on the cover (e.g. CS-XXXX or DRAFT-timestamp). */
  claimRef: string;
  preparedFor?: string;
};

function lineHeight(doc: jsPDF): number {
  return doc.getFontSize() * 1.25;
}

function addWrappedBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  pageMargin: number,
  pageH: number,
): number {
  const lh = lineHeight(doc);
  let cy = y;
  const paragraphs = text.split(/\n/);
  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para.trim().length ? para.trim() : ' ', maxWidth);
    for (let i = 0; i < lines.length; i++) {
      if (cy + lh > pageH - pageMargin) {
        doc.addPage();
        cy = pageMargin;
      }
      doc.text(lines[i] as string, x, cy);
      cy += lh;
    }
  }
  return cy;
}

/**
 * Builds a printable “filled report” PDF from AI-extracted claim fields (not the raw insurer PDF).
 */
export function buildClaimFilledReportPdf(opts: ClaimReportPdfOptions): Blob {
  const { draft, claimRef, preparedFor } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(18, 52, 71);
  y = addWrappedBlock(doc, 'ClaimSaathi — Filled claim report', margin, y, contentW, margin, pageH);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  y = addWrappedBlock(doc, `Reference: ${claimRef}`, margin, y, contentW, margin, pageH);
  y = addWrappedBlock(doc, `Generated: ${new Date().toLocaleString('en-IN')}`, margin, y, contentW, margin, pageH);
  if (preparedFor?.trim()) {
    y = addWrappedBlock(doc, `Prepared for: ${preparedFor.trim()}`, margin, y, contentW, margin, pageH);
  }
  y += 12;

  doc.setFontSize(10);
  doc.setTextColor(35, 35, 35);
  const amountText =
    draft.totalClaimAmountInr > 0
      ? `Suggested total from documents: Rs. ${draft.totalClaimAmountInr.toLocaleString('en-IN')}`
      : 'Suggested total from documents: not found in bill — enter manually if needed.';
  y = addWrappedBlock(doc, amountText, margin, y, contentW, margin, pageH);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  y = addWrappedBlock(doc, 'Field values (use when filling the insurer form)', margin, y, contentW, margin, pageH);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const f of draft.fields) {
    const block = `${f.label}\nSuggested value: ${f.value || '—'}\nConfidence: ${f.confidence}${f.source ? `  |  Source: ${f.source}` : ''}`;
    y = addWrappedBlock(doc, block, margin, y, contentW, margin, pageH);
    y += 10;
  }

  if (draft.caveats.length > 0) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    y = addWrappedBlock(doc, 'Reminders', margin, y, contentW, margin, pageH);
    y += 4;
    doc.setFont('helvetica', 'normal');
    for (const c of draft.caveats) {
      y = addWrappedBlock(doc, `• ${c}`, margin, y, contentW, margin, pageH);
      y += 4;
    }
  }

  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(95, 95, 95);
  y = addWrappedBlock(doc, DISCLAIMER, margin, y, contentW, margin, pageH);

  return doc.output('blob');
}

export function downloadClaimFilledReportPdf(
  opts: ClaimReportPdfOptions & { filename?: string },
): void {
  const safeRef = opts.claimRef.replace(/[^\w.-]+/g, '_').slice(0, 80);
  const filename = opts.filename ?? `ClaimSaathi_filled_report_${safeRef}.pdf`;
  const blob = buildClaimFilledReportPdf(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
