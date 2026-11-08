import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteAdapter, RemoteRow, PullResult } from './types';
import type { SyncConfig } from './config';

export const REMOTE_TABLE = 'caderno_records';
export const PUSH_FUNCTION = 'caderno_push';
const PAGE_SIZE = 1000;

function toIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

let cached: { key: string; client: SupabaseClient } | null = null;

/** Carrega o cliente Supabase sob demanda (não pesa no modo apenas local). */
export async function getSupabaseClient(config: SyncConfig): Promise<SupabaseClient> {
  const key = `${config.url}|${config.anonKey}`;
  if (cached?.key === key) return cached.client;
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'caderno-erros-auth' },
  });
  cached = { key, client };
  return client;
}

export function resetSupabaseClient(): void {
  cached = null;
}

/** Adaptador remoto usando a tabela `caderno_records` (ver docs/supabase.sql). */
export function createSupabaseAdapter(client: SupabaseClient): RemoteAdapter {
  return {
    async pull(since: string | null): Promise<PullResult> {
      const rows: RemoteRow[] = [];
      let cursor: string | null = null;
      for (let from = 0; ; from += PAGE_SIZE) {
        let query = client
          .from(REMOTE_TABLE)
          .select('entity,id,data,updated_at,deleted,server_updated_at')
          .order('server_updated_at', { ascending: true })
          .order('entity', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (since) query = query.gt('server_updated_at', since);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        // O Postgres devolve datas como "…+00:00" com microssegundos; normalizamos para ISO (Z)
        // para que as comparações com os registros locais sejam consistentes.
        const page = ((data ?? []) as RemoteRow[]).map((r) => ({
          ...r,
          updated_at: toIso(r.updated_at),
          server_updated_at: r.server_updated_at ? toIso(r.server_updated_at) : undefined,
        }));
        rows.push(...page);
        for (const r of page) if (r.server_updated_at && (!cursor || r.server_updated_at > cursor)) cursor = r.server_updated_at;
        if (page.length < PAGE_SIZE) break;
      }
      return { rows, cursor };
    },
    async push(rows: RemoteRow[]): Promise<void> {
      if (rows.length === 0) return;
      const payload = rows.map(({ entity, id, data, updated_at, deleted }) => ({ entity, id, data, updated_at, deleted }));
      const { error } = await client.rpc(PUSH_FUNCTION, { rows: payload });
      if (error) throw new Error(error.message);
    },
  };
}
