import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabaseEnvMissing } from '../../lib/supabaseClient';
import { useToast } from '../../lib/toast';
import { EnvMissingScreen } from '../../components/ProtectedRoute';
import { Button, Card, ConfirmDialog, EmptyState, Spinner } from '../../components/ui';
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../../lib/constants';
import { formatDateBR, isOverdue, todayLocal } from '../../lib/dates';
import { fetchClients } from '../clients/api';
import { deleteTask, fetchAllTasks, toggleTaskDone } from './api';
import TaskModal from './TaskModal';
import type { ClientOverview, Task } from '../../types/database';

type Filter = 'today' | 'upcoming' | 'overdue' | 'done' | 'all';

export default function TasksPage() {
  const { push, notifyError } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<(Task & { client_name?: string })[]>([]);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [clientFilter, setClientFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<(Task & { client_name?: string }) | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [t, c] = await Promise.all([fetchAllTasks(), fetchClients()]);
      setTasks(t);
      setClients(c);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabaseEnvMissing) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const today = todayLocal();
    return tasks.filter((t) => {
      if (clientFilter && t.client_id !== clientFilter) return false;
      if (filter === 'done') return t.status === 'done';
      if (filter === 'today') return t.status !== 'done' && t.due_date === today;
      if (filter === 'overdue') return t.status !== 'done' && !!t.due_date && isOverdue(t.due_date);
      if (filter === 'upcoming') return t.status !== 'done' && (!t.due_date || t.due_date >= today);
      return true;
    });
  }, [tasks, filter, clientFilter]);

  if (supabaseEnvMissing) return <EnvMissingScreen />;
  if (loading) return <Spinner />;

  const tabs: Array<[Filter, string]> = [
    ['all', 'Todas'],
    ['today', 'Hoje'],
    ['upcoming', 'Próximas'],
    ['overdue', 'Atrasadas'],
    ['done', 'Concluídas'],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tarefas</h1>
        <Button onClick={() => { setEditing(null); setShowModal(true); }}><Plus size={16} /> Nova tarefa</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1 text-sm ${filter === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma tarefa aqui" hint="Ajuste os filtros ou crie uma nova tarefa." action={<Button onClick={() => setShowModal(true)}>+ Nova tarefa</Button>} />
      ) : (
        <div className="grid gap-2">
          {filtered.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await toggleTaskDone(t);
                        push(t.status === 'done' ? 'Tarefa reaberta.' : 'Tarefa concluída!', 'success');
                        load();
                      } catch (e) { notifyError(e instanceof Error ? e.message : String(e)); }
                    }}
                    title="Concluir com 1 clique"
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${t.status === 'done' ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 text-transparent hover:border-green-600'}`}
                  >
                    <Check size={12} />
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-slate-400' : ''}`}>{t.title}</p>
                    <p className="text-xs text-slate-500">
                      <Link to={`/clientes/${t.client_id}`} className="text-blue-600 hover:underline">{t.client_name}</Link>
                      {' · '}{TASK_STATUS_LABEL[t.status]} · {TASK_PRIORITY_LABEL[t.priority]}
                      {t.due_date ? ` · ${formatDateBR(t.due_date)}` : ''}
                      {t.due_date && t.status !== 'done' && isOverdue(t.due_date) && <span className="ml-1 font-semibold text-red-600">Atrasada</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => { setEditing(t); setShowModal(true); }}><Pencil size={14} /></Button>
                  <Button variant="ghost" onClick={() => setConfirmId(t.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && <TaskModal task={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />}
      {confirmId && (
        <ConfirmDialog
          title="Excluir tarefa"
          message="Excluir esta tarefa? Essa ação não pode ser desfeita."
          onCancel={() => setConfirmId(null)}
          onConfirm={async () => {
            try {
              await deleteTask(confirmId);
              push('Tarefa excluída.', 'success');
              setConfirmId(null);
              load();
            } catch (e) { notifyError(e instanceof Error ? e.message : String(e)); }
          }}
        />
      )}
    </div>
  );
}
