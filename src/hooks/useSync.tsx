import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { usePendingCount } from './useData';
import { useOnlineStatus } from './useOnlineStatus';
import { clearSyncConfig, getSyncConfig, saveSyncConfig, type SyncConfig } from '@/services/sync/config';
import { createSupabaseAdapter, getSupabaseClient, resetSupabaseClient } from '@/services/sync/supabaseClient';
import { clearSyncState, loadSyncState, runSync } from '@/services/sync/syncEngine';

/**
 * Estados possíveis — "synced" só é exibido após uma sincronização concluída
 * com sucesso e sem alterações locais pendentes.
 */
export type SyncStatus = 'local' | 'connecting' | 'signed_out' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error';

export interface SyncUser {
  id: string;
  email: string;
}

interface SyncContextValue {
  config: SyncConfig | null;
  status: SyncStatus;
  user: SyncUser | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  pendingCount: number;
  online: boolean;
  configure: (url: string, anonKey: string) => Promise<void>;
  removeConfig: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const AUTO_SYNC_INTERVAL = 5 * 60_000;
const CHANGE_DEBOUNCE = 4_000;

/** Traduz falhas comuns do Supabase/rede para mensagens claras. */
export function describeSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|network|fetch failed|Load failed/i.test(message)) {
    return 'Sem conexão com o servidor. Suas alterações continuam salvas neste dispositivo.';
  }
  if (/caderno_records|caderno_push|does not exist|schema cache/i.test(message)) {
    return 'A estrutura do banco na nuvem não foi encontrada. Execute o script docs/supabase.sql no seu projeto Supabase.';
  }
  if (/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(message)) return 'Confirme seu e-mail pelo link enviado antes de entrar.';
  if (/JWT|token|not authenticated/i.test(message)) return 'Sua sessão expirou. Entre novamente.';
  if (/User already registered/i.test(message)) return 'Já existe uma conta com este e-mail. Use "Entrar".';
  if (/Password should be/i.test(message)) return 'A senha deve ter pelo menos 6 caracteres.';
  return message || 'Falha desconhecida na sincronização.';
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SyncConfig | null>(() => getSyncConfig());
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<SyncUser | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const pendingCount = usePendingCount();
  const online = useOnlineStatus();
  const running = useRef(false);

  // Conecta ao Supabase quando houver configuração.
  useEffect(() => {
    if (!config) {
      setClient(null);
      setUser(null);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setConnecting(true);
    getSupabaseClient(config)
      .then(async (c) => {
        if (cancelled) return;
        setClient(c);
        const { data } = await c.auth.getSession();
        const u = data.session?.user;
        if (!cancelled) setUser(u ? { id: u.id, email: u.email ?? '' } : null);
        const sub = c.auth.onAuthStateChange((_event, session) => {
          const su = session?.user;
          setUser(su ? { id: su.id, email: su.email ?? '' } : null);
        });
        unsubscribe = () => sub.data.subscription.unsubscribe();
      })
      .catch((error) => !cancelled && setLastError(describeSyncError(error)))
      .finally(() => !cancelled && setConnecting(false));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [config]);

  useEffect(() => {
    if (!user) return;
    void loadSyncState(user.id).then((s) => setLastSyncedAt(s.lastSyncedAt));
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!client || !user || running.current) return;
    if (!navigator.onLine) {
      setLastError('Você está offline. A sincronização será retomada quando a conexão voltar.');
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      const result = await runSync(createSupabaseAdapter(client), user.id);
      setLastSyncedAt(result.finishedAt);
      setLastError(null);
    } catch (error) {
      setLastError(describeSyncError(error));
    } finally {
      running.current = false;
      setSyncing(false);
    }
  }, [client, user]);

  // Sincroniza ao entrar, ao voltar a conexão e periodicamente.
  useEffect(() => {
    if (!client || !user || !online) return;
    void syncNow();
    const timer = window.setInterval(() => void syncNow(), AUTO_SYNC_INTERVAL);
    return () => window.clearInterval(timer);
  }, [client, user, online, syncNow]);

  // Envia alterações locais pouco depois de acontecerem.
  useEffect(() => {
    if (!client || !user || !online || pendingCount === 0) return;
    const timer = window.setTimeout(() => void syncNow(), CHANGE_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [pendingCount, client, user, online, syncNow]);

  const configure = useCallback(async (url: string, anonKey: string) => {
    const next = saveSyncConfig(url, anonKey);
    resetSupabaseClient();
    setLastError(null);
    setConfig(next);
  }, []);

  const removeConfig = useCallback(async () => {
    try {
      await client?.auth.signOut();
    } catch {
      /* ignorado: a configuração é removida mesmo offline */
    }
    clearSyncConfig();
    resetSupabaseClient();
    await clearSyncState();
    setUser(null);
    setLastSyncedAt(null);
    setLastError(null);
    setConfig(getSyncConfig());
  }, [client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error('Configure a sincronização primeiro.');
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(describeSyncError(error));
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error('Configure a sincronização primeiro.');
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(describeSyncError(error));
      return { needsConfirmation: !data.session };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (client) await client.auth.signOut();
    await clearSyncState();
    setLastSyncedAt(null);
    setLastError(null);
  }, [client]);

  const status: SyncStatus = !config
    ? 'local'
    : connecting
      ? 'connecting'
      : !user
        ? 'signed_out'
        : !online
          ? 'offline'
          : syncing
            ? 'syncing'
            : lastError
              ? 'error'
              : pendingCount > 0 || !lastSyncedAt
                ? 'pending'
                : 'synced';

  const value = useMemo<SyncContextValue>(
    () => ({
      config,
      status,
      user,
      lastSyncedAt,
      lastError,
      pendingCount,
      online,
      configure,
      removeConfig,
      signIn,
      signUp,
      signOut,
      syncNow,
    }),
    [config, status, user, lastSyncedAt, lastError, pendingCount, online, configure, removeConfig, signIn, signUp, signOut, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync deve ser usado dentro de SyncProvider');
  return ctx;
}
