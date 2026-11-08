import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db } from '@/database/db';
import { trackChange } from '@/database/changeTracker';
import type { FocusSession } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { readPreference, removePreference, writePreference } from '../preferences';

/** Estado do cronômetro do Modo Foco (guardado no aparelho: sobrevive a recarregar a página). */
export interface FocusTimerState {
  id: string;
  label: string;
  plannedMs: number;
  startedAt: string;
  /** Momento (epoch ms) em que voltou a correr; null = pausado. */
  runningSince: number | null;
  /** Tempo focado antes da última retomada. */
  accumulatedMs: number;
}

const KEY = 'focus-timer';
const MIN_SAVED_MS = 60_000;

export function focusedMs(state: FocusTimerState, now = Date.now()): number {
  return state.accumulatedMs + (state.runningSince ? Math.max(0, now - state.runningSince) : 0);
}

export async function saveFocusSession(state: FocusTimerState, completed: boolean, now = Date.now()): Promise<FocusSession | null> {
  const focused = Math.min(state.plannedMs, focusedMs(state, now));
  if (!completed && focused < MIN_SAVED_MS) return null;
  const session: FocusSession = {
    id: state.id,
    startedAt: state.startedAt,
    endedAt: new Date(now).toISOString(),
    plannedMs: state.plannedMs,
    focusedMs: focused,
    completed,
    label: state.label,
  };
  await db.transaction('rw', [db.focusSessions, db.pendingChanges], async () => {
    await db.focusSessions.put(session);
    await trackChange('focusSessions', session.id, session.endedAt);
  });
  return session;
}

function chime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [660, 880, 1046].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {
    /* som indisponível */
  }
}

function notifyDone(label: string) {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignorado */
  }
  chime();
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sessão de foco concluída 💗', { body: label ? `Você focou em: ${label}` : 'Hora de uma pausa merecida!', icon: './pwa-192x192.png' });
    }
  } catch {
    /* notificações indisponíveis */
  }
}

interface FocusApi {
  timer: FocusTimerState | null;
  /** Tempo focado e restante (atualizados a cada segundo). */
  focused: number;
  remaining: number;
  running: boolean;
  /** Última sessão concluída (para comemorar). */
  justFinished: FocusSession | null;
  start: (minutes: number, label: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<FocusSession | null>;
  dismissFinished: () => void;
}

const FocusContext = createContext<FocusApi | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<FocusTimerState | null>(() => readPreference<FocusTimerState | null>(KEY, null));
  const [now, setNow] = useState(() => Date.now());
  const [justFinished, setJustFinished] = useState<FocusSession | null>(null);
  const finishing = useRef(false);

  const persist = useCallback((next: FocusTimerState | null) => {
    setTimer(next);
    if (next) writePreference(KEY, next);
    else removePreference(KEY);
  }, []);

  useEffect(() => {
    if (!timer?.runningSince) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer?.runningSince]);

  const focused = timer ? focusedMs(timer, now) : 0;
  const remaining = timer ? Math.max(0, timer.plannedMs - focused) : 0;

  // Tempo esgotado: salva a sessão como concluída e avisa.
  useEffect(() => {
    if (!timer || remaining > 0 || finishing.current) return;
    finishing.current = true;
    void saveFocusSession(timer, true).then((session) => {
      persist(null);
      setJustFinished(session);
      notifyDone(timer.label);
      finishing.current = false;
    });
  }, [timer, remaining, persist]);

  const start = useCallback(
    (minutes: number, label: string) => {
      const t = Date.now();
      persist({ id: createId(), label: label.trim().slice(0, 120), plannedMs: Math.round(minutes * 60_000), startedAt: nowIso(), runningSince: t, accumulatedMs: 0 });
      setNow(t);
      setJustFinished(null);
      try {
        if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
      } catch {
        /* ignorado */
      }
    },
    [persist],
  );

  const pause = useCallback(() => {
    if (!timer?.runningSince) return;
    persist({ ...timer, accumulatedMs: focusedMs(timer), runningSince: null });
  }, [timer, persist]);

  const resume = useCallback(() => {
    if (!timer || timer.runningSince) return;
    const t = Date.now();
    persist({ ...timer, runningSince: t });
    setNow(t);
  }, [timer, persist]);

  const stop = useCallback(async () => {
    if (!timer) return null;
    const session = await saveFocusSession(timer, false);
    persist(null);
    return session;
  }, [timer, persist]);

  const api = useMemo<FocusApi>(
    () => ({ timer, focused, remaining, running: !!timer?.runningSince, justFinished, start, pause, resume, stop, dismissFinished: () => setJustFinished(null) }),
    [timer, focused, remaining, justFinished, start, pause, resume, stop],
  );
  return <FocusContext.Provider value={api}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusApi {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus deve ser usado dentro de FocusProvider');
  return ctx;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
