-- Enable UUID extension
create extension if not exists "uuid-ossp";

--------------------------------------------------
-- 1. CLIENTS TABLE
--------------------------------------------------
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  company text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--------------------------------------------------
-- 2. PROJECTS TABLE (Pipeline Status)
--------------------------------------------------
create type project_status as enum ('lead', 'proposal_sent', 'active', 'completed', 'archived');

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  title text not null,
  budget numeric(10, 2),
  status project_status default 'lead'::project_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--------------------------------------------------
-- 3. PROPOSALS TABLE (AI Drafted & Stored)
--------------------------------------------------
create table public.proposals (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  scope_markdown text not null,
  deliverables jsonb not null default '[]'::jsonb,
  is_signed boolean default false,
  signed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--------------------------------------------------
-- 4. INVOICES TABLE
--------------------------------------------------
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');

create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10, 2) not null,
  status invoice_status default 'draft'::invoice_status not null,
  stripe_invoice_id text,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.proposals enable row level security;
alter table public.invoices enable row level security;

-- Client RLS
create policy "Users manage their own clients" on public.clients
  for all using (auth.uid() = user_id);

-- Project RLS
create policy "Users manage their own projects" on public.projects
  for all using (auth.uid() = user_id);

-- Proposal RLS
create policy "Users manage their own proposals" on public.proposals
  for all using (auth.uid() = user_id);

-- Invoice RLS
create policy "Users manage their own invoices" on public.invoices
  for all using (auth.uid() = user_id);