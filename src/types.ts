/**
 * Shared types for ClaimSaathi
 */

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn';

export interface User {
  name: string;
  phone: string;
  /** Set when user signs in with OAuth/email (optional). */
  email?: string;
  avatar?: string;
  language?: Language;
}

export type ClaimStatus = 'Approved' | 'Pending' | 'Rejected' | 'Submitted' | 'Verified' | 'Review';

export interface Claim {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: ClaimStatus;
  description?: string;
  rejectionReason?: string;
}

export interface Policy {
  id: string;
  name: string;
  insurer: string;
  coverageAmount: number;
  validityDate: string;
  status: 'Active'| 'Expired';
  covered: string[];
  excluded: string[];
  /** Short trust / legal reminder from analysis (optional). */
  disclaimer?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export type ClaimFieldConfidence = 'high' | 'medium' | 'low';

/** One suggested answer for an insurer claim form field (AI-assisted draft). */
export interface ClaimExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: ClaimFieldConfidence;
  /** Which uploaded document(s) support this value. */
  source?: string;
}

/** Maps an AcroForm field name on the insurer PDF to the value to write. */
export interface ClaimPdfFieldMapping {
  pdfFieldName: string;
  value: string;
}

export type ClaimMedicalDocKey = 'hospitalBill' | 'dischargeSummary' | 'idProof';

export type ClaimMedicalBundle = Record<ClaimMedicalDocKey, File>;

/** Structured output after analyzing medical proofs + claim form template. */
export interface ClaimFormAnalysisResult {
  fields: ClaimExtractedField[];
  totalClaimAmountInr: number;
  caveats: string[];
  /**
   * When the claim form PDF listed AcroForm names, the model maps values onto those exact names.
   * Empty when no field list was sent (e.g. image upload) or nothing could be mapped.
   */
  pdfMappings: ClaimPdfFieldMapping[];
}
