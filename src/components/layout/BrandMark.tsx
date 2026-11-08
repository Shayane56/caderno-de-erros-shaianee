import { useId } from 'react';
import { cn } from '@/utils/cn';

export function BrandMark({ className }: { className?: string }) {
  // ID único: o mesmo SVG aparece no menu lateral (oculto no celular) e no cabeçalho.
  const gradientId = `brand-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E879A9" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <rect x="17" y="13" width="30" height="38" rx="5" fill="#FFFFFF" />
      <rect x="17" y="13" width="6" height="38" rx="3" fill="#F9D5E5" />
      <path d="M28 25h13M28 31h13M28 37h8" stroke="#D98BAE" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M38.5 41.5l3 3 6-7" stroke="#DB2777" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function BrandTitle({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark className={compact ? 'h-9 w-9' : undefined} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-[17px] font-semibold text-ink">Caderno de Erros</p>
        <p className="truncate text-xs font-medium tracking-wide text-rose-antique">Shaiane Carvalho</p>
      </div>
    </div>
  );
}
