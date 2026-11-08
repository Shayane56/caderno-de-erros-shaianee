import { Link } from 'react-router-dom';
import { ChartColumnIncreasing, Play, Repeat, Target, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Tile {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Cores fixas (pastel), legíveis no claro e no escuro. */
  bg: string;
  iconColor: string;
}

const TILES: Tile[] = [
  { to: '/flashcards', label: 'Continuar estudando', icon: Play, bg: 'bg-[#FDE0EC]', iconColor: 'text-[#E0558F]' },
  { to: '/estatisticas', label: 'Ver estatísticas', icon: ChartColumnIncreasing, bg: 'bg-[#E9E1FD]', iconColor: 'text-[#7E5ED8]' },
  { to: '/segundo-ciclo', label: 'Revisar erros', icon: Repeat, bg: 'bg-[#FFE6D2]', iconColor: 'text-[#E07A2E]' },
  { to: '/questoes/simulado', label: 'Criar simulado', icon: Target, bg: 'bg-[#D9F3EA]', iconColor: 'text-[#1F9E78]' },
];

export function QuickAccess({ continueTo }: { continueTo?: string }) {
  return (
    <section aria-label="Acesso rápido">
      <h2 className="section-title mb-3">Acesso rápido</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((tile, i) => (
          <li key={tile.label}>
            <Link
              to={i === 0 && continueTo ? continueTo : tile.to}
              className={cn('flex h-full flex-col items-center justify-center gap-2.5 rounded-[26px] px-3 py-5 text-center shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift', tile.bg)}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70">
                <tile.icon className={cn('h-6 w-6', tile.iconColor)} strokeWidth={2.4} aria-hidden />
              </span>
              <span className="text-[15px] font-bold leading-tight text-[#3D2E4A]">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
