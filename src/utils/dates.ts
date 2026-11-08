const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const longFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFormatter.format(d);
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : timeFormatter.format(d);
}

export function formatLongToday(date = new Date()): string {
  const text = longFormatter.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Converte um ISO em chave local yyyy-mm-dd. */
export function toLocalDateKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Dias inteiros decorridos entre a data e agora. */
export function daysSince(iso: string, now = new Date()): number {
  const diff = now.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function describeDaysSince(iso: string | null, now = new Date()): string {
  if (!iso) return 'nunca revisado';
  const days = daysSince(iso, now);
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

export function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && !Number.isNaN(new Date(value).getTime());
}
