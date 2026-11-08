import { cn } from '@/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-rose-pink">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
