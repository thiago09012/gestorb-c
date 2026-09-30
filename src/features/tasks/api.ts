import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { Task } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export type TaskInput = {
  client_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: Task['priority'];
  status: Task['status'];
  notes?: string | null;
};

export async function fetchTasksByClient(clientId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw err(error, 'Não foi possível carregar as tarefas.');
  return (data ?? []) as Task[];
}

export async function fetchAllTasks(): Promise<(Task & { client_name?: string })[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, clients!inner(name)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) throw err(error, 'Não foi possível carregar as tarefas.');
  return ((data ?? []) as Array<Task & { clients: { name: string } }>).map((t) => ({
    ...t,
    client_name: t.clients?.name,
  }));
}

export async function createTask(input: TaskInput): Promise<void> {
  const { error } = await supabase.from('tasks').insert({
    client_id: input.client_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    due_date: input.due_date || null,
    priority: input.priority,
    status: input.status,
    notes: input.notes?.trim() || null,
  });
  if (error) throw err(error, 'Não foi possível criar a tarefa.');
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.due_date !== undefined) payload.due_date = input.due_date || null;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  const { error } = await supabase.from('tasks').update(payload).eq('id', id);
  if (error) throw err(error, 'Não foi possível salvar a tarefa.');
}

export async function toggleTaskDone(task: Task): Promise<void> {
  const done = task.status !== 'done';
  await updateTask(task.id, { status: done ? 'done' : 'pending' });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw err(error, 'Não foi possível excluir a tarefa.');
}
