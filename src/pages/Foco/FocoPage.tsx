import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpenCheck, Layers, ListChecks, Pause, Play, Plus, Repeat, Square, X } from 'lucide-react';
import { db } from '@/database/db';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { Mascot } from '@/components/mimo/Mascot';
import { ProgressRing } from '@/components/mimo/ProgressRing';
import { formatClock, useFocus } from '@/services/study/focusTimer';
import { readPreference, writePreference } from '@/services/preferences';
import { formatDateTime } from '@/utils/dates';
import { cn } from '@/utils/cn';

const DURATIONS = [
  { min: 25, label: '25 min' },
  { min: 50, label: '50 min' },
  { min: 60, label: '1 hora' },
  { min: 90, label: '1h30' },
  { min: 120, label: '2 horas' },
];
const DEFAULT_APPS = ['Instagram', 'TikTok', 'YouTube', 'WhatsApp'];
const SUGGESTIONS = ['Questões', 'Flashcards', 'Caderno de erros', 'Leitura de lei seca', 'Videoaula'];

interface FocusPrefs {
  apps: string[];
  checked: string[];
  minutes: number;
}

function minutesLabel(ms: number): string {
  const min = Math.round(ms / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

export default function FocoPage() {
  const toast = useToast();
  const focus = useFocus();
  const [prefs, setPrefsState] = useState<FocusPrefs>(() => readPreference<FocusPrefs>('focus-prefs', { apps: DEFAULT_APPS, checked: DEFAULT_APPS, minutes: 50 }));
  const [label, setLabel] = useState('');
  const [custom, setCustom] = useState('');
  const [newApp, setNewApp] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);
  const setPrefs = (next: FocusPrefs) => {
    setPrefsState(next);
    writePreference('focus-prefs', next);
  };

  const weekAgo = useMemo(() => new Date(Date.now() - 7 * 86_400_000).toISOString(), []);
  const sessions = useLiveQuery(() => db.focusSessions.where('startedAt').aboveOrEqual(weekAgo).reverse().sortBy('startedAt'), [weekAgo]) ?? [];
  const todayKey = new Date().toDateString();
  const todayMs = sessions.filter((s) => new Date(s.startedAt).toDateString() === todayKey).reduce((sum, s) => sum + s.focusedMs, 0);
  const weekMs = sessions.reduce((sum, s) => sum + s.focusedMs, 0);

  const minutes = custom ? Number(custom) : prefs.minutes;
  const validMinutes = Number.isFinite(minutes) && minutes >= 1 && minutes <= 600;

  const toggleApp = (app: string) => setPrefs({ ...prefs, checked: prefs.checked.includes(app) ? prefs.checked.filter((a) => a !== app) : [...prefs.checked, app] });
  const addApp = () => {
    const name = newApp.trim().slice(0, 30);
    if (!name || prefs.apps.includes(name)) return;
    setPrefs({ ...prefs, apps: [...prefs.apps, name], checked: [...prefs.checked, name] });
    setNewApp('');
  };

  const t = focus.timer;
  const pct = t ? (focus.focused / t.plannedMs) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-lilac via-surface to-blush p-6 shadow-soft ring-1 ring-line/80 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-antique">Modo Foco</p>
            <h1 className="mt-1 font-display text-[30px] font-extrabold leading-tight text-ink sm:text-[36px]">Concentre-se no que realmente importa.</h1>
            <p className="mt-2 text-[15px] text-ink-muted">
              Hoje: <strong className="text-ink">{minutesLabel(todayMs)}</strong> de foco · últimos 7 dias: <strong className="text-ink">{minutesLabel(weekMs)}</strong>
            </p>
          </div>
          <Mascot pose="headphones" className="h-40 w-44 shrink-0" />
        </div>
      </section>

      {focus.justFinished && (
        <div className="flex items-center gap-3 rounded-3xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-100" role="status">
          <Mascot pose="cheer" className="h-14 w-14 shrink-0" />
          <p className="flex-1 text-sm font-semibold">Sessão concluída! Você focou {minutesLabel(focus.justFinished.focusedMs)}. Que tal uma pausa de 5 a 10 minutos? 💗</p>
          <button type="button" onClick={focus.dismissFinished} className="rounded-xl p-2 hover:bg-emerald-100" aria-label="Fechar aviso">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {t ? (
        <section className="card flex flex-col items-center gap-5 p-6 text-center sm:p-8" aria-label="Sessão em andamento">
          <p className="text-sm font-semibold text-ink-muted">{t.label ? `Focando em: ${t.label}` : 'Sessão de foco em andamento'}</p>
          <div className="relative">
            <ProgressRing value={pct} size={220} stroke={16} label={`${Math.round(pct)}% da sessão`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-surface/0">
              <span className="font-display text-[44px] font-extrabold tabular-nums text-ink" aria-live="off">
                {formatClock(focus.remaining)}
              </span>
              <span className="text-xs font-semibold text-ink-muted">{focus.running ? 'restantes' : 'pausado'}</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {focus.running ? (
              <Button variant="secondary" icon={Pause} onClick={focus.pause}>
                Pausar
              </Button>
            ) : (
              <Button icon={Play} onClick={focus.resume}>
                Retomar
              </Button>
            )}
            <Button variant="outline" icon={Square} onClick={() => setConfirmStop(true)}>
              Encerrar
            </Button>
          </div>
          <div className="w-full border-t border-line pt-5">
            <p className="mb-3 text-sm font-semibold text-ink">Estudar agora, sem sair do foco:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['/questoes/resolver?situacao=nunca', 'Resolver questões', ListChecks],
                  ['/flashcards', 'Revisar flashcards', Layers],
                  ['/segundo-ciclo', 'Revisar meus erros', Repeat],
                ] as const
              ).map(([to, text, Icon]) => (
                <Link key={to} to={to} className="flex items-center justify-center gap-2 rounded-2xl bg-canvas p-3 text-sm font-semibold text-ink transition hover:bg-blush hover:text-rose-ink">
                  <Icon className="h-4 w-4 text-rose-pink" aria-hidden /> {text}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">O cronômetro continua no canto da tela enquanto você estuda.</p>
          </div>
        </section>
      ) : (
        <section className="card space-y-6 p-5 sm:p-7" aria-label="Nova sessão de foco">
          <div>
            <label htmlFor="focus-label" className="field-label">
              O que você vai estudar? <span className="text-xs font-normal text-ink-soft">(opcional)</span>
            </label>
            <input id="focus-label" className="input" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Lei 8.080 + questões" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setLabel(s)} className="chip bg-canvas px-3 py-1 text-ink-muted ring-line hover:text-rose-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="field-label">Duração da sessão</legend>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.min}
                  type="button"
                  aria-pressed={!custom && prefs.minutes === d.min}
                  onClick={() => {
                    setCustom('');
                    setPrefs({ ...prefs, minutes: d.min });
                  }}
                  className={cn('rounded-2xl border px-4 py-2 text-sm font-bold transition', !custom && prefs.minutes === d.min ? 'border-rose-medium bg-blush/60 text-rose-ink' : 'border-line text-ink hover:border-rose-medium/60')}
                >
                  {d.label}
                </button>
              ))}
              <label className="flex items-center gap-2 rounded-2xl border border-line px-3 text-sm text-ink-muted">
                Outro:
                <input type="number" min={1} max={600} inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-16 bg-transparent py-2 font-bold text-ink outline-none" aria-label="Duração personalizada em minutos" placeholder="min" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Apps que vou deixar de lado</legend>
            <ul className="grid gap-2 sm:grid-cols-2">
              {prefs.apps.map((app) => (
                <li key={app}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5 text-sm font-semibold text-ink">
                    <input type="checkbox" className="h-4 w-4 accent-rose-pink" checked={prefs.checked.includes(app)} onChange={() => toggleApp(app)} />
                    {app}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input className="input h-10 py-2 text-sm" value={newApp} onChange={(e) => setNewApp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addApp())} placeholder="Outro app…" aria-label="Nome do app" />
              <Button size="sm" variant="ghost" icon={Plus} onClick={addApp} className="h-10">
                Adicionar app
              </Button>
            </div>
            <p className="mt-2 rounded-2xl bg-lilac/60 p-3 text-xs leading-relaxed text-ink-muted">
              💡 Um site não consegue bloquear outros aplicativos do celular. Para silenciá-los de verdade, ative o modo de foco do aparelho com os apps
              marcados acima: no <strong className="text-ink">iPhone</strong>, Ajustes › Foco; no <strong className="text-ink">Android</strong>, Configurações › Bem-estar digital › Modo foco.
            </p>
          </fieldset>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              size="lg"
              icon={Play}
              className="w-full max-w-sm"
              disabled={!validMinutes}
              onClick={() => {
                focus.start(minutes, label);
                toast.success('Modo Foco iniciado', prefs.checked.length ? `Combinado: nada de ${prefs.checked.join(', ')} por agora 💗` : 'Bons estudos! 💗');
              }}
            >
              Iniciar Modo Foco
            </Button>
            <p className="text-xs text-ink-muted">Você pode pausar ou encerrar a qualquer momento. 💗</p>
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="card p-5 sm:p-6" aria-label="Sessões recentes">
          <h2 className="section-title mb-3 flex items-center gap-2 text-base">
            <BookOpenCheck className="h-[18px] w-[18px] text-rose-pink" aria-hidden /> Últimas sessões
          </h2>
          <ul className="divide-y divide-line">
            {sessions.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{s.label || 'Sessão de foco'}</span>
                  <span className="text-xs text-ink-muted">{formatDateTime(s.startedAt)}</span>
                </span>
                <span className={cn('chip shrink-0', s.completed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-canvas text-ink-muted ring-line')}>
                  {minutesLabel(s.focusedMs)}
                  {s.completed ? ' ✓' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmStop}
        title="Encerrar a sessão de foco?"
        description="O tempo já focado fica registrado nas suas estatísticas (a partir de 1 minuto)."
        confirmLabel="Encerrar"
        tone="primary"
        onConfirm={async () => {
          const session = await focus.stop();
          setConfirmStop(false);
          toast.info(session ? `Sessão registrada: ${minutesLabel(session.focusedMs)} de foco` : 'Sessão encerrada');
        }}
        onCancel={() => setConfirmStop(false)}
      />
    </div>
  );
}
