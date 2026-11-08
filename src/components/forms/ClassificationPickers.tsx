import { CircleAlert } from 'lucide-react';
import { PRIORITIES, PRIORITY_ORDER } from '@/constants/priorities';
import { ORIGINS, ORIGIN_ORDER } from '@/constants/origins';
import type { OriginId, Priority } from '@/types';
import { cn } from '@/utils/cn';
import { OriginIcon } from '@/components/common/Badges';

const ring: Record<Priority, string> = {
  alta: 'peer-checked:border-red-300 peer-checked:bg-red-50/70 peer-checked:ring-red-200',
  media: 'peer-checked:border-amber-300 peer-checked:bg-amber-50/70 peer-checked:ring-amber-200',
  superado: 'peer-checked:border-emerald-300 peer-checked:bg-emerald-50/70 peer-checked:ring-emerald-200',
};

interface PriorityPickerProps {
  value: Priority | '';
  onChange: (value: Priority) => void;
  error?: string;
  name?: string;
}

export function PriorityPicker({ value, onChange, error, name = 'priority' }: PriorityPickerProps) {
  return (
    <fieldset id="field-priority" tabIndex={-1} className="outline-none">
      <legend className="field-label">
        Prioridade<span className="ml-0.5 text-rose-pink" aria-hidden>*</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRIORITY_ORDER.map((id) => {
          const meta = PRIORITIES[id];
          return (
            <label key={id} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={id}
                checked={value === id}
                onChange={() => onChange(id)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex h-full items-start gap-2.5 rounded-2xl border border-line bg-white p-3 ring-0 ring-inset transition',
                  'hover:border-rose-medium/60 peer-focus-visible:shadow-ring peer-checked:ring-2',
                  ring[id],
                )}
              >
                <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', meta.dotClass)} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-ink">{meta.label}</span>
                  <span className="block text-xs leading-snug text-ink-muted">{meta.description}</span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="field-error">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface OriginPickerProps {
  value: OriginId | '';
  onChange: (value: OriginId) => void;
  error?: string;
  name?: string;
}

export function OriginPicker({ value, onChange, error, name = 'origin' }: OriginPickerProps) {
  return (
    <fieldset id="field-origin" tabIndex={-1} className="outline-none">
      <legend className="field-label">
        Origem do erro<span className="ml-0.5 text-rose-pink" aria-hidden>*</span>
        <span className="ml-1.5 text-xs font-normal text-ink-muted">— por que você errou?</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ORIGIN_ORDER.map((id) => {
          const meta = ORIGINS[id];
          const checked = value === id;
          return (
            <label key={id} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={id}
                checked={checked}
                onChange={() => onChange(id)}
                className="peer sr-only"
              />
              <span
                className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-rose-medium/60 peer-focus-visible:shadow-ring peer-checked:ring-2 peer-checked:ring-inset"
                style={checked ? { borderColor: `${meta.color}66`, backgroundColor: `${meta.color}0D`, ['--tw-ring-color' as string]: `${meta.color}40` } : undefined}
              >
                <OriginIcon origin={id} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{meta.label}</span>
                  <span className="block text-xs leading-snug text-ink-muted">{meta.description}</span>
                  <span className="mt-1 block text-[11px] italic leading-snug text-ink-soft">Ex.: {meta.example}</span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="field-error">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      )}
    </fieldset>
  );
}
