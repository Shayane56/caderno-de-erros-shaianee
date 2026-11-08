import { useId, useState } from 'react';
import { Funnel, Search, X } from 'lucide-react';
import type { ErrorFilters, OriginFilterValue, Priority, Subject, Topic } from '@/types';
import { UNCLASSIFIED } from '@/types';
import { PRIORITIES, PRIORITY_ORDER } from '@/constants/priorities';
import { ORIGIN_ORDER, getOriginMeta } from '@/constants/origins';
import { countActiveFilters, emptyFilters } from '@/utils/filters';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { Select } from './Fields';

interface ErrorFiltersPanelProps {
  filters: ErrorFilters;
  onChange: (filters: ErrorFilters) => void;
  subjects: Subject[];
  topics: Topic[];
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active ? 'border-rose-pink bg-rose-pink text-white shadow-soft' : 'border-line bg-white text-ink-muted hover:border-rose-medium hover:text-rose-ink',
      )}
    >
      {color && <span className="h-2 w-2 rounded-full ring-1 ring-white/70" style={{ backgroundColor: color }} aria-hidden />}
      {children}
    </button>
  );
}

/** Barra de pesquisa + filtros combináveis (matéria, tópico, prioridade, origem e período). */
export function ErrorFiltersPanel({ filters, onChange, subjects, topics }: ErrorFiltersPanelProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const filterCount = active - (filters.search.trim() ? 1 : 0);
  const effectiveSubject = filters.subjectId || topics.find((t) => t.id === filters.topicId)?.subjectId || '';
  const subjectTopics = topics.filter((t) => t.subjectId === effectiveSubject);
  const set = (patch: Partial<ErrorFilters>) => onChange({ ...filters, ...patch });

  return (
    <section className="card p-4 sm:p-5" aria-label="Pesquisa e filtros">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-rose-antique" aria-hidden />
          <input
            type="search"
            className="input pl-11 pr-10"
            placeholder="Pesquisar nos seus erros…"
            title='Busca em descrição, correção, tópico, matéria e observações. Use "aspas" para expressões exatas.'
            aria-label="Pesquisar registros"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft hover:bg-blush hover:text-rose-ink"
              aria-label="Limpar pesquisa"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className={cn(
            'relative inline-flex h-[46px] shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition lg:hidden',
            open || filterCount ? 'border-rose-medium bg-blush text-rose-ink' : 'border-line bg-white text-ink-muted',
          )}
        >
          <Funnel className="h-4 w-4" aria-hidden />
          <span className="hidden min-[400px]:inline">Filtros</span>
          {filterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-pink px-1 text-[11px] text-white">{filterCount}</span>
          )}
        </button>
      </div>

      <p className="mt-2 px-1 text-[11px] text-ink-muted">
        Busca em descrição, correção, tópico, matéria e observações. Use “aspas” para expressões exatas.
      </p>

      <div id={`${id}-panel`} className={cn('mt-4 space-y-4', !open && 'hidden lg:block')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`${id}-subject`} className="mb-1 block text-xs font-semibold text-ink-muted">
              Matéria
            </label>
            <Select
              id={`${id}-subject`}
              value={effectiveSubject}
              onChange={(e) => set({ subjectId: e.target.value, topicId: '' })}
              className="h-10 py-2 text-sm"
            >
              <option value="">Todas as matérias</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor={`${id}-topic`} className="mb-1 block text-xs font-semibold text-ink-muted">
              Tópico
            </label>
            <Select
              id={`${id}-topic`}
              value={filters.topicId}
              disabled={!effectiveSubject}
              onChange={(e) => set({ subjectId: effectiveSubject, topicId: e.target.value })}
              className="h-10 py-2 text-sm"
            >
              <option value="">{effectiveSubject ? 'Todos os tópicos' : 'Escolha a matéria'}</option>
              {subjectTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor={`${id}-from`} className="mb-1 block text-xs font-semibold text-ink-muted">
              Cadastrado de
            </label>
            <input
              id={`${id}-from`}
              type="date"
              className="input h-10 py-2 text-sm"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => set({ dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`${id}-to`} className="mb-1 block text-xs font-semibold text-ink-muted">
              até
            </label>
            <input
              id={`${id}-to`}
              type="date"
              className="input h-10 py-2 text-sm"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => set({ dateTo: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por prioridade">
            <span className="mr-1 text-xs font-semibold text-ink-muted">Prioridade:</span>
            {PRIORITY_ORDER.map((p: Priority) => (
              <Chip key={p} active={filters.priorities.includes(p)} color={PRIORITIES[p].color} onClick={() => set({ priorities: toggle(filters.priorities, p) })}>
                {p === 'superado' ? 'Superados' : PRIORITIES[p].label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por origem do erro">
            <span className="mr-1 text-xs font-semibold text-ink-muted">Origem:</span>
            {[...ORIGIN_ORDER, UNCLASSIFIED].map((o: OriginFilterValue) => {
              const meta = getOriginMeta(o);
              return (
                <Chip key={o} active={filters.origins.includes(o)} color={meta.color} onClick={() => set({ origins: toggle(filters.origins, o) })}>
                  {meta.label}
                </Chip>
              );
            })}
          </div>
        </div>

        {active > 0 && (
          <div className="flex justify-end border-t border-line pt-3">
            <Button variant="ghost" size="sm" icon={X} onClick={() => onChange(emptyFilters())}>
              Limpar todos os filtros ({active})
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
