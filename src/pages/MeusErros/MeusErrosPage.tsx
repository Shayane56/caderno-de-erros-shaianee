import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronsUpDown, FolderOpen, NotebookText, Plus, SearchX } from 'lucide-react';
import { useAppData } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { ErrorCard } from '@/components/cards/ErrorCard';
import { ErrorFiltersPanel } from '@/components/forms/ErrorFiltersPanel';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import type { ErrorFilters } from '@/types';
import {
  applyFilters,
  countActiveFilters,
  emptyFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  groupHierarchy,
} from '@/utils/filters';
import { pluralize } from '@/utils/text';
import { cn } from '@/utils/cn';

export default function MeusErrosPage() {
  const data = useAppData();
  const { openCreate } = useErrorForm();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(params), [params]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const setFilters = (next: ErrorFilters) => setParams(filtersToSearchParams(next), { replace: true });

  const filtered = useMemo(() => applyFilters(data.errors, filters, data.lookup), [data.errors, filters, data.lookup]);
  const groups = useMemo(() => groupHierarchy(filtered, data.lookup), [filtered, data.lookup]);
  const activeFilters = countActiveFilters(filters);

  if (data.loading) return <PageLoader />;

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.subject.id));
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.subject.id)));

  const prefill = {
    subjectId: filters.subjectId || data.topics.find((t) => t.id === filters.topicId)?.subjectId || '',
    topicId: filters.topicId,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meus Erros"
        eyebrow="Organização"
        icon={NotebookText}
        subtitle="Seus registros organizados por matéria e tópico. Altere a prioridade ou a origem diretamente na lista."
        actions={
          <Button icon={Plus} onClick={() => openCreate(prefill)}>
            Registrar novo erro
          </Button>
        }
      />

      {data.errors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderOpen}
            title="Nenhum erro registrado ainda"
            description="Quando você registrar erros, eles aparecerão aqui organizados por matéria → tópico → registros."
            action={
              <Button icon={Plus} onClick={() => openCreate()}>
                Registrar primeiro erro
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ErrorFiltersPanel filters={filters} onChange={setFilters} subjects={data.subjects} topics={data.topics} />

          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-ink-muted" aria-live="polite">
              <strong className="text-ink">{pluralize(filtered.length, 'registro', 'registros')}</strong>
              {activeFilters > 0 ? ` encontrado${filtered.length === 1 ? '' : 's'} de ${data.errors.length}` : ` em ${pluralize(groups.length, 'matéria', 'matérias')}`}
            </p>
            {groups.length > 1 && (
              <Button variant="ghost" size="sm" icon={ChevronsUpDown} onClick={toggleAll}>
                {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={SearchX}
                title="Nenhum registro encontrado"
                description="Tente outros termos de pesquisa ou remova alguns filtros."
                action={
                  <Button variant="secondary" onClick={() => setFilters(emptyFilters())}>
                    Limpar filtros
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const isCollapsed = collapsed.has(group.subject.id);
                const panelId = `subject-${group.subject.id}`;
                return (
                  <section key={group.subject.id} className="card overflow-hidden" aria-label={group.subject.name}>
                    <h2>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.subject.id)}
                        aria-expanded={!isCollapsed}
                        aria-controls={panelId}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-canvas/60 sm:px-6"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blush to-petal font-display text-lg font-semibold text-rose-pink">
                          {group.subject.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-lg font-semibold text-ink">{group.subject.name}</span>
                          <span className="block text-xs text-ink-muted">
                            {pluralize(group.total, 'registro', 'registros')} · {pluralize(group.topics.length, 'tópico', 'tópicos')} ·{' '}
                            {group.pending} pendente{group.pending === 1 ? '' : 's'}
                          </span>
                        </span>
                        <ChevronDown className={cn('h-5 w-5 shrink-0 text-rose-antique transition', isCollapsed && '-rotate-90')} aria-hidden />
                      </button>
                    </h2>
                    {!isCollapsed && (
                      <div id={panelId} className="space-y-5 border-t border-line px-3 pb-5 pt-4 sm:px-6">
                        {group.topics.map((tg) => (
                          <div key={tg.topic.id}>
                            <h3 className="mb-2.5 flex items-center gap-2 px-1 text-sm font-semibold text-ink">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-medium" aria-hidden />
                              {tg.topic.name}
                              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{tg.records.length}</span>
                            </h3>
                            <div className="grid gap-2.5 xl:grid-cols-2">
                              {tg.records.map((record) => (
                                <ErrorCard key={record.id} record={record} subjectName={group.subject.name} topicName={tg.topic.name} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
