import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseEnvMissing } from '../../lib/supabaseClient';
import { useToast } from '../../lib/toast';
import { EnvMissingScreen } from '../../components/ProtectedRoute';
import { Card, EmptyState, Spinner } from '../../components/ui';
import { PUBLICATION_PLATFORMS, PUBLICATION_STATUS_LABEL } from '../../lib/constants';
import { formatDateBR } from '../../lib/dates';
import { fetchClients } from '../clients/api';
import { fetchAllPublications } from './api';
import type { ClientOverview, Publication } from '../../types/database';

export default function PublicationsPage() {
  const { notifyError } = useToast();
  const [loading, setLoading] = useState(true);
  const [pubs, setPubs] = useState<(Publication & { client_name?: string })[]>([]);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (supabaseEnvMissing) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [p, c] = await Promise.all([fetchAllPublications(), fetchClients()]);
        setPubs(p);
        setClients(c);
      } catch (e) {
        notifyError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      pubs.filter(
        (p) =>
          (!clientFilter || p.client_id === clientFilter) &&
          (!platformFilter || p.platform === platformFilter) &&
          (!statusFilter || p.status === statusFilter),
      ),
    [pubs, clientFilter, platformFilter, statusFilter],
  );

  if (supabaseEnvMissing) return <EnvMissingScreen />;
  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Publicações</h1>

      <div className="flex flex-wrap gap-2">
        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Todas as plataformas</option>
          {PUBLICATION_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Todos os status</option>
          {(Object.keys(PUBLICATION_STATUS_LABEL) as Array<keyof typeof PUBLICATION_STATUS_LABEL>).map((k) => (
            <option key={k} value={k}>{PUBLICATION_STATUS_LABEL[k]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={pubs.length === 0 ? 'Nenhuma publicação registrada' : 'Nenhum resultado para os filtros'}
          hint="As publicações são criadas dentro da página de cada cliente, na aba Publicações."
          action={<Link to="/clientes" className="text-sm font-medium text-blue-600">Ver clientes</Link>}
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map((p) => (
            <Card key={p.id}>
              <p className="text-sm font-medium">{p.title}</p>
              <p className="text-xs text-slate-500">
                <Link to={`/clientes/${p.client_id}`} className="text-blue-600 hover:underline">{p.client_name}</Link>
                {' · '}{formatDateBR(p.published_at)} · {p.platform} · {p.type} · {PUBLICATION_STATUS_LABEL[p.status]}
              </p>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Abrir link</a>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
