create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  phone text,
  whatsapp text,
  email text,
  city text,
  instagram text,
  website text,
  notes text,
  status text not null default 'onboarding'
    check (status in ('active','onboarding','paused','closed')),
  next_contact_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, service_id)
);

create table publications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  published_at date not null default current_date,
  platform text not null check (platform in ('Instagram','Facebook','TikTok','YouTube','Google','Blog','Outro')),
  type text not null check (type in ('Post','Reels','Story','Vídeo','Carrossel','Artigo','Anúncio','Outro')),
  title text not null,
  caption text,
  url text,
  status text not null default 'idea' check (status in ('idea','production','scheduled','published')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  contacted_at date not null default current_date,
  channel text not null check (channel in ('WhatsApp','Telefone','Instagram','E-mail','Reunião','Outro')),
  subject text,
  notes text,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on client_services (client_id);
create index on publications (client_id, published_at desc);
create index on tasks (client_id, status, due_date);
create index on tasks (status, due_date);
create index on contacts (client_id, contacted_at desc);
create index on activity_logs (client_id, created_at desc);
create index on activity_logs (created_at desc);

create trigger trg_clients_upd before update on clients for each row execute function set_updated_at();
create trigger trg_publications_upd before update on publications for each row execute function set_updated_at();
create trigger trg_tasks_upd before update on tasks for each row execute function set_updated_at();

insert into services (name) values
 ('Google Ads'),('Meta Ads'),('Gestão de Instagram'),('Criação de conteúdo'),
 ('Bot WhatsApp'),('Consultoria'),('Landing Page/Site'),('Outros');
