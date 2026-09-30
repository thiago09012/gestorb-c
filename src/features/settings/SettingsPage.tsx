import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmDialog, Input } from '../../components/ui';
import { deleteService, fetchServices, renameService } from '../services/api';
import type { Service } from '../../types/database';

export default function SettingsPage() {
  const { push, notifyError } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? '');
      setServices(await fetchServices());
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const custom = services.filter((s) => s.is_custom);
  const standard = services.filter((s) => !s.is_custom);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <h2 className="font-semibold">Conta</h2>
        <p className="mt-1 text-sm text-slate-600">Logado como: <strong>{email || '—'}</strong></p>
        <Button variant="secondary" className="mt-3" onClick={handleLogout}>Sair</Button>
      </Card>

      <Card>
        <h2 className="font-semibold">Serviços padrão</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {standard.length === 0 && <p className="text-sm text-slate-500">Nenhum.</p>}
          {standard.map((s) => (
            <span key={s.id} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600">{s.name}</span>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Serviços personalizados</h2>
        <p className="mt-0.5 text-xs text-slate-500">Só é possível remover serviços que não estejam em uso por nenhum cliente.</p>
        {custom.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum serviço personalizado. Novos serviços são criados no formulário do cliente.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {custom.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                {editingId === s.id ? (
                  <div className="flex flex-1 gap-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <Button
                      onClick={async () => {
                        try {
                          await renameService(s.id, editName);
                          push('Serviço renomeado.', 'success');
                          setEditingId(null);
                          load();
                        } catch (e) { notifyError(e instanceof Error ? e.message : String(e)); }
                      }}
                    >
                      Salvar
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm">{s.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => { setEditingId(s.id); setEditName(s.name); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" onClick={() => setConfirmId(s.id)}><Trash2 size={14} /></Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirmId && (
        <ConfirmDialog
          title="Remover serviço"
          message="Remover este serviço personalizado? Só é possível se ele não estiver em uso."
          confirmLabel="Remover"
          onCancel={() => setConfirmId(null)}
          onConfirm={async () => {
            try {
              await deleteService(confirmId);
              push('Serviço removido.', 'success');
              setConfirmId(null);
              load();
            } catch (e) { notifyError(e instanceof Error ? e.message : String(e)); }
          }}
        />
      )}
    </div>
  );
}
