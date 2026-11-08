import { Plus, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { useAvatarPhoto } from '@/hooks/useData';
import { MAIN_PHRASE, SECONDARY_PHRASE } from '@/constants/app';
import { formatLongToday } from '@/utils/dates';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function HeroCard({ pending }: { pending: number }) {
  const photo = useAvatarPhoto();
  const { openCreate } = useErrorForm();
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-line bg-gradient-to-br from-surface via-blush/70 to-petal/80 p-6 shadow-soft sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-surface/50 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-rose-medium/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar photo={photo} size={104} className="shadow-lift" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-antique">{formatLongToday()}</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
            {greeting()}, Shaiane <span aria-hidden>💗</span>
          </h1>
          <p className="mt-2 text-[15px] font-semibold text-rose-ink sm:text-base">{MAIN_PHRASE}</p>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{SECONDARY_PHRASE}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button icon={Plus} onClick={() => openCreate()}>
              Registrar novo erro
            </Button>
            <Button variant="outline" icon={Repeat} onClick={() => navigate('/segundo-ciclo')}>
              {pending > 0 ? `Revisar ${pending} pendente${pending === 1 ? '' : 's'}` : 'Meu Segundo Ciclo'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
