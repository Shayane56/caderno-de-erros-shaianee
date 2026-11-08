-- =============================================================================
-- Caderno de Erros — Shaiane Carvalho
-- Estrutura de sincronização em nuvem (Supabase / PostgreSQL)
--
-- Como usar: Supabase → SQL Editor → New query → cole TODO este arquivo → Run.
-- O script é idempotente (pode ser executado mais de uma vez).
-- =============================================================================

-- Uma linha por entidade (matéria, tópico, erro, histórico, revisão, baralho, flashcard
-- e resposta de estudo) de cada usuária.
create table if not exists public.caderno_records (
  user_id           uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  entity            text        not null,
  id                text        not null,
  data              jsonb,                                   -- registro completo (null quando excluído)
  updated_at        timestamptz not null,                    -- última alteração feita no aparelho
  deleted           boolean     not null default false,      -- exclusões também são sincronizadas
  server_updated_at timestamptz not null default now(),      -- cursor de sincronização
  primary key (user_id, entity, id)
);

-- Entidades aceitas. Recriada a cada execução para incluir os Flashcards em projetos
-- configurados antes da versão 3 (basta executar este arquivo novamente).
alter table public.caderno_records drop constraint if exists caderno_records_entity_check;
alter table public.caderno_records add constraint caderno_records_entity_check
  check (entity in ('subjects', 'topics', 'errors', 'history', 'reviews', 'decks', 'cards', 'cardReviews'));

create index if not exists caderno_records_user_cursor_idx
  on public.caderno_records (user_id, server_updated_at);

-- Proteção dos dados: cada usuária só enxerga e altera os próprios registros.
alter table public.caderno_records enable row level security;

drop policy if exists "caderno_select_own" on public.caderno_records;
create policy "caderno_select_own" on public.caderno_records
  for select using (auth.uid() = user_id);

drop policy if exists "caderno_insert_own" on public.caderno_records;
create policy "caderno_insert_own" on public.caderno_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "caderno_update_own" on public.caderno_records;
create policy "caderno_update_own" on public.caderno_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Envio em lote com resolução de conflitos "a alteração mais recente vence":
-- uma linha só é sobrescrita se a versão recebida for mais nova que a armazenada.
create or replace function public.caderno_push(rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.caderno_records as r (user_id, entity, id, data, updated_at, deleted, server_updated_at)
  select auth.uid(), x.entity, x.id, x.data, x.updated_at, coalesce(x.deleted, false), clock_timestamp()
  from jsonb_to_recordset(rows) as x (entity text, id text, data jsonb, updated_at timestamptz, deleted boolean)
  on conflict (user_id, entity, id) do update
    set data              = excluded.data,
        updated_at        = excluded.updated_at,
        deleted           = excluded.deleted,
        server_updated_at = clock_timestamp()
    where excluded.updated_at > r.updated_at;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.caderno_push(jsonb) from public, anon;
grant execute on function public.caderno_push(jsonb) to authenticated;
grant select, insert, update on public.caderno_records to authenticated;
