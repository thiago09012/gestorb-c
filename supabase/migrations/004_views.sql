-- View client_overview: uma linha por cliente com agregados para lista e dashboard.

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
  ) as last_activity_at
from clients c;
