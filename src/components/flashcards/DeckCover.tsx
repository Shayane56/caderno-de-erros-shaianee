import type { CSSProperties, ReactNode } from 'react';
import type { Deck } from '@/types';
import { getDeckColor } from '@/constants/cardStyles';
import { cn } from '@/utils/cn';

type CoverProps = Pick<Deck, 'name' | 'emoji' | 'color' | 'pattern' | 'coverImage' | 'elastic'> & {
  subtitle?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const RINGS = { sm: 6, md: 9, lg: 11 };

/** Capa do baralho desenhada como um caderno de espiral. */
export function DeckCover({ name, emoji, color, pattern, coverImage, elastic, subtitle, className, size = 'md' }: CoverProps) {
  const meta = getDeckColor(color);
  return (
    <div
      className={cn('deck-cover', !coverImage && `cover-${pattern}`, size === 'sm' ? 'aspect-[4/5]' : 'aspect-[4/5]', className)}
      style={{ '--cover': meta.color, '--cover-deep': meta.deep } as CSSProperties}
    >
      {coverImage && <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />}
      <div className="deck-spiral" aria-hidden>
        {Array.from({ length: RINGS[size] }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      {elastic && <div className="deck-elastic" aria-hidden />}
      <div className={cn('absolute inset-x-0 flex justify-center', size === 'sm' ? 'top-[22%] px-3 pl-5' : 'top-[24%] px-4 pl-6')}>
        <div className={cn('deck-label w-full max-w-[13rem] rotate-[-1.2deg] rounded-xl text-center', size === 'sm' ? 'px-2 py-2' : 'px-3 py-3')}>
          <div className={cn('leading-none', size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-3xl')} aria-hidden>
            {emoji}
          </div>
          <p
            className={cn(
              'mt-1.5 line-clamp-2 break-words font-display font-semibold leading-tight',
              size === 'sm' ? 'text-[13px]' : size === 'lg' ? 'text-xl' : 'text-[15px]',
            )}
          >
            {name || 'Novo baralho'}
          </p>
          <div className="mx-auto mt-1.5 h-px w-3/4" style={{ background: `repeating-linear-gradient(90deg, ${meta.deep}55 0 4px, transparent 4px 7px)` }} aria-hidden />
          {subtitle && <div className="mt-1.5 text-[11px] font-semibold text-[#7b6b74]">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
