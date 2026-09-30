/** Remove acentos, caixa e formatação de telefone para busca. */
export function normalizeSearch(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function onlyDigits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '');
}

/** wa.me exige só dígitos com DDI. Assume Brasil (55) se não houver DDI. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const d = onlyDigits(phone);
  if (!d) return null;
  if (d.startsWith('55') && d.length >= 12) return d;
  return `55${d}`;
}

export function cleanInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const h = handle.trim().replace(/^@+/, '').replace(/\/$/, '');
  return h || null;
}

export function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Traduz erro do Supabase/Auth para português amigável. */
export function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado. Confirme no Supabase.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Falha de conexão. Verifique a internet e as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.';
  if (m.includes('jwt') || m.includes('session')) return 'Sessão expirada. Entre novamente.';
  if (m.includes('duplicate key') || m.includes('already exists'))
    return 'Registro duplicado. Já existe um item com esse valor.';
  if (m.includes('violates foreign key'))
    return 'Não é possível concluir: há registros vinculados.';
  return message || 'Ocorreu um erro inesperado.';
}
