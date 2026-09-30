-- RLS ativado em todas as tabelas. Acesso total apenas para usuários autenticados.
-- Nenhuma política para anon (uso exclusivo do administrador logado).

alter table clients enable row level security;
alter table services enable row level security;
alter table client_services enable row level security;
alter table publications enable row level security;
alter table tasks enable row level security;
alter table contacts enable row level security;
alter table activity_logs enable row level security;

create policy admin_all on clients for all to authenticated using (true) with check (true);
create policy admin_all on services for all to authenticated using (true) with check (true);
create policy admin_all on client_services for all to authenticated using (true) with check (true);
create policy admin_all on publications for all to authenticated using (true) with check (true);
create policy admin_all on tasks for all to authenticated using (true) with check (true);
create policy admin_all on contacts for all to authenticated using (true) with check (true);
create policy admin_all on activity_logs for all to authenticated using (true) with check (true);
