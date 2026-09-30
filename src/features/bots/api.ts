import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import type { Bot } from '../../types/database';

function err(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : fallback;
  return new Error(friendlyError(msg) || fallback);
}

export type BotInput = {
  client_id: string;
  name: string;
  provider?: string | null;
  instance_id?: string | null;
  status: Bot['status'];
  notes?: string | null;
};

/** Online = avisou nos últimos 5 minutos. Mesmo critério da view client_overview. */
export const BOT_ONLINE_WINDOW_MIN = 5;

export function isBotOnline(bot: Pick<Bot, 'last_seen_at'>): boolean {
  if (!bot.last_seen_at) return false;
  const diff = Date.now() - new Date(bot.last_seen_at).getTime();
  return diff >= 0 && diff < BOT_ONLINE_WINDOW_MIN * 60 * 1000;
}

export function botStatusLabel(bot: Bot): string {
  if (bot.status === 'manutencao') return 'Em manutenção';
  return isBotOnline(bot) ? 'Online' : 'Offline';
}

/** Bots que pararam de avisar (para o Dashboard). */
export function botsOffline<T extends Bot>(bots: T[]): T[] {
  return bots
    .filter((b) => b.status !== 'manutencao')
    .filter((b) => !isBotOnline(b))
    .sort((a, b) => (a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? ''));
}

export async function fetchBotsByClient(clientId: string): Promise<Bot[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('client_id', clientId)
    .order('name');
  if (error) {
    // Se a tabela ainda não foi criada no Supabase, mostra mensagem amigável
    if (error.message.includes('bots') && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      throw new Error('Tabela bots ainda não criada. Rode supabase/migrations/005_bots.sql no SQL Editor.');
    }
    throw err(error, 'Não foi possível carregar os bots.');
  }
  return (data ?? []) as Bot[];
}

export async function fetchAllBots(limit = 200): Promise<(Bot & { client_name?: string })[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('*, clients!inner(name)')
    .order('last_seen_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) {
    if (error.message.includes('bots') && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      throw new Error('Tabela bots ainda não criada. Rode supabase/migrations/005_bots.sql no SQL Editor.');
    }
    throw err(error, 'Não foi possível carregar os bots.');
  }
  return ((data ?? []) as Array<Bot & { clients: { name: string } }>).map((b) => ({
    ...b,
    client_name: b.clients?.name,
  }));
}

export async function createBot(input: BotInput): Promise<void> {
  const { error } = await supabase.from('bots').insert({
    client_id: input.client_id,
    name: input.name.trim(),
    provider: input.provider?.trim() || 'whatsapp',
    instance_id: input.instance_id?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
  });
  if (error) throw err(error, 'Não foi possível cadastrar o bot.');
}

export async function updateBot(id: string, input: Partial<BotInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.provider !== undefined) payload.provider = input.provider?.trim() || 'whatsapp';
  if (input.instance_id !== undefined) payload.instance_id = input.instance_id?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  const { error } = await supabase.from('bots').update(payload).eq('id', id);
  if (error) throw err(error, 'Não foi possível salvar o bot.');
}

export async function deleteBot(id: string): Promise<void> {
  const { error } = await supabase.from('bots').delete().eq('id', id);
  if (error) throw err(error, 'Não foi possível excluir o bot.');
}

/** Marca "testado agora" — atualiza last_seen_at para now() sem mexer no bot real. */
export async function touchBotNow(id: string): Promise<void> {
  const { error } = await supabase.from('bots').update({ last_seen_at: new Date().toISOString(), status: 'online' }).eq('id', id);
  if (error) throw err(error, 'Não foi possível testar o bot.');
}
