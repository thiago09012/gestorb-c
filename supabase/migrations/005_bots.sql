-- 005_bots.sql — controle de bots por cliente (online/offline via heartbeat).
-- Idempotente: pode rodar de novo no SQL Editor sem quebrar o que você já criou.
-- Você já rodou o report_bot_heartbeat simples; este arquivo mantém ele e completa o resto.

create extension if not exists pgcrypto;

-- 1) Tabela bots (se você já criou na mão, não duplica)
create table if not exists bots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  provider text not null default 'whatsapp',
  instance_id text unique,
  status text not null default 'online' check (status in ('online','offline','manutencao')),
  last_seen_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bots_client on bots (client_id);
create index if not exists idx_bots_last_seen on bots (last_seen_at desc);
create index if not exists idx_bots_instance on bots (instance_id);

-- Reusa o trigger set_updated_at() criado em 001_schema.sql
drop trigger if exists trg_bots_upd on bots;
create trigger trg_bots_upd before update on bots for each row execute function set_updated_at();

-- 2) RLS: só usuário logado (mesmo padrão de 002_rls.sql)
alter table bots enable row level security;
drop policy if exists admin_all on bots;
create policy admin_all on bots for all to authenticated using (true) with check (true);

-- 3) Heartbeat: o bot avisa "estou vivo" a cada 2 min.
-- Chamada via REST: POST /rest/v1/rpc/report_bot_heartbeat { p_bot_id }
create or replace function report_bot_heartbeat(p_bot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bots set last_seen_at = now(), status = 'online', updated_at = now()
  where id = p_bot_id;
end $$;

-- 4) Histórico automático (mesmo padrão de 003_activity_triggers.sql)
create or replace function log_bot_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs (client_id, type, description)
  values (new.client_id, 'bot_added', 'Bot cadastrado: ' || new.name);
  return new;
end $$;

drop trigger if exists trg_log_bot_added on bots;
create trigger trg_log_bot_added after insert on bots
for each row execute function log_bot_added();

create or replace function log_bot_removed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from clients where id = old.client_id) then
    insert into activity_logs (client_id, type, description)
    values (old.client_id, 'bot_removed', 'Bot removido: ' || old.name);
  end if;
  return old;
end $$;

drop trigger if exists trg_log_bot_removed on bots;
create trigger trg_log_bot_removed after delete on bots
for each row execute function log_bot_removed();

-- 5) Atualiza a view client_overview (base 004_views.sql) com contadores de bots.
-- Online = avisou nos últimos 5 minutos.
create or replace view client_overview
with (security_invoker = true) as
select
  c.*,
  coalesce(
    (select array_agg(s.name order by s.name)
     from client_services cs join services s on s.id = cs.service_id
     where cs.client_id = c.id),
    '{}'::text[]
  ) as services,
  (select ct.contacted_at from contacts ct where ct.client_id = c.id order by ct.contacted_at desc limit 1) as last_contact_at,
  (select ct.channel from contacts ct where ct.client_id = c.id order by ct.contacted_at desc limit 1) as last_contact_channel,
  (select ct.subject from contacts ct where ct.client_id = c.id order by ct.contacted_at desc limit 1) as last_contact_subject,
  (select t.title from tasks t where t.client_id = c.id and t.status <> 'done' order by t.due_date nulls last limit 1) as next_task_title,
  (select t.due_date from tasks t where t.client_id = c.id and t.status <> 'done' order by t.due_date nulls last limit 1) as next_task_due,
  greatest(
    (select max(a.created_at) from activity_logs a where a.client_id = c.id),
    (select max(ct.created_at) from contacts ct where ct.client_id = c.id)
  ) as last_activity_at,
  (select count(*) from bots b where b.client_id = c.id) as bots_total,
  (select count(*) from bots b where b.client_id = c.id and b.last_seen_at > now() - interval '5 minutes') as bots_online,
  (select count(*) from bots b where b.client_id = c.id and (b.last_seen_at is null or b.last_seen_at <= now() - interval '5 minutes')) as bots_offline,
  (select max(b.last_seen_at) from bots b where b.client_id = c.id) as last_bot_seen_at
from clients c;
