import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnvMissing = !url || !anonKey;

if (supabaseEnvMissing) {
  console.error(
    'Variáveis de ambiente ausentes: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local (veja .env.example e SETUP.md).',
  );
}

export const supabase = createClient(url ?? 'https://missing.supabase.co', anonKey ?? 'missing-key');
