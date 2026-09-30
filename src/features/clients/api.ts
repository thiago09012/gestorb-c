import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { Client, ClientOverview, Service } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg =
    e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export async function fetchClients(): Promise<ClientOverview[]> {
  const { data, error } = await supabase.from('client_overview').select('*').order('name');
  if (error) throw err(error, 'Não foi possível carregar os clientes.');
  return (data ?? []) as ClientOverview[];
}

export async function fetchClient(id: string): Promise<ClientOverview | null> {
  const { data, error } = await supabase.from('client_overview').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw err(error, 'Não foi possível carregar o cliente.');
  }
  return data as ClientOverview;
}

export interface ClientFormValues {
  name: string;
  company_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  instagram?: string | null;
  website?: string | null;
  notes?: string | null;
  status: Client['status'];
  next_contact_at?: string | null;
  service_ids: string[];
}

function clean(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

export async function createClient(values: ClientFormValues): Promise<Client> {
  const { service_ids, ...rest } = values;
  const payload = {
    name: rest.name.trim(),
    company_name: clean(rest.company_name),
    phone: clean(rest.phone),
    whatsapp: clean(rest.whatsapp),
    email: clean(rest.email),
    city: clean(rest.city),
    instagram: clean(rest.instagram)?.replace(/^@+/, '') ?? null,
    website: clean(rest.website),
    notes: clean(rest.notes),
    status: rest.status,
    next_contact_at: rest.next_contact_at || null,
  };
  const { data, error } = await supabase.from('clients').insert(payload).select('*').single();
  if (error) throw err(error, 'Não foi possível criar o cliente.');
  const client = data as Client;
  if (service_ids.length > 0) {
    const rows = service_ids.map((service_id) => ({ client_id: client.id, service_id }));
    const { error: e2 } = await supabase.from('client_services').insert(rows);
    if (e2) throw err(e2, 'Cliente criado, mas falhou ao vincular serviços.');
  }
  return client;
}

export async function updateClient(id: string, values: ClientFormValues): Promise<void> {
  const { service_ids, ...rest } = values;
  const payload = {
    name: rest.name.trim(),
    company_name: clean(rest.company_name),
    phone: clean(rest.phone),
    whatsapp: clean(rest.whatsapp),
    email: clean(rest.email),
    city: clean(rest.city),
    instagram: clean(rest.instagram)?.replace(/^@+/, '') ?? null,
    website: clean(rest.website),
    notes: clean(rest.notes),
    status: rest.status,
    next_contact_at: rest.next_contact_at || null,
  };
  const { error } = await supabase.from('clients').update(payload).eq('id', id);
  if (error) throw err(error, 'Não foi possível salvar as alterações.');

  // Sincronizar serviços: buscar atuais, inserir novos, remover os que saíram
  const { data: current, error: e2 } = await supabase
    .from('client_services')
    .select('service_id')
    .eq('client_id', id);
  if (e2) throw err(e2, 'Cliente salvo, mas falhou ao ler serviços.');
  const currentIds = new Set((current ?? []).map((r) => r.service_id));
  const wanted = new Set(service_ids);
  const toAdd = [...wanted].filter((s) => !currentIds.has(s));
  const toRemove = [...currentIds].filter((s) => !wanted.has(s));
  if (toAdd.length > 0) {
    const { error: e3 } = await supabase
      .from('client_services')
      .insert(toAdd.map((service_id) => ({ client_id: id, service_id })));
    if (e3) throw err(e3, 'Falhou ao adicionar serviços.');
  }
  if (toRemove.length > 0) {
    const { error: e4 } = await supabase
      .from('client_services')
      .delete()
      .eq('client_id', id)
      .in('service_id', toRemove);
    if (e4) throw err(e4, 'Falhou ao remover serviços.');
  }
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw err(error, 'Não foi possível excluir o cliente.');
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) throw err(error, 'Não foi possível carregar os serviços.');
  return (data ?? []) as Service[];
}

export async function fetchClientServiceIds(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('client_services')
    .select('service_id')
    .eq('client_id', clientId);
  if (error) throw err(error, 'Não foi possível carregar os serviços do cliente.');
  return (data ?? []).map((r) => r.service_id);
}
