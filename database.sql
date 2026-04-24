-- Run in Supabase SQL editor to enable policy + claim persistence.

create table if not exists public.policies (
  user_id uuid primary key references auth.users (id) on delete cascade,
  policy_id text not null,
  name text not null,
  insurer text not null,
  coverage_amount numeric not null default 0,
  validity_date text,
  status text not null default 'Active',
  covered text[] not null default '{}',
  excluded text[] not null default '{}',
  disclaimer text,
  updated_at timestamptz not null default now()
);

create table if not exists public.claims (
  claim_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  filed_date text,
  amount numeric not null default 0,
  status text not null default 'Submitted',
  description text,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_claims_user_id_created_at on public.claims (user_id, created_at desc);

alter table public.policies enable row level security;
alter table public.claims enable row level security;

drop policy if exists "Users can read own policy" on public.policies;
create policy "Users can read own policy"
on public.policies
for select
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own policy" on public.policies;
create policy "Users can upsert own policy"
on public.policies
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own policy" on public.policies;
create policy "Users can update own policy"
on public.policies
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own claims" on public.claims;
create policy "Users can read own claims"
on public.claims
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own claims" on public.claims;
create policy "Users can insert own claims"
on public.claims
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own claims" on public.claims;
create policy "Users can update own claims"
on public.claims
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
