import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Question } from '@/types';
import { Select } from '@/components/forms/Fields';
import { Button } from '@/components/common/Button';
import { countQuestionFilters, emptyQuestionFilters, sortByName, type QuestionFilters } from '@/services/questions/filters';
import { DIFFICULTY_LABELS, FORMAT_LABELS } from '@/services/questions/questionModel';
import { cn } from '@/utils/cn';

interface Props {
  filters: QuestionFilters;
  onChange: (filters: QuestionFilters) => void;
  questions: Question[];
}

export function QuestionFiltersPanel({ filters, onChange, questions }: Props) {
  const subjects = useMemo(() => sortByName(questions.map((q) => q.subject)), [questions]);
  const topics = useMemo(() => sortByName(questions.filter((q) => !filters.subject || q.subject === filters.subject).map((q) => q.topic)), [questions, filters.subject]);
  const bancas = useMemo(() => sortByName(questions.map((q) => q.banca)), [questions]);
  const set = (patch: Partial<QuestionFilters>) => onChange({ ...filters, ...patch });
  const active = countQuestionFilters(filters);

  return (
    <section className="card space-y-3 p-4 sm:p-5" aria-label="Filtros de questões">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-antique" aria-hidden />
        <input
          className="input h-11 pl-10"
          placeholder="Pesquisar no enunciado, alternativas, assunto…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-label="Pesquisar questões"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
        <Select aria-label="Matéria" className="h-10 py-2 text-sm" value={filters.subject} onChange={(e) => set({ subject: e.target.value, topic: '' })}>
          <option value="">Todas as matérias</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select aria-label="Assunto" className="h-10 py-2 text-sm" value={filters.topic} onChange={(e) => set({ topic: e.target.value })}>
          <option value="">Todos os assuntos</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select aria-label="Formato" className="h-10 py-2 text-sm" value={filters.format} onChange={(e) => set({ format: e.target.value as QuestionFilters['format'] })}>
          <option value="">Todos os formatos</option>
          {(Object.keys(FORMAT_LABELS) as Array<keyof typeof FORMAT_LABELS>).map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </Select>
        <Select aria-label="Dificuldade" className="h-10 py-2 text-sm" value={filters.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) as QuestionFilters['difficulty'] })}>
          <option value={0}>Qualquer dificuldade</option>
          {([1, 2, 3] as const).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </Select>
        <Select aria-label="Situação" className="h-10 py-2 text-sm" value={filters.status} onChange={(e) => set({ status: e.target.value as QuestionFilters['status'] })}>
          <option value="">Todas as situações</option>
          <option value="nunca">Nunca resolvidas</option>
          <option value="errei">Que errei</option>
          <option value="acertei">Que acertei</option>
        </Select>
        <Select aria-label="Origem" className="h-10 py-2 text-sm" value={filters.origin} onChange={(e) => set({ origin: e.target.value as QuestionFilters['origin'] })}>
          <option value="">Banco + minhas</option>
          <option value="banco">Só do banco do app</option>
          <option value="minha">Só as minhas</option>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Bancas">
        <span className="mr-1 text-xs font-semibold text-ink-muted">Bancas:</span>
        {bancas.map((b) => {
          const on = filters.bancas.includes(b);
          return (
            <button
              key={b}
              type="button"
              aria-pressed={on}
              onClick={() => set({ bancas: on ? filters.bancas.filter((x) => x !== b) : [...filters.bancas, b] })}
              className={cn('chip px-3 py-1 transition', on ? 'bg-rose-pink text-white ring-rose-pink' : 'bg-surface text-ink-muted ring-line hover:text-rose-ink')}
            >
              {b}
            </button>
          );
        })}
        {active > 0 && (
          <Button size="sm" variant="ghost" icon={X} className="ml-auto" onClick={() => onChange(emptyQuestionFilters())}>
            Limpar filtros ({active})
          </Button>
        )}
      </div>
    </section>
  );
}
