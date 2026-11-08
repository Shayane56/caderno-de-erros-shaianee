import type { RemoteAdapter, RemoteRow } from '../types';

/** Servidor em memória com a mesma regra do SQL: grava apenas se `updated_at` for mais novo. */
export class MemoryRemote {
  rows = new Map<string, RemoteRow>();
  clock = Date.parse('2030-01-01T00:00:00.000Z');
  failNextPush = false;

  private tick(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  write(row: RemoteRow) {
    const key = `${row.entity}:${row.id}`;
    const current = this.rows.get(key);
    if (current && current.updated_at >= row.updated_at) return;
    this.rows.set(key, { ...row, server_updated_at: this.tick() });
  }

  adapter(): RemoteAdapter {
    return {
      pull: async (since) => {
        const rows = [...this.rows.values()]
          .filter((r) => !since || r.server_updated_at! > since)
          .sort((a, b) => a.server_updated_at!.localeCompare(b.server_updated_at!));
        return { rows: structuredClone(rows), cursor: rows.length ? rows[rows.length - 1].server_updated_at! : null };
      },
      push: async (rows) => {
        if (this.failNextPush) {
          this.failNextPush = false;
          throw new Error('Falha de conexão simulada');
        }
        for (const r of rows) this.write(structuredClone(r));
      },
    };
  }
}
