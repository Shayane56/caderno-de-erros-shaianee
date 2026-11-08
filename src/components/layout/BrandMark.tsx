import { useId } from 'react';
import { cn } from '@/utils/cn';
import { APP_NAME, TAGLINE } from '@/constants/app';
import { useProfile } from '@/services/profile';

/** Logo do Mimo: livro aberto com um coraçãozinho. Cores fixas (é a marca). */
export function BrandMark({ className }: { className?: string }) {
  const id = `mimo-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-h`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F49BC0" />
          <stop offset="1" stopColor="#D84A89" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7B4CE" />
          <stop offset="1" stopColor="#E9789F" />
        </linearGradient>
      </defs>
      <path d="M32 21 C27 13 17 15 18 23 C19 28 26 31 32 36 C38 31 45 28 46 23 C47 15 37 13 32 21Z" fill={`url(#${id}-h)`} />
      <path d="M9 41 C17 37 26 38 32 43 C38 38 47 37 55 41 L55 52 C47 48 38 49 32 54 C26 49 17 48 9 52Z" fill={`url(#${id}-b)`} />
      <path d="M12 38 C19 35 27 36 32 40 L32 50 C27 46 19 45 12 48Z" fill="#FFF4F8" />
      <path d="M52 38 C45 35 37 36 32 40 L32 50 C37 46 45 45 52 48Z" fill="#FFF4F8" />
      <path d="M32 40 V50" stroke="#E9789F" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 12 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2z" fill="#B9A3F0" />
      <circle cx="14" cy="16" r="1.8" fill="#F49BC0" />
    </svg>
  );
}

/** Marca com nome e slogan (menu lateral) ou compacta com o nome de quem usa (cabeçalho do celular). */
export function BrandTitle({ compact }: { compact?: boolean }) {
  const { name } = useProfile();
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark className="h-9 w-9" />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[20px] font-extrabold tracking-tight text-ink">{APP_NAME}</p>
          <p className="truncate text-[11px] font-semibold text-rose-antique">{name || TAGLINE}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-center">
      <BrandMark className="h-14 w-14" />
      <p className="mt-0.5 font-display text-[30px] font-extrabold leading-none tracking-tight text-ink">{APP_NAME}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-ink-muted">
        {TAGLINE} <span className="text-rose-pink">♡</span>
      </p>
    </div>
  );
}
