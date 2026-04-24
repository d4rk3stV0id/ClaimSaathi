import { isSupabaseEnabled, supabase } from './supabase';
import type { Claim, Policy } from '../types';

type PolicyRow = {
  policy_id: string;
  name: string;
  insurer: string;
  coverage_amount: number | null;
  validity_date: string | null;
  status: string | null;
  covered: string[] | null;
  excluded: string[] | null;
  disclaimer: string | null;
};

type ClaimRow = {
  claim_id: string;
  title: string;
  filed_date: string | null;
  amount: number | null;
  status: string | null;
  description: string | null;
  rejection_reason: string | null;
};

function mapPolicyRow(row: PolicyRow): Policy {
  return {
    id: row.policy_id,
    name: row.name,
    insurer: row.insurer,
    coverageAmount: row.coverage_amount ?? 0,
    validityDate: row.validity_date ?? '',
    status: row.status === 'Expired' ? 'Expired' : 'Active',
    covered: Array.isArray(row.covered) ? row.covered : [],
    excluded: Array.isArray(row.excluded) ? row.excluded : [],
    disclaimer: row.disclaimer ?? undefined,
  };
}

function mapClaimRow(row: ClaimRow): Claim {
  return {
    id: row.claim_id,
    title: row.title,
    date: row.filed_date ?? '',
    amount: row.amount ?? 0,
    status: (row.status as Claim['status']) ?? 'Submitted',
    description: row.description ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
  };
}

export async function upsertPolicyForUser(userId: string, policy: Policy): Promise<void> {
  if (!isSupabaseEnabled) return;
  const payload = {
    user_id: userId,
    policy_id: policy.id,
    name: policy.name,
    insurer: policy.insurer,
    coverage_amount: policy.coverageAmount,
    validity_date: policy.validityDate || null,
    status: policy.status,
    covered: policy.covered,
    excluded: policy.excluded,
    disclaimer: policy.disclaimer ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('policies').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchPolicyForUser(userId: string): Promise<Policy | null> {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase
    .from('policies')
    .select(
      'policy_id,name,insurer,coverage_amount,validity_date,status,covered,excluded,disclaimer',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapPolicyRow(data as PolicyRow);
}

export async function insertClaimForUser(userId: string, claim: Claim): Promise<void> {
  if (!isSupabaseEnabled) return;
  const payload = {
    user_id: userId,
    claim_id: claim.id,
    title: claim.title,
    filed_date: claim.date || null,
    amount: claim.amount,
    status: claim.status,
    description: claim.description ?? null,
    rejection_reason: claim.rejectionReason ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Use upsert to make retries safe if the same claim id is submitted twice.
  const { error } = await supabase.from('claims').upsert(payload, { onConflict: 'claim_id' });
  if (error) throw error;
}

export async function fetchClaimsForUser(userId: string): Promise<Claim[]> {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase
    .from('claims')
    .select('claim_id,title,filed_date,amount,status,description,rejection_reason,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];
  return (data as ClaimRow[]).map(mapClaimRow);
}
