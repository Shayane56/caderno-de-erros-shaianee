import { useSyncExternalStore } from 'react';
import { APP_NAME } from '@/constants/app';

/**
 * Perfil de quem usa o caderno neste aparelho (sem login): apenas o nome,
 * usado na saudação do Painel, no menu e nos backups. Fica no LocalStorage,
 * como as demais preferências — cada aparelho/navegador tem o seu caderno.
 */
export interface Profile {
  /** Nome como a pessoa quer ser chamada (ex.: "Shaiane Carvalho"). */
  name: string;
  /** A pessoa preferiu não informar o nome (a boas-vindas não reaparece). */
  skipped: boolean;
}

const KEY = 'caderno-erros:profile';
export const NAME_MAX_LENGTH = 60;
const EMPTY: Profile = { name: '', skipped: false };
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Profile = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Profile {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof value.name === 'string' ? cleanProfileName(value.name) : '',
      skipped: value.skipped === true,
    };
  } catch {
    return EMPTY;
  }
}

export function cleanProfileName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
}

/** Perfil atual (lido do armazenamento a cada chamada, com cache por conteúdo). */
export function getProfile(): Profile {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function save(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* armazenamento indisponível: o nome vale só até fechar o app */
    cachedRaw = JSON.stringify(profile);
    cached = profile;
  }
  updateDocumentTitle();
  listeners.forEach((l) => l());
}

export function setProfileName(name: string): void {
  const clean = cleanProfileName(name);
  save({ name: clean, skipped: !clean });
}

export function skipProfile(): void {
  save({ ...getProfile(), skipped: true });
}

/** Primeiro nome, para a saudação ("Shaiane Carvalho" → "Shaiane"). */
export function firstName(name: string): string {
  return cleanProfileName(name).split(' ')[0] ?? '';
}

/** "Caderno de Erros — Nome" (ou só "Caderno de Erros" sem nome). */
export function notebookTitle(name = getProfile().name): string {
  return name ? `${APP_NAME} — ${name}` : APP_NAME;
}

export function updateDocumentTitle(): void {
  if (typeof document !== 'undefined') document.title = notebookTitle();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Outra aba alterou o nome.
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, getProfile, getProfile);
}
