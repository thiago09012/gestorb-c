// Utilidades de data no fuso America/Sao_Paulo.
// Colunas `date` são strings YYYY-MM-DD — fazer parse manual para evitar bug de UTC.

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "hoje" no relógio real, formato YYYY-MM-DD (horário local). */
export function todayLocal(): string {
  return toDateOnly(new Date());
}

export function formatDateBR(dateOnly: string | null | undefined): string {
  if (!dateOnly) return '—';
  const d = parseDateOnly(dateOnly);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Rótulo relativo: Hoje / Ontem / dd/mm/aaaa */
export function relativeDayLabel(isoOrDate: string): string {
  const today = todayLocal();
  let key: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) {
    key = isoOrDate;
  } else {
    // timestamptz -> converter para data local
    const d = new Date(isoOrDate);
    const parts = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
    key = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (key === today) return 'Hoje';
  const y = parseDateOnly(today);
  y.setDate(y.getDate() - 1);
  if (key === toDateOnly(y)) return 'Ontem';
  const [yy, mm, dd] = key.split('-');
  return `${dd}/${mm}/${yy}`;
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return dueDate < todayLocal();
}

export function daysDiff(fromDateOnly: string, toDateOnlyStr: string): number {
  const a = parseDateOnly(fromDateOnly).getTime();
  const b = parseDateOnly(toDateOnlyStr).getTime();
  return Math.round((b - a) / 86400000);
}

export function addDays(dateOnly: string, days: number): string {
  const d = parseDateOnly(dateOnly);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

export function startOfWeekMonday(today = todayLocal()): string {
  const d = parseDateOnly(today);
  const dow = (d.getDay() + 6) % 7; // seg=0
  d.setDate(d.getDate() - dow);
  return toDateOnly(d);
}

export function endOfWeekSunday(today = todayLocal()): string {
  const d = parseDateOnly(startOfWeekMonday(today));
  d.setDate(d.getDate() + 6);
  return toDateOnly(d);
}
