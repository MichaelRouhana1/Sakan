-- Studently waitlist schema
-- Run in the Supabase SQL editor (or via CLI).

create extension if not exists "pgcrypto";

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('student', 'landlord')),
  full_name text not null,
  email text not null,
  whatsapp text,
  university text,
  campus text,
  housing_timing text,
  area_city text,
  unit_count text,
  beta_tester boolean not null default false,
  referral_code text not null,
  referred_by text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint waitlist_signups_email_role_unique unique (email, role),
  constraint waitlist_signups_referral_code_unique unique (referral_code)
);

create index if not exists waitlist_signups_role_created_at_idx
  on public.waitlist_signups (role, created_at desc);

create index if not exists waitlist_signups_referred_by_idx
  on public.waitlist_signups (referred_by);

create index if not exists waitlist_signups_university_idx
  on public.waitlist_signups (university)
  where university is not null;

-- Migration: campus for databases created before this column existed.
alter table public.waitlist_signups
  add column if not exists campus text;

create index if not exists waitlist_signups_campus_idx
  on public.waitlist_signups (campus)
  where campus is not null;

create index if not exists waitlist_signups_area_city_idx
  on public.waitlist_signups (area_city)
  where area_city is not null;

-- Self-referential referral FK (nullable)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'waitlist_signups_referred_by_fkey'
  ) then
    alter table public.waitlist_signups
      add constraint waitlist_signups_referred_by_fkey
      foreign key (referred_by)
      references public.waitlist_signups (referral_code)
      on delete set null;
  end if;
end $$;

alter table public.waitlist_signups enable row level security;

-- No direct anon/authenticated table access.
-- The Next.js API uses the service role key (bypasses RLS).
-- Optional public count helper for anon clients if needed later.
create or replace function public.waitlist_count(p_role text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.waitlist_signups
  where role = p_role;
$$;

revoke all on function public.waitlist_count(text) from public;
grant execute on function public.waitlist_count(text) to anon, authenticated;

comment on table public.waitlist_signups is 'Studently waitlist sign-ups (students and landlords).';
