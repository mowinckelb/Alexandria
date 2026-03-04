-- Waitlist table for public and confidential landing pages
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  type text not null default 'author' check (type in ('author', 'investor')),
  source text not null default 'public' check (source in ('public', 'confidential')),
  created_at timestamptz default now() not null
);

-- Index for quick lookups
create index if not exists idx_waitlist_email on public.waitlist(email);
create index if not exists idx_waitlist_type on public.waitlist(type);

-- RLS: only service role can insert/read
alter table public.waitlist enable row level security;
