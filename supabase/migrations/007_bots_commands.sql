-- 007_bots_commands.sql — botão "Verificar agora" (ping de verdade).
-- Idempotente: pode rodar de novo no SQL Editor sem quebrar.
-- Ideia simples: o site deixa um bilhete "me responde", o robô lê e responde na hora.
-- O resto continua igual: ponto a cada 2 min, verde com 5 min, tela atualiza a cada 8s.

alter table bots add column if not exists pending_command text;
alter table bots add column if not exists command_requested_at timestamptz;

-- 1) Site pede ping (só quem está logado pode pedir).
create or replace function request_bot_ping(p_bot_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare now_ts timestamptz := now();
begin
  update bots
  set pending_command = 'ping',
      command_requested_at = now_ts,
      updated_at = now_ts
  where id = p_bot_id;
  return now_ts;
end $$;

-- 2) Robô lê se tem bilhete pra ele (usa chave anon, sem login — por isso security definer).
create or replace function fetch_pending_command(p_bot_id uuid)
returns table (pending_command text, command_requested_at timestamptz) language plpgsql security definer set search_path = public as $$
begin
  return query
  select b.pending_command, b.command_requested_at from bots b where b.id = p_bot_id;
end $$;

-- 3) Robô apaga o bilhete depois de responder.
create or replace function ack_bot_command(p_bot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bots
  set pending_command = null,
      updated_at = now()
  where id = p_bot_id;
end $$;

-- Permissões: pedido só pra logado, leitura/confirmação o robô (anon) também pode.
revoke all on function request_bot_ping(uuid) from anon;
grant execute on function request_bot_ping(uuid) to authenticated;
grant execute on function fetch_pending_command(uuid) to anon, authenticated;
grant execute on function ack_bot_command(uuid) to anon, authenticated;
