import { useState, type ReactNode } from 'react';
import { ChartColumn, Table2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionCard } from '@/components/common/Card';
import { cn } from '@/utils/cn';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  /** Dados da visualização em tabela (acessibilidade). */
  table?: { columns: TableColumn[]; rows: ReadonlyArray<object> };
  empty?: boolean;
  emptyText?: string;
  className?: string;
}

/** Cartão de gráfico com alternância "Gráfico / Tabela". */
export function ChartFrame({ title, subtitle, icon, children, table, empty, emptyText = 'Ainda não há dados suficientes.', className }: ChartFrameProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      className={className}
      action={
        table && !empty ? (
          <div className="flex shrink-0 rounded-xl bg-canvas p-0.5" role="group" aria-label={`Visualização de ${title}`}>
            {(
              [
                ['chart', ChartColumn, 'Ver gráfico'],
                ['table', Table2, 'Ver tabela'],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                aria-label={label}
                title={label}
                onClick={() => setView(id)}
                className={cn('flex h-8 w-8 items-center justify-center rounded-[10px] transition', view === id ? 'bg-surface text-rose-pink shadow-soft' : 'text-ink-soft hover:text-rose-ink')}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {empty ? (
        <div className="flex h-full min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/50 p-6 text-center text-sm text-ink-muted">
          {emptyText}
        </div>
      ) : view === 'table' && table ? (
        <div className="scrollbar-soft max-h-[320px] overflow-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-canvas text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                {table.columns.map((c) => (
                  <th key={c.key} scope="col" className={cn('px-3 py-2 font-semibold', c.align === 'right' && 'text-right')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-t border-line">
                  {table.columns.map((c) => (
                    <td key={c.key} className={cn('px-3 py-2 text-ink', c.align === 'right' && 'text-right tabular-nums')}>
                      {(row as Record<string, ReactNode>)[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </SectionCard>
  );
}

/** Legenda com marcador colorido e texto em cores de texto (nunca na cor da série). */
export function Legend({ items }: { items: Array<{ label: string; color: string; value?: ReactNode }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          <span>{item.label}</span>
          {item.value !== undefined && <span className="font-semibold text-ink">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
