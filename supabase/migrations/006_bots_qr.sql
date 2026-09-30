-- 006_bots_qr.sql — mostra o QR do WhatsApp dentro do site.
-- Idempotente: pode rodar de novo sem quebrar.
-- Ideia simples: o robô manda o texto do QR pro banco, o site desenha o QR na tela.

alter table bots add column if not exists qr_code text;
alter table bots add column if not exists qr_updated_at timestamptz;
alter table bots add column if not exists connection_status text not null default 'desconectado';

-- O robô usa a chave anon (sem login). Essa função deixa ele atualizar só o QR.
-- Mesmo padrão security definer que você já usa no report_bot_heartbeat.
create or replace function report_bot_qr(p_bot_id uuid, p_qr text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bots
  set qr_code = nullif(p_qr, ''),
      qr_updated_at = case when nullif(p_qr, '') is null then qr_updated_at else now() end,
      connection_status = case when nullif(p_qr, '') is null then connection_status else 'aguardando_qr' end,
      updated_at = now()
  where id = p_bot_id;
end $$;

-- Quando conecta, limpa o QR e marca online.
create or replace function report_bot_open(p_bot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bots
  set qr_code = null,
      connection_status = 'conectado',
      status = 'online',
      last_seen_at = now(),
      updated_at = now()
  where id = p_bot_id;
end $$;

-- Quando cai, marca desconectado (o vermelho aparece sozinho após 5 min sem ponto).
create or replace function report_bot_close(p_bot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bots
  set connection_status = 'desconectado',
      updated_at = now()
  where id = p_bot_id;
end $$;
