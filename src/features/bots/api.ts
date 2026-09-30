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

/** Pede ping de verdade: deixa bilhete pro robô responder. Retorna a hora do pedido. */
export async function requestBotPing(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('request_bot_ping', { p_bot_id: id });
  if (error) {
    if (error.message.includes('request_bot_ping') && (error.message.includes('does not exist') || error.message.includes('function'))) {
      throw new Error('Ping ainda não ativado. Rode supabase/migrations/007_bots_commands.sql no SQL Editor.');
    }
    throw err(error, 'Não foi possível pedir verificação.');
  }
  return String(data);
}

export async function fetchBotById(id: string): Promise<Bot> {
  const { data, error } = await supabase.from('bots').select('*').eq('id', id).single();
  if (error) throw err(error, 'Não foi possível recarregar o bot.');
  return data as Bot;
}

/**
 * Espera o pong: o robô responde atualizando last_seen_at e limpando o bilhete.
 * Considera "respondeu" se last_seen_at ficar maior que a hora do pedido.
 * Retorna true se respondeu dentro do prazo, false se estourou o tempo.
 */
export async function waitForPong(id: string, requestedAtIso: string, timeoutMs = 25000, stepMs = 2000): Promise<boolean> {
  const requestedAt = new Date(requestedAtIso).getTime();
  const start = Date.now();
  // Pequena espera inicial: dá tempo do vigia do robô (10s) ver o bilhete.
  await new Promise((r) => setTimeout(r, 1500));
  while (Date.now() - start < timeoutMs) {
    try {
      const b = await fetchBotById(id);
      const seen = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      // Tolerância de 2s pro relógio: o pong precisa ser do pedido atual, não de antes.
      if (seen >= requestedAt - 2000 && (b.pending_command === null || b.pending_command === undefined || b.pending_command === '')) {
        return true;
      }
      // Mesmo com bilhete ainda lá, se o ponto é novo, conta como resposta.
      if (seen >= requestedAt - 2000 && Date.now() - seen < 15000) {
        return true;
      }
    } catch {
      // ignora erro de rede numa tentativa e continua esperando
    }
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return false;
}
