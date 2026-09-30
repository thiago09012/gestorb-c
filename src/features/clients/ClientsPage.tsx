import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabaseEnvMissing } from '../../lib/supabaseClient';
import { useToast } from '../../lib/toast';
import { EnvMissingScreen } from '../../components/ProtectedRoute';
import { Button, Card, EmptyState, Spinner, StatusBadge } from '../../components/ui';
import { CLIENT_FILTERS } from '../../lib/constants';
import { formatDateBR } from '../../lib/dates';
import { normalizeSearch, onlyDigits } from '../../lib/search';
import { deleteClient, fetchClients } from './api';
import ClientFormModal from './ClientFormModal';
import { ConfirmDialog } from '../../components/ui';
import type { ClientOverview } from '../../types/database';

export default function ClientsPage() {
  const { push, notifyError } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setClients(await fetchClients());
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
    const q = normalizeSearch(query);
    const qDigits = onlyDigits(query);
    return clients.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!q) return true;
      const nameHit = normalizeSearch(c.name).includes(q);
      const companyHit = normalizeSearch(c.company_name).includes(q);
      const phoneHit = qDigits ? onlyDigits(c.phone).includes(qDigits) || onlyDigits(c.whatsapp).includes(qDigits) : false;
      return nameHit || companyHit || phoneHit;
    });
  }, [clients, filter, query]);

  if (supabaseEnvMissing) return <EnvMissingScreen />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo cliente
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {CLIENT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
          hint={clients.length === 0 ? 'Cadastre seu primeiro cliente para começar.' : 'Ajuste a busca ou o filtro.'}
          action={
            clients.length === 0 ? <Button onClick={() => setShowModal(true)}>+ Novo cliente</Button> : undefined
          }
        />
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Serviços</th>
                  <th className="px-4 py-3">Bots</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Último contato</th>
                  <th className="px-4 py-3">Próxima tarefa</th>
                  <th className="px-4 py-3">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/clientes/${c.id}`} className="text-blue-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.company_name && <div className="text-xs text-slate-500">{c.company_name}</div>}
                    </td>
                    <td className="px-4 py-3">{c.phone ?? c.whatsapp ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {(c.services ?? []).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {(c.bots_total ?? 0) === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (c.bots_offline ?? 0) > 0 ? (
                        <span className="font-semibold text-red-600">🔴 {(c.bots_offline ?? 0)} off / {c.bots_total}</span>
                      ) : (
                        <span className="font-semibold text-green-700">🟢 {c.bots_online ?? c.bots_total}/{c.bots_total}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">{formatDateBR(c.last_contact_at)}</td>
                    <td className="px-4 py-3">
                      {c.next_task_title ? `${c.next_task_title} (${formatDateBR(c.next_task_due)})` : '—'}
                    </td>
                    <td className="px-4 py-3">{formatDateBR(c.created_at.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/clientes/${c.id}`} className="font-semibold text-blue-700">
                    {c.name}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">{c.phone ?? c.whatsapp ?? 'Sem telefone'}</p>
                <p className="text-xs text-slate-500">{(c.services ?? []).join(', ') || 'Sem serviços'}</p>
                <p className="mt-1 text-xs">
                  {(c.bots_total ?? 0) === 0 ? (
                    <span className="text-slate-400">Sem bots</span>
                  ) : (c.bots_offline ?? 0) > 0 ? (
                    <span className="font-semibold text-red-600">🔴 Bot offline</span>
                  ) : (
                    <span className="font-semibold text-green-700">🟢 Bot online</span>
                  )}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <ClientFormModal onClose={() => setShowModal(false)} onSaved={load} />
      )}
      {confirmId && (
        <ConfirmDialog
          title="Excluir cliente"
          message="Tem certeza? Todos os dados vinculados (tarefas, publicações, contatos e histórico) serão apagados. Essa ação não pode ser desfeita."
          onCancel={() => setConfirmId(null)}
          onConfirm={async () => {
            try {
              await deleteClient(confirmId);
              push('Cliente excluído.', 'success');
              setConfirmId(null);
              load();
            } catch (e) {
              notifyError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}
    </div>
  );
}
