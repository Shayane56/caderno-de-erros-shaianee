import { Link } from 'react-router-dom';
import { Moon, Search, Sun } from 'lucide-react';
import { firstName, useProfile } from '@/services/profile';
import { isDarkMode, updateAppearance, useAppearance } from '@/services/appearance';
import { formatLongToday } from '@/utils/dates';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Saudação do Início, com atalhos de busca e modo escuro. */
export function HomeHeader() {
  const { name } = useProfile();
  const appearance = useAppearance();
  const dark = isDarkMode(appearance);
  const first = firstName(name);
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-antique">{formatLongToday()}</p>
        <h1 className="mt-1 font-display text-[28px] font-extrabold leading-tight text-ink sm:text-[34px]">
          {first ? `Olá, ${first}!` : `${greeting()}!`} <span aria-hidden>💜</span>
        </h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          {greeting()}! Que tal dar mais um passo rumo aos seus objetivos hoje? <span aria-hidden>✨</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link to="/questoes" className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-soft ring-1 ring-line transition hover:text-rose-pink" aria-label="Buscar questões">
          <Search className="h-5 w-5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => updateAppearance({ mode: dark ? 'claro' : 'escuro' })}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-soft ring-1 ring-line transition hover:text-rose-pink"
          aria-label={dark ? 'Usar modo claro' : 'Usar modo escuro'}
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </header>
  );
}
