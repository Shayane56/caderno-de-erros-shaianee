import { useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';
import { getSessionMessage, nextSessionMessage } from '@/services/motivationService';
import { cn } from '@/utils/cn';
import { Mascot } from '@/components/mimo/Mascot';

export function MotivationCard({ className }: { className?: string }) {
  const [message, setMessage] = useState(getSessionMessage);
  return (
    <section
      aria-label="Mensagem motivacional"
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-blush to-lilac p-6 text-rose-ink ring-1 ring-petal',
        className,
      )}
    >
      <Quote className="absolute -bottom-3 right-3 h-20 w-20 text-surface/60" aria-hidden />
      <Mascot pose="heart" className="absolute -right-2 -top-1 h-20 w-20 opacity-95" />
      <div className="relative">
        <p className="pr-16 text-xs font-bold uppercase tracking-[0.16em] text-rose-antique">Mensagem do Mimo</p>
        <blockquote className="mt-3 pr-10 font-display text-xl font-bold leading-snug text-rose-ink sm:text-[21px]">“{message.text}”</blockquote>
      </div>
      <button
        type="button"
        onClick={() => setMessage(nextSessionMessage())}
        className="relative mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1.5 text-xs font-semibold text-rose-ink transition hover:bg-surface"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Outra mensagem
      </button>
    </section>
  );
}
