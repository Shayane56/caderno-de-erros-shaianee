import { useEffect, useRef, useState } from 'react';
import { Delete } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Mascot } from '@/components/mimo/Mascot';
import { evaluateExpression, formatResult } from '@/utils/calculator';
import { saveQuestionNote, useQuestionNote } from '@/services/study/notesService';
import { cn } from '@/utils/cn';

/* ------------------------------------------------------------------ Calculadora */

const KEYS = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', ',', '%', '='];

export function CalculatorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const press = (key: string) => {
    if (key === 'C') {
      setExpr('');
      setResult(null);
    } else if (key === '=') {
      try {
        const value = formatResult(evaluateExpression(expr));
        setResult(value);
        setExpr(value.replace(/\./g, ''));
      } catch {
        setResult('Erro');
      }
    } else {
      setResult(null);
      setExpr((e) => e + key);
    }
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Calculadora">
      <div className="space-y-3">
        <div className="rounded-2xl bg-canvas p-4 text-right">
          <input
            aria-label="Expressão"
            className="w-full bg-transparent text-right text-lg font-semibold text-ink-muted outline-none"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && press('=')}
            placeholder="0"
          />
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink" aria-live="polite">
            {result ?? (expr ? '' : '0')}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className={cn(
                'h-12 rounded-2xl text-lg font-bold transition active:scale-95',
                k === '=' ? 'bg-rose-pink text-white' : /[÷×−+%()]/.test(k) ? 'bg-lilac text-lilac-deep' : k === 'C' ? 'bg-blush text-rose-ink' : 'bg-canvas text-ink hover:bg-blush',
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" icon={Delete} onClick={() => setExpr((e) => e.slice(0, -1))} block>
          Apagar
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Anotações */

export function NotesDialog({ open, onClose, questionId }: { open: boolean; onClose: () => void; questionId: string }) {
  const saved = useQuestionNote(questionId);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (open && saved !== undefined && loadedFor.current !== questionId) {
      loadedFor.current = questionId;
      setText(saved);
      setStatus('idle');
    }
    if (!open) loadedFor.current = null;
  }, [open, saved, questionId]);

  // Salva sozinho, pouco depois de parar de digitar.
  useEffect(() => {
    if (!open || saved === undefined || text === saved) return;
    setStatus('saving');
    const id = window.setTimeout(() => void saveQuestionNote(questionId, text).then(() => setStatus('saved')), 600);
    return () => window.clearTimeout(id);
  }, [text, saved, open, questionId]);

  return (
    <Modal open={open} onClose={onClose} size="md" title="Minhas anotações" description="Fica guardada nesta questão e aparece sempre que você voltar a ela.">
      <textarea
        aria-label="Anotação da questão"
        className="input min-h-[180px] resize-y leading-relaxed"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: pegadinha da banca — “ex tunc” × “ex nunc”…"
        data-autofocus
      />
      <p className="mt-2 text-xs text-ink-muted">{status === 'saving' ? 'Salvando…' : status === 'saved' ? 'Salvo ✓' : 'Salvamento automático.'}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Dica do Mimo */

const TIPS = [
  'Leia o comando antes do texto: saber o que se pede economiza tempo.',
  'Palavras como “sempre”, “nunca” e “exclusivamente” costumam tornar o item errado.',
  'Errou? Registre o porquê no caderno: é o erro entendido que não se repete.',
  'Nas questões Certo/Errado, um único detalhe falso torna todo o item errado.',
  'Em lei seca, a banca troca prazos, quóruns e competências. Grife os números!',
  'Elimine primeiro as alternativas absurdas; depois compare as que sobraram.',
  'Uma pausa de 5 minutos a cada 50 de estudo ajuda a memória a fixar o conteúdo.',
  'Revisar no dia seguinte vale mais do que reler três vezes no mesmo dia.',
  'Desconfie da alternativa “mais completa” quando ela extrapola o que a lei diz.',
  'Na dúvida entre duas, volte ao enunciado: qual responde exatamente ao que foi pedido?',
];

export function MimoTip({ seed = 0, className }: { seed?: number; className?: string }) {
  const tip = TIPS[Math.abs(seed) % TIPS.length];
  return (
    <aside className={cn('rounded-[24px] bg-gradient-to-br from-blush to-lilac p-4 ring-1 ring-line/80', className)} aria-label="Dica do Mimo">
      <div className="flex items-center gap-2">
        <Mascot pose="face" className="h-9 w-10" />
        <p className="font-display text-[15px] font-extrabold text-ink">Dica do Mimo</p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{tip}</p>
    </aside>
  );
}

export function tipSeed(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}
