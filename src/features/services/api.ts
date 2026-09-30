import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { Service } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) throw err(error, 'Não foi possível carregar os serviços.');
  return (data ?? []) as Service[];
}

export async function renameService(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('services').update({ name: name.trim() }).eq('id', id);
  if (error) throw err(error, 'Não foi possível renomear o serviço.');
}

export async function deleteService(id: string): Promise<void> {
  const { count, error: e1 } = await supabase
    .from('client_services')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', id);
  if (e1) throw err(e1, 'Não foi possível verificar o uso do serviço.');
  if ((count ?? 0) > 0) throw new Error('Este serviço está em uso por clientes e não pode ser removido.');
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw err(error, 'Não foi possível remover o serviço.');
}
