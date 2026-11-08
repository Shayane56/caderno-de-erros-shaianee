import { readPreference, removePreference, writePreference } from '../preferences';

export interface SyncConfig {
  url: string;
  anonKey: string;
  /** Origem da configuração: variáveis de ambiente (build) ou informada na tela. */
  source: 'env' | 'user';
}

const CONFIG_PREF = 'sync-config';

function envConfig(): SyncConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return url && anonKey ? { url, anonKey, source: 'env' } : null;
}

export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Configuração ativa: a informada pelo usuário tem prioridade sobre a do build. */
export function getSyncConfig(): SyncConfig | null {
  const user = readPreference<{ url: string; anonKey: string } | null>(CONFIG_PREF, null);
  if (user?.url && user.anonKey) return { url: user.url, anonKey: user.anonKey, source: 'user' };
  return envConfig();
}

export function saveSyncConfig(url: string, anonKey: string): SyncConfig {
  const clean = { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim() };
  if (!isValidSupabaseUrl(clean.url)) throw new Error('Informe a URL do projeto Supabase (https://xxxx.supabase.co).');
  if (clean.anonKey.length < 20) throw new Error('Informe a chave pública (anon key) do projeto.');
  writePreference(CONFIG_PREF, clean);
  return { ...clean, source: 'user' };
}

export function clearSyncConfig(): void {
  removePreference(CONFIG_PREF);
}
