import type { EntityName } from '@/types';

/** Linha armazenada no servidor (uma por entidade). */
export interface RemoteRow {
  entity: EntityName;
  id: string;
  data: unknown | null;
  /** Momento da última alteração feita pelo cliente (usado no "última escrita vence"). */
  updated_at: string;
  deleted: boolean;
  /** Momento em que o servidor gravou a linha (cursor de sincronização). */
  server_updated_at?: string;
}

export interface PullResult {
  rows: RemoteRow[];
  /** Maior `server_updated_at` recebido (ou o cursor anterior se nada novo). */
  cursor: string | null;
}

/** Contrato do serviço remoto. Implementado pelo Supabase e por um adaptador em memória nos testes. */
export interface RemoteAdapter {
  pull(since: string | null): Promise<PullResult>;
  push(rows: RemoteRow[]): Promise<void>;
}

export interface SyncState {
  userId: string;
  cursor: string | null;
  lastSyncedAt: string | null;
  /** Indica que a primeira sincronização completa desta conta já foi feita. */
  bootstrapped?: boolean;
}

export interface SyncResult {
  pulled: number;
  applied: number;
  pushed: number;
  merged: number;
  finishedAt: string;
}
