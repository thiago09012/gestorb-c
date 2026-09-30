-- SEED OPCIONAL para teste visual. Rode APENAS se quiser dados de exemplo.
-- Para apagar depois: delete from clients; (o cascade limpa o resto)
-- + delete from services where is_custom = true;

do $$
declare
  cid1 uuid; cid2 uuid; cid3 uuid;
  sid_ads uuid; sid_insta uuid;
begin
  select id into sid_ads from services where name = 'Google Ads';
  select id into sid_insta from services where name = 'Gestão de Instagram';

  insert into clients (name, company_name, phone, whatsapp, city, status, next_contact_at)
  values ('Maria Silva', 'Loja da Maria', '11988887777', '11988887777', 'São Paulo', 'active', current_date + 2)
  returning id into cid1;

  insert into clients (name, company_name, phone, status, next_contact_at)
  values ('João Pereira', 'JP Consultoria', '21977776666', 'onboarding', current_date - 1)
  returning id into cid2;

  insert into clients (name, company_name, status)
  values ('Ana Costa', 'Ana Estética', 'paused')
  returning id into cid3;

  insert into client_services (client_id, service_id) values
    (cid1, sid_ads), (cid1, sid_insta), (cid2, sid_ads);

  insert into tasks (client_id, title, due_date, priority, status) values
    (cid1, 'Revisar campanha Google Ads', current_date - 1, 'high', 'pending'),
    (cid1, 'Criar 4 posts do mês', current_date + 3, 'normal', 'in_progress'),
    (cid2, 'Onboarding: coletar acessos', current_date, 'high', 'pending');

  insert into publications (client_id, published_at, platform, type, title, status) values
    (cid1, current_date - 2, 'Instagram', 'Reels', 'Bastidores da loja', 'published'),
    (cid1, current_date + 1, 'Instagram', 'Post', 'Promoção do mês', 'scheduled');

  insert into contacts (client_id, contacted_at, channel, subject, notes) values
    (cid1, current_date - 5, 'WhatsApp', 'Alinhamento mensal', 'Cliente satisfeita, pediu mais reels.'),
    (cid2, current_date - 20, 'Reunião', 'Kickoff', 'Aguardando acessos do cliente.');
end $$;
