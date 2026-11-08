import { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, Send } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { copyText, emailLink, inviteMessage, inviteUrl, shareInvite, whatsappLink } from '@/services/invite';
import { cn } from '@/utils/cn';
import { Mascot } from './Mascot';

type Variant = 'sidebar' | 'menu' | 'card';

/** Botão "Convidar alguém": compartilhamento do aparelho ou janela com WhatsApp, e-mail e copiar. */
export function InviteButton({ variant = 'sidebar', className, onOpen }: { variant?: Variant; className?: string; onOpen?: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'link' | 'msg' | null>(null);

  const invite = async () => {
    onOpen?.();
    const result = await shareInvite();
    if (result === 'unsupported') setOpen(true);
    else if (result === 'shared') toast.success('Convite enviado 💗', 'Quando a pessoa abrir o link, ela cria o caderno dela.');
  };

  const copy = async (what: 'link' | 'msg') => {
    const ok = await copyText(what === 'link' ? inviteUrl() : inviteMessage());
    if (ok) {
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } else toast.error('Não foi possível copiar', 'Selecione o texto e copie manualmente.');
  };

  const trigger =
    variant === 'menu' ? (
      <button type="button" onClick={() => void invite()} className={cn('flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-blush to-lilac p-3 text-left transition hover:brightness-[0.98]', className)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-rose-pink">
          <Send className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block font-semibold text-ink">Convidar alguém</span>
          <span className="block text-xs text-ink-muted">Mande o Mimo para uma amiga 💗</span>
        </span>
      </button>
    ) : variant === 'card' ? (
      <Button icon={Send} onClick={() => void invite()} className={className}>
        Convidar alguém
      </Button>
    ) : (
      <button
        type="button"
        onClick={() => void invite()}
        className={cn('flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blush to-lilac px-3 py-2.5 text-sm font-bold text-rose-ink transition hover:brightness-[0.98]', className)}
      >
        <Send className="h-4 w-4" aria-hidden /> Convidar alguém
      </button>
    );

  return (
    <>
      {trigger}
      <Modal open={open} onClose={() => setOpen(false)} size="sm" title="Convidar alguém 💗" description="Cada pessoa tem o próprio caderno, guardado só no aparelho dela. Seus dados não são compartilhados.">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
            <Mascot pose="heart" className="h-14 w-14 shrink-0" />
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{inviteMessage()}</p>
          </div>
          <div className="grid gap-2">
            <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-[15px] font-semibold text-white transition hover:brightness-95">
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden /> Enviar no WhatsApp
            </a>
            <a href={emailLink()} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] font-semibold text-ink transition hover:border-rose-medium hover:text-rose-ink">
              <Mail className="h-[18px] w-[18px]" aria-hidden /> Enviar por e-mail
            </a>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={copied === 'link' ? Check : Copy} onClick={() => void copy('link')}>
                {copied === 'link' ? 'Link copiado!' : 'Copiar link'}
              </Button>
              <Button variant="secondary" icon={copied === 'msg' ? Check : Copy} onClick={() => void copy('msg')}>
                {copied === 'msg' ? 'Copiada!' : 'Copiar mensagem'}
              </Button>
            </div>
          </div>
          <p className="break-all rounded-2xl bg-lilac/60 p-2.5 text-center text-xs font-semibold text-lilac-deep">{inviteUrl()}</p>
        </div>
      </Modal>
    </>
  );
}
