import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { Publication } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export type PublicationInput = Omit<Publication, 'id' | 'created_at' | 'updated_at'>;

export async function fetchPublicationsByClient(clientId: string): Promise<Publication[]> {
  const { data, error } = await supabase
    .from('publications')
    .select('*')
    .eq('client_id', clientId)
    .order('published_at', { ascending: false });
  if (error) throw err(error, 'Não foi possível carregar as publicações.');
  return (data ?? []) as Publication[];
}

export async function fetchAllPublications(): Promise<(Publication & { client_name?: string })[]> {
  const { data, error } = await supabase
    .from('publications')
    .select('*, clients!inner(name)')
    .order('published_at', { ascending: false })
    .limit(200);
  if (error) throw err(error, 'Não foi possível carregar as publicações.');
  return ((data ?? []) as Array<Publication & { clients: { name: string } }>).map((p) => ({
    ...p,
    client_name: p.clients?.name,
  }));
}

export async function createPublication(input: PublicationInput): Promise<void> {
  const { error } = await supabase.from('publications').insert(input);
  if (error) throw err(error, 'Não foi possível criar a publicação.');
}

export async function updatePublication(id: string, input: Partial<PublicationInput>): Promise<void> {
  const { error } = await supabase.from('publications').update(input).eq('id', id);
  if (error) throw err(error, 'Não foi possível salvar a publicação.');
}

export async function deletePublication(id: string): Promise<void> {
  const { error } = await supabase.from('publications').delete().eq('id', id);
  if (error) throw err(error, 'Não foi possível excluir a publicação.');
}
