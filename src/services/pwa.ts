/**
 * Registro do Service Worker (PWA). Os dados ficam no IndexedDB — atualizar o
 * aplicativo nunca apaga registros.
 */
type Listener = () => void;

let updateReady = false;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<Listener>();
let offlineReady = false;

export function onUpdateAvailable(listener: Listener): () => void {
  listeners.add(listener);
  if (updateReady) listener();
  return () => listeners.delete(listener);
}

export function isOfflineReady(): boolean {
  return offlineReady;
}

export async function applyUpdate(): Promise<void> {
  if (updateSW) await updateSW(true);
  else window.location.reload();
}

export async function registerServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateReady = true;
        listeners.forEach((l) => l());
      },
      onOfflineReady() {
        offlineReady = true;
      },
    });
  } catch (error) {
    console.error('Falha ao registrar o Service Worker:', error);
  }
}
