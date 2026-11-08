import { useState, type FormEvent } from 'react';
import { Cloud, KeyRound, LogOut, Mail, RefreshCw, Settings2, Unplug } from 'lucide-react';
import { SectionCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { useSync } from '@/hooks/useSync';
import { useSyncVisual } from '@/components/layout/SyncIndicator';
import { formatDateTime } from '@/utils/dates';
import { cn } from '@/utils/cn';

function StatusBanner() {
  const visual = useSyncVisual();
  const Icon = visual.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl p-4', visual.tone)} role="status">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', visual.spin && 'animate-spin')} aria-hidden />
      <div>
        <p className="text-sm font-semibold">{visual.label}</p>
        <p className="text-xs opacity-90">{visual.detail}</p>
      </div>
    </div>
  );
}

function ConfigForm() {
  const { configure } = useSync();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await configure(url, key);
      toast.success('Sincronização configurada', 'Agora entre com sua conta.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuração inválida.');
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
      <p className="text-sm text-ink-muted">
        Para acessar os mesmos dados em vários dispositivos, conecte um projeto <strong className="text-ink">Supabase</strong> gratuito. Veja o
        passo a passo em <code className="rounded bg-canvas px-1 text-xs">docs/SINCRONIZACAO.md</code> no código do projeto.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">URL do projeto</span>
          <input className="input" type="url" inputMode="url" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
        </label>
        <label className="block">
          <span className="field-label">Chave pública (anon key)</span>
          <input className="input" placeholder="eyJhbGciOi…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}
      <Button type="submit" icon={Settings2} variant="secondary" disabled={!url || !key}>
        Salvar configuração
      </Button>
    </form>
  );
}

function AuthForm() {
  const { signIn, signUp } = useSync();
  const toast = useToast();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'in') {
        await signIn(email, password);
        toast.success('Conectada à nuvem', 'A sincronização começará em instantes.');
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) toast.info('Confirme seu e-mail', 'Enviamos um link de confirmação. Depois, entre com sua conta.');
        else toast.success('Conta criada e conectada');
        setMode('in');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
      <div className="flex rounded-xl bg-canvas p-0.5 text-sm font-semibold" role="tablist" aria-label="Acesso">
        {(
          [
            ['in', 'Entrar'],
            ['up', 'Criar conta'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn('flex-1 rounded-[10px] py-2 transition', mode === value ? 'bg-white text-rose-pink shadow-soft' : 'text-ink-muted')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">E-mail</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-antique" aria-hidden />
            <input className="input pl-10" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </span>
        </label>
        <label className="block">
          <span className="field-label">Senha</span>
          <span className="relative block">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-antique" aria-hidden />
            <input
              className="input pl-10"
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </span>
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}
      <Button type="submit" loading={loading} disabled={!email || password.length < 6}>
        {mode === 'in' ? 'Entrar e sincronizar' : 'Criar conta'}
      </Button>
    </form>
  );
}

export function SyncSection() {
  const sync = useSync();
  const toast = useToast();
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <SectionCard
      title="Sincronização em nuvem"
      subtitle="Camada opcional: o caderno funciona 100% offline, com ou sem sincronização."
      icon={Cloud}
      className="scroll-mt-24"
    >
      <div id="sincronizacao" className="space-y-4">
        <StatusBanner />

        {!sync.config && <ConfigForm />}

        {sync.config && !sync.user && sync.status !== 'connecting' && <AuthForm />}

        {sync.config && sync.user && (
          <div className="space-y-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-canvas p-3">
                <dt className="text-[11px] font-semibold text-ink-muted">Conta</dt>
                <dd className="truncate font-semibold text-ink">{sync.user.email}</dd>
              </div>
              <div className="rounded-2xl bg-canvas p-3">
                <dt className="text-[11px] font-semibold text-ink-muted">Última sincronização</dt>
                <dd className="font-semibold text-ink">{sync.lastSyncedAt ? formatDateTime(sync.lastSyncedAt) : 'Ainda não sincronizado'}</dd>
              </div>
              <div className="rounded-2xl bg-canvas p-3">
                <dt className="text-[11px] font-semibold text-ink-muted">Alterações locais pendentes</dt>
                <dd className="font-semibold text-ink">{sync.pendingCount}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button icon={RefreshCw} loading={sync.status === 'syncing'} disabled={!sync.online} onClick={() => void sync.syncNow()}>
                Sincronizar agora
              </Button>
              <Button variant="outline" icon={LogOut} onClick={() => void sync.signOut().then(() => toast.info('Você saiu da conta', 'Os dados continuam salvos neste dispositivo.'))}>
                Sair da conta
              </Button>
            </div>
            <p className="text-xs text-ink-muted">
              Conflitos: quando o mesmo registro é alterado em dois dispositivos, prevalece a alteração mais recente. Matérias e tópicos
              com o mesmo nome criados em aparelhos diferentes são unificados automaticamente.
            </p>
          </div>
        )}

        {sync.config && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-muted">
            <span className="truncate">
              Projeto: <span className="font-medium text-ink">{sync.config.url}</span> {sync.config.source === 'env' && '(definido na publicação)'}
            </span>
            {sync.config.source === 'user' && (
              <Button size="sm" variant="ghost" icon={Unplug} onClick={() => setConfirmRemove(true)}>
                Desconectar projeto
              </Button>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmRemove}
        tone="primary"
        title="Desconectar a sincronização?"
        description="A configuração do Supabase será removida deste dispositivo. Nenhum dado local é apagado e os dados na nuvem permanecem na sua conta."
        confirmLabel="Desconectar"
        onConfirm={async () => {
          await sync.removeConfig();
          setConfirmRemove(false);
          toast.info('Sincronização desconectada', 'O caderno segue funcionando no modo local.');
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </SectionCard>
  );
}
