import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { ActivityLog } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export async function fetchActivityByClient(clientId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw err(error, 'Não foi possível carregar o histórico.');
  return (data ?? []) as ActivityLog[];
}

export async function addManualNote(clientId: string, description: string): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    client_id: clientId,
    type: 'manual_note',
    description: description.trim(),
  });
  if (error) throw err(error, 'Não foi possível adicionar a observação.');
}
