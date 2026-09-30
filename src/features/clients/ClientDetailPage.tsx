import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../lib/toast';
import { friendlyError, normalizeWebsite, cleanInstagram, toWhatsAppNumber } from '../../lib/search';
import { formatDateBR, formatDateTimeBR, isOverdue, relativeDayLabel } from '../../lib/dates';
import {
  PUBLICATION_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../../lib/constants';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Spinner,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import { deleteClient, fetchClient } from './api';
import ClientFormModal from './ClientFormModal';
import { deletePublication, fetchPublicationsByClient } from '../publications/api';
import PublicationModal from '../publications/PublicationModal';
import { deleteTask, fetchTasksByClient, toggleTaskDone } from '../tasks/api';
import TaskModal from '../tasks/TaskModal';
import { fetchContactsByClient } from '../contacts/api';
import ContactModal from '../contacts/ContactModal';
import { addManualNote, fetchActivityByClient } from '../activity/api';
import type { ActivityLog, ClientOverview, Contact, Publication, Task } from '../../types/database';

const TABS = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'publications', label: 'Publicações' },
  { value: 'tasks', label: 'Tarefas' },
  { value: 'history', label: 'Histórico' },
  { value: 'info', label: 'Informações' },
] as const;

export default function ClientDetailPage({ initialTab }: { initialTab?: string }) {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push, notifyError } = useToast();

  const tab = searchParams.get('tab') ?? initialTab ?? 'overview';

  const [client, setClient] = useState<ClientOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showPubModal, setShowPubModal] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);
  const [confirmPubId, setConfirmPubId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [nextContact, setNextContact] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const c = await fetchClient(id);
      if (!c) {
        push('Cliente não encontrado.', 'error');
        navigate('/clientes');
        return;
      }
      setClient(c);
      setNextContact(c.next_contact_at ?? '');
      const [p, t, ct, a] = await Promise.all([
        fetchPublicationsByClient(id),
        fetchTasksByClient(id),
        fetchContactsByClient(id),
        fetchActivityByClient(id),
      ]);
      setPubs(p);
      setTasks(t);
      setContacts(ct);
      setActivity(a);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function setTab(v: string) {
    setSearchParams(v === 'overview' ? {} : { tab: v });
  }

  async function saveNextContact() {
    if (!id) return;
    const { error } = await supabase
      .from('clients')
      .update({ next_contact_at: nextContact || null })
      .eq('id', id);
    if (error) notifyError(friendlyError(error.message));
    else {
      push('Próximo contato atualizado.', 'success');
      load();
    }
  }

  async function handleToggleTask(t: Task) {
    try {
      await toggleTaskDone(t);
      push(t.status === 'done' ? 'Tarefa reaberta.' : 'Tarefa concluída!', 'success');
      load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleAddNote() {
    if (!id || !noteText.trim()) return;
    try {
      await addManualNote(id, noteText);
      push('Observação adicionada.', 'success');
      setNoteText('');
      setShowNote(false);
      load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) return <Spinner />;
  if (!client) return <EmptyState title="Cliente não encontrado" action={<Link to="/clientes" className="text-blue-600 text-sm">Voltar para clientes</Link>} />;

  const wa = toWhatsAppNumber(client.whatsapp ?? client.phone);
  const ig = cleanInstagram(client.instagram);
  const site = normalizeWebsite(client.website);
  const lastContact = contacts[0];
  const nextTask = tasks.find((t) => t.status !== 'done') ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/clientes" className="text-sm text-slate-500 hover:text-slate-800">← Voltar para clientes</Link>

      {/* Topo */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            {client.company_name && <p className="mt-0.5 text-sm text-slate-500">{client.company_name}</p>}
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  <ExternalLink size={14} /> WhatsApp
                </a>
              )}
              {ig && (
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  <ExternalLink size={14} /> Instagram
                </a>
              )}
              {site && (
                <a href={site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  <ExternalLink size={14} /> Site
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(true)}>
              <Pencil size={14} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} /> Excluir
            </Button>
          </div>
        </div>
      </Card>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${
              tab === t.value ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold">Serviços</h2>
            <p className="mt-1 text-sm text-slate-600">{(client.services ?? []).join(', ') || 'Nenhum serviço vinculado.'}</p>
          </Card>
          <Card>
            <h2 className="font-semibold">Último contato</h2>
            {lastContact ? (
              <p className="mt-1 text-sm text-slate-600">
                {formatDateBR(lastContact.contacted_at)} · {lastContact.channel}
                {lastContact.subject ? ` — ${lastContact.subject}` : ''}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Nenhum contato registrado ainda.</p>
            )}
            <Button variant="secondary" className="mt-2" onClick={() => setShowContact(true)}>Registrar contato</Button>
          </Card>
          <Card>
            <h2 className="font-semibold">Próximo contato</h2>
            <div className="mt-2 flex gap-2">
              <Input type="date" value={nextContact} onChange={(e) => setNextContact(e.target.value)} />
              <Button variant="secondary" onClick={saveNextContact}>Salvar</Button>
            </div>
            {client.next_contact_at && isOverdue(client.next_contact_at) && (
              <p className="mt-1 text-sm font-medium text-red-600">Contato em atraso ({formatDateBR(client.next_contact_at)}).</p>
            )}
          </Card>
          <Card>
            <h2 className="font-semibold">Próxima tarefa</h2>
            {nextTask ? (
              <p className="mt-1 text-sm text-slate-600">
                {nextTask.title} ({nextTask.due_date ? formatDateBR(nextTask.due_date) : 'sem prazo'})
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Nenhuma tarefa pendente.</p>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="font-semibold">Últimas atividades</h2>
            {activity.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Sem histórico ainda.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {activity.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{relativeDayLabel(a.created_at)}</span>
                    {a.description}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'publications' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPub(null); setShowPubModal(true); }}>+ Nova publicação</Button>
          </div>
          {pubs.length === 0 ? (
            <EmptyState title="Nenhuma publicação" hint="Registre o que foi publicado para este cliente." action={<Button onClick={() => setShowPubModal(true)}>+ Nova publicação</Button>} />
          ) : (
            <div className="grid gap-3">
              {pubs.map((p) => (
                <Card key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateBR(p.published_at)} · {p.platform} · {p.type} · {PUBLICATION_STATUS_LABEL[p.status]}
                      </p>
                      {p.caption && <p className="mt-1 text-sm text-slate-600">{p.caption}</p>}
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Abrir link</a>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => { setEditingPub(p); setShowPubModal(true); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" onClick={() => setConfirmPubId(p.id)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Nova tarefa</Button>
          </div>
          {tasks.length === 0 ? (
            <EmptyState title="Nenhuma tarefa" hint="Crie tarefas para organizar o trabalho deste cliente." action={<Button onClick={() => setShowTaskModal(true)}>+ Nova tarefa</Button>} />
          ) : (
            <div className="grid gap-2">
              {tasks.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleToggleTask(t)}
                        title={t.status === 'done' ? 'Reabrir tarefa' : 'Concluir com 1 clique'}
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${t.status === 'done' ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 text-transparent hover:border-green-600'}`}
                      >
                        <Check size={12} />
                      </button>
                      <div>
                        <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-slate-400' : ''}`}>{t.title}</p>
                        <p className="text-xs text-slate-500">
                          {TASK_STATUS_LABEL[t.status]} · {TASK_PRIORITY_LABEL[t.priority]}
                          {t.due_date ? ` · ${formatDateBR(t.due_date)}` : ''}
                          {t.due_date && t.status !== 'done' && isOverdue(t.due_date) && <span className="ml-1 font-semibold text-red-600">Atrasada</span>}
                        </p>
                        {t.description && <p className="mt-1 text-sm text-slate-600">{t.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => { setEditingTask(t); setShowTaskModal(true); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" onClick={() => setConfirmTaskId(t.id)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowNote(true)}>+ Adicionar observação</Button>
          </div>
          {activity.length === 0 && contacts.length === 0 ? (
            <EmptyState title="Sem histórico" hint="O histórico é gerado automaticamente. Você também pode adicionar observações manuais." />
          ) : (
            <div className="flex flex-col gap-2">
              {activity.map((a) => (
                <Card key={a.id}>
                  <p className="text-sm">{a.description}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTimeBR(a.created_at)} · {a.type === 'manual_note' ? 'Observação manual' : 'Automático'}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'info' && (
        <Card>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {([
              ['Nome', client.name],
              ['Empresa', client.company_name ?? '—'],
              ['Telefone', client.phone ?? '—'],
              ['WhatsApp', client.whatsapp ?? '—'],
              ['E-mail', client.email ?? '—'],
              ['Cidade', client.city ?? '—'],
              ['Instagram', client.instagram ? `@${cleanInstagram(client.instagram)}` : '—'],
              ['Site', client.website ?? '—'],
              ['Próximo contato', formatDateBR(client.next_contact_at)],
              ['Cadastro', formatDateBR(client.created_at.slice(0, 10))],
            ] as Array<[string, string]>).map(([k, v]) => (
              <div key={k}><dt className="text-xs uppercase text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
          {client.notes && <div className="mt-3"><p className="text-xs uppercase text-slate-500">Observações</p><p className="text-sm">{client.notes}</p></div>}
        </Card>
      )}

      {/* Modais */}
      {showEdit && <ClientFormModal client={client} onClose={() => setShowEdit(false)} onSaved={load} />}
      {showDelete && (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Excluir "${client.name}" e todos os dados vinculados? Essa ação não pode ser desfeita.`}
          onCancel={() => setShowDelete(false)}
          onConfirm={async () => {
            try {
              await deleteClient(client.id);
              push('Cliente excluído.', 'success');
              navigate('/clientes');
            } catch (e) {
              notifyError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}
      {showContact && <ContactModal clientId={client.id} onClose={() => setShowContact(false)} onSaved={load} />}
      {showPubModal && <PublicationModal clientId={client.id} publication={editingPub} onClose={() => { setShowPubModal(false); setEditingPub(null); }} onSaved={load} />}
      {confirmPubId && (
        <ConfirmDialog
          title="Excluir publicação"
          message="Excluir esta publicação? Essa ação não pode ser desfeita."
          onCancel={() => setConfirmPubId(null)}
          onConfirm={async () => {
            try {
              await deletePublication(confirmPubId);
              push('Publicação excluída.', 'success');
              setConfirmPubId(null);
              load();
            } catch (e) { notifyError(e instanceof Error ? e.message : String(e)); }
          }}
        />
      )}
      {showTaskModal && <TaskModal fixedClientId={client.id} task={editingTask} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} onSaved={load} />}
      {confirmTaskId && (
        <ConfirmDialog
          title="Excluir tarefa"
          message="Excluir esta tarefa? Essa ação não pode ser desfeita."
          onCancel={() => setConfirmTaskId(null)}
          onConfirm={async () => {
            try {
              await deleteTask(confirmTaskId);
              push('Tarefa excluída.', 'success');
              setConfirmTaskId(null);
              load();
            } catch (e) { notifyError(e instanceof Error ? e.message : String(e)); }
          }}
        />
      )}
      {showNote && (
        <Modal title="Adicionar observação" onClose={() => setShowNote(false)}>
          <Textarea rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escreva a observação…" />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNote(false)}>Cancelar</Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim()}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
