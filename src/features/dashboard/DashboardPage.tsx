import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseEnvMissing } from '../../lib/supabaseClient';
import { useToast } from '../../lib/toast';
import { EnvMissingScreen } from '../../components/ProtectedRoute';
import { Card, EmptyState, Skeleton, StatusBadge } from '../../components/ui';
import { formatDateBR, isOverdue, relativeDayLabel } from '../../lib/dates';
import { TASK_STATUS_LABEL } from '../../lib/constants';
import {
  contactsDue,
  fetchClientOverview,
  fetchPendingTasksCount,
  fetchRecentActivity,
  fetchUpcomingTasks,
  fetchWeekPublicationsCount,
  inactiveClients,
} from './api';
import type { ActivityLog, ClientOverview, Task } from '../../types/database';

export default function DashboardPage() {
  const { notifyError } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [tasks, setTasks] = useState<(Task & { client_name?: string })[]>([]);
  const [activity, setActivity] = useState<(ActivityLog & { client_name?: string })[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [weekPubs, setWeekPubs] = useState(0);

  useEffect(() => {
    if (supabaseEnvMissing) return;
    (async () => {
      try {
        const [c, t, a, pc, wp] = await Promise.all([
          fetchClientOverview(),
          fetchUpcomingTasks(),
          fetchRecentActivity(),
          fetchPendingTasksCount(),
          fetchWeekPublicationsCount(),
        ]);
        setClients(c);
        setTasks(t);
        setActivity(a);
        setPendingCount(pc);
        setWeekPubs(wp);
      } catch (e) {
        notifyError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (supabaseEnvMissing) return <EnvMissingScreen />;
  if (loading)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );

  const total = clients.length;
  const active = clients.filter((c) => c.status === 'active').length;
  const paused = clients.filter((c) => c.status === 'paused').length;
  const onboarding = clients.filter((c) => c.status === 'onboarding').length;
  const inactive = inactiveClients(clients);
  const due = contactsDue(clients);

  const cards = [
    { label: 'Total de clientes', value: total },
    { label: 'Ativos', value: active },
    { label: 'Pausados', value: paused },
    { label: 'Em implantação', value: onboarding },
    { label: 'Tarefas pendentes', value: pendingCount },
    { label: 'Publicações da semana', value: weekPubs },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Próximas tarefas</h2>
          {tasks.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Nenhuma tarefa pendente"
                hint="Quando houver tarefas pendentes ou em andamento, elas aparecem aqui."
                action={<Link to="/tarefas" className="text-sm font-medium text-blue-600">Ver tarefas</Link>}
              />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${t.due_date && isOverdue(t.due_date) ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.title}</span>
                    <span className="text-xs text-slate-500">
                      {t.due_date ? formatDateBR(t.due_date) : 'Sem prazo'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.client_name} · {TASK_STATUS_LABEL[t.status]}
                    {t.due_date && isOverdue(t.due_date) && (
                      <span className="ml-2 font-semibold text-red-600">Atrasada</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Atividade recente</h2>
          {activity.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Sem atividade ainda" hint="O histórico automático aparece aqui assim que você cadastrar clientes, tarefas e publicações." />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {activity.map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <Link to={`/clientes/${a.client_id}`} className="hover:underline">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {relativeDayLabel(a.created_at)}
                    </span>
                    <strong>{a.client_name}</strong> — {a.description}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Clientes sem atividade há mais de 14 dias</h2>
          {inactive.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nenhum cliente parado. Bom trabalho!</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {inactive.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Contatos para fazer</h2>
          <p className="text-xs text-slate-500">Próximo contato vencido ou nos próximos 7 dias.</p>
          {due.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nenhum contato urgente.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {due.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <span className={c.next_contact_at && isOverdue(c.next_contact_at) ? 'font-semibold text-red-600' : 'text-slate-600'}>
                    {formatDateBR(c.next_contact_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
