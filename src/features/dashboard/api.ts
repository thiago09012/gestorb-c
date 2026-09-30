import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { ActivityLog, ClientOverview, Task } from '../../types/database';
import { addDays, endOfWeekSunday, startOfWeekMonday, todayLocal } from '../../lib/dates';

async function throwFriendly(error: unknown, fallback: string): Promise<never> {
  const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : fallback;
  throw new Error(friendlyError(msg) || fallback);
}

export async function fetchClientOverview(): Promise<ClientOverview[]> {
  const { data, error } = await supabase.from('client_overview').select('*').order('name');
  if (error) await throwFriendly(error, 'Não foi possível carregar os clientes.');
  return (data ?? []) as ClientOverview[];
}

export async function fetchUpcomingTasks(limit = 8): Promise<(Task & { client_name?: string })[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, clients!inner(name)')
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) await throwFriendly(error, 'Não foi possível carregar as tarefas.');
  return ((data ?? []) as Array<Task & { clients: { name: string } }>).map((t) => ({
    ...t,
    client_name: t.clients?.name,
  }));
}

export async function fetchRecentActivity(limit = 10): Promise<(ActivityLog & { client_name?: string })[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, clients!inner(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) await throwFriendly(error, 'Não foi possível carregar a atividade recente.');
  return ((data ?? []) as Array<ActivityLog & { clients: { name: string } }>).map((a) => ({
    ...a,
    client_name: a.clients?.name,
  }));
}

export async function fetchWeekPublicationsCount(): Promise<number> {
  const start = startOfWeekMonday();
  const end = endOfWeekSunday();
  const { count, error } = await supabase
    .from('publications')
    .select('id', { count: 'exact', head: true })
    .gte('published_at', start)
    .lte('published_at', end);
  if (error) await throwFriendly(error, 'Não foi possível carregar as publicações da semana.');
  return count ?? 0;
}

export async function fetchPendingTasksCount(): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'done');
  if (error) await throwFriendly(error, 'Não foi possível carregar as tarefas.');
  return count ?? 0;
}

/** Clientes ativos/em implantação sem atividade há mais de 14 dias. */
export function inactiveClients(clients: ClientOverview[], days = 14): ClientOverview[] {
  const cutoff = addDays(todayLocal(), -days);
  return clients
    .filter((c) => c.status === 'active' || c.status === 'onboarding')
    .filter((c) => !c.last_activity_at || c.last_activity_at.slice(0, 10) < cutoff)
    .sort((a, b) => (a.last_activity_at ?? '').localeCompare(b.last_activity_at ?? ''));
}

/** Contatos para fazer: next_contact_at vencido ou nos próximos 7 dias. */
export function contactsDue(clients: ClientOverview[]): ClientOverview[] {
  const today = todayLocal();
  const limit = addDays(today, 7);
  return clients
    .filter((c) => c.next_contact_at && c.next_contact_at <= limit)
    .sort((a, b) => (a.next_contact_at ?? '').localeCompare(b.next_contact_at ?? ''));
}
