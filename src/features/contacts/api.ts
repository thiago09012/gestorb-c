import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { Contact } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export async function fetchContactsByClient(clientId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('contacted_at', { ascending: false });
  if (error) throw err(error, 'Não foi possível carregar os contatos.');
  return (data ?? []) as Contact[];
}

export async function createContact(input: {
  client_id: string;
  contacted_at: string;
  channel: Contact['channel'];
  subject?: string | null;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('contacts').insert({
    client_id: input.client_id,
    contacted_at: input.contacted_at,
    channel: input.channel,
    subject: input.subject?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (error) throw err(error, 'Não foi possível registrar o contato.');
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw err(error, 'Não foi possível excluir o contato.');
}
