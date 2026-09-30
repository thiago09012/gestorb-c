-- Histórico automático via triggers (security definer, search_path fixo).
-- O front-end NUNCA escreve activity_logs, exceto anotações manuais (type 'manual_note').

-- 1) Cliente cadastrado
create or replace function log_client_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs (client_id, type, description)
  values (new.id, 'client_created', 'Cliente cadastrado');
  return new;
end $$;

drop trigger if exists trg_log_client_created on clients;
create trigger trg_log_client_created after insert on clients
for each row execute function log_client_created();

-- 2) Status do cliente alterado
create or replace function log_client_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare label text;
begin
  if old.status is distinct from new.status then
    label := case new.status
      when 'active' then 'Ativo'
      when 'onboarding' then 'Em implantação'
      when 'paused' then 'Pausado'
      when 'closed' then 'Encerrado'
      else new.status end;
    insert into activity_logs (client_id, type, description)
    values (new.id, 'status_changed', 'Status alterado para ' || label);
  end if;
  return new;
end $$;

drop trigger if exists trg_log_client_status on clients;
create trigger trg_log_client_status after update on clients
for each row execute function log_client_status();

-- 3) Serviço adicionado / removido
create or replace function log_service_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare sname text;
begin
  select name into sname from services where id = new.service_id;
  insert into activity_logs (client_id, type, description)
  values (new.client_id, 'service_added', 'Novo serviço adicionado: ' || coalesce(sname, ''));
  return new;
end $$;

drop trigger if exists trg_log_service_added on client_services;
create trigger trg_log_service_added after insert on client_services
for each row execute function log_service_added();

create or replace function log_service_removed()
returns trigger language plpgsql security definer set search_path = public as $$
declare sname text;
begin
  -- Só registrar se o cliente ainda existir (não quebrar DELETE em cascata)
  if exists (select 1 from clients where id = old.client_id) then
    select name into sname from services where id = old.service_id;
    insert into activity_logs (client_id, type, description)
    values (old.client_id, 'service_removed', 'Serviço removido: ' || coalesce(sname, ''));
  end if;
  return old;
end $$;

drop trigger if exists trg_log_service_removed on client_services;
create trigger trg_log_service_removed after delete on client_services
for each row execute function log_service_removed();

-- 4) Publicação adicionada / realizada
create or replace function log_publication_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs (client_id, type, description)
  values (new.client_id, 'publication_added', 'Publicação adicionada: ' || new.title);
  return new;
end $$;

drop trigger if exists trg_log_publication_added on publications;
create trigger trg_log_publication_added after insert on publications
for each row execute function log_publication_added();

create or replace function log_publication_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and (old.status is distinct from new.status) then
    insert into activity_logs (client_id, type, description)
    values (new.client_id, 'publication_published', 'Publicação realizada: ' || new.title);
  end if;
  return new;
end $$;

drop trigger if exists trg_log_publication_published on publications;
create trigger trg_log_publication_published after update on publications
for each row execute function log_publication_published();

-- 5) Tarefa criada / concluída (preenche/limpa completed_at)
create or replace function log_task_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs (client_id, type, description)
  values (new.client_id, 'task_created', 'Nova tarefa criada: ' || new.title);
  return new;
end $$;

drop trigger if exists trg_log_task_created on tasks;
create trigger trg_log_task_created after insert on tasks
for each row execute function log_task_created();

create or replace function log_task_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and (old.status is distinct from new.status) then
    new.completed_at := now();
    insert into activity_logs (client_id, type, description)
    values (new.client_id, 'task_completed', 'Tarefa concluída: ' || new.title);
  elsif old.status = 'done' and new.status is distinct from old.status then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_log_task_done on tasks;
create trigger trg_log_task_done before update on tasks
for each row execute function log_task_done();

-- 6) Contato registrado
create or replace function log_contact()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs (client_id, type, description)
  values (
    new.client_id,
    'contact_logged',
    'Contato realizado pelo ' || new.channel || coalesce(': ' || nullif(new.subject, ''), '')
  );
  return new;
end $$;

drop trigger if exists trg_log_contact on contacts;
create trigger trg_log_contact after insert on contacts
for each row execute function log_contact();
