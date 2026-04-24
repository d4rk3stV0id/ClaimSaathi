import { PDFDocument } from 'pdf-lib';

/** List AcroForm field names from a PDF (empty if not a PDF or no form). */
export async function listClaimPdfAcroFieldNames(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (file.type !== 'application/pdf' && !name.endsWith('.pdf')) return [];
  try {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdf.getForm();
    return form.getFields().map((f) => f.getName());
  } catch {
    return [];
  }
}

/**
 * Writes text / simple checkboxes into the insurer PDF's AcroForm fields.
 * Unknown field names are skipped. Flatten is best-effort so the PDF still saves if flatten fails.
 */
export async function fillInsurerClaimPdf(file: File, mappings: Record<string, string>): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();

  for (const [name, raw] of Object.entries(mappings)) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      form.getTextField(name).setText(value);
      continue;
    } catch {
      /* not a text field */
    }
    try {
      const cb = form.getCheckBox(name);
      if (/^(yes|true|1|on|y|checked)$/i.test(value)) cb.check();
      else cb.uncheck();
      continue;
    } catch {
      /* not a checkbox */
    }
    try {
      const dd = form.getDropdown(name);
      const opts = dd.getOptions();
      const exact = opts.find((o) => o.toLowerCase() === value.toLowerCase());
      const partial = opts.find((o) => o.toLowerCase().includes(value.toLowerCase()) || value.toLowerCase().includes(o.toLowerCase()));
      const pick = exact ?? partial;
      if (pick) dd.select(pick);
    } catch {
      /* skip */
    }
  }

  try {
    form.flatten();
  } catch {
    /* keep fields editable if flatten fails for this template */
  }

  return pdf.save({ useObjectStreams: false });
}
