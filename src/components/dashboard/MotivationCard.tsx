import { useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';
import { getSessionMessage, nextSessionMessage } from '@/services/motivationService';
import { cn } from '@/utils/cn';

export function MotivationCard({ className }: { className?: string }) {
  const [message, setMessage] = useState(getSessionMessage);
  return (
    <section
      aria-label="Mensagem motivacional"
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-blush to-petal p-6 text-rose-ink ring-1 ring-petal',
        className,
      )}
    >
      <Quote className="absolute -bottom-3 right-3 h-20 w-20 text-white/70" aria-hidden />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-antique">Mensagem do dia</p>
        <blockquote className="mt-3 font-display text-xl font-medium leading-snug text-[#7A2E52] sm:text-[22px]">“{message.text}”</blockquote>
      </div>
      <button
        type="button"
        onClick={() => setMessage(nextSessionMessage())}
        className="relative mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-ink transition hover:bg-white"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Outra mensagem
      </button>
    </section>
  );
}
