import { useRef, useState } from 'react';
import { CircleAlert, FileUp, GitMerge, Replace, Upload } from 'lucide-react';
import { SectionCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  analyzeImport,
  importBackup,
  parseBackupText,
  type EntityPlanCounts,
  type ImportMode,
  type ImportPlan,
  type ParsedBackup,
} from '@/services/backupService';
import { errorMessage } from '@/services/errors';
import { readFileAsText } from '@/utils/download';
import { formatDateTime } from '@/utils/dates';
import { cn } from '@/utils/cn';

const ENTITY_LABELS: Record<string, string> = {
  subjects: 'Matérias',
  topics: 'Tópicos',
  errors: 'Erros',
  history: 'Histórico',
  reviews: 'Revisões',
  decks: 'Baralhos',
  cards: 'Flashcards',
  cardReviews: 'Respostas de estudo',
  questions: 'Minhas questões',
  questionAttempts: 'Respostas de questões',
};

function PlanRow({ label, counts, mode }: { label: string; counts: EntityPlanCounts; mode: ImportMode }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
        {label}
      </th>
      <td className="py-2 text-right tabular-nums text-ink">{counts.new}</td>
      {mode === 'merge' && (
        <>
          <td className="py-2 text-right tabular-nums text-ink">{counts.updated}</td>
          <td className="py-2 text-right tabular-nums text-ink-muted">{counts.duplicates}</td>
        </>
      )}
    </tr>
  );
}

export function ImportSection() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setParsed(null);
    setPlan(null);
    setParseError(null);
    setFileName('');
    setMode('merge');
    if (inputRef.current) inputRef.current.value = '';
  };

  const updatePlan = async (p: ParsedBackup, m: ImportMode) => {
    setMode(m);
    setPlan(await analyzeImport(p, m));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    try {
      const text = await readFileAsText(file);
      const result = parseBackupText(text);
      setParsed(result);
      await updatePlan(result, 'merge');
    } catch (error) {
      setParseError(errorMessage(error, 'Não foi possível ler o arquivo.'));
    }
  };

  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      const result = await importBackup(parsed, mode);
      const p = result.plan;
      toast.success(
        'Importação concluída',
        mode === 'merge'
          ? `${p.errors.new} erro(s) novo(s), ${p.errors.updated} atualizado(s). Registros existentes preservados.`
          : `Dados substituídos. ${result.snapshotCreated ? 'Um ponto de restauração foi criado.' : ''}`,
      );
      setConfirmReplace(false);
      reset();
    } catch (error) {
      toast.error('Falha na importação', errorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <SectionCard title="Importar backup" subtitle="Restaure ou mescle dados a partir de um arquivo JSON." icon={Upload}>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        id="backup-file"
        aria-label="Selecionar arquivo de backup JSON"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {!parsed && (
        <label
          htmlFor="backup-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-petal bg-blush/20 px-6 py-8 text-center transition hover:border-rose-medium hover:bg-blush/40"
        >
          <FileUp className="h-8 w-8 text-rose-medium" aria-hidden />
          <span className="font-semibold text-ink">Selecionar arquivo JSON</span>
          <span className="text-xs text-ink-muted">Nada é alterado antes de você revisar o resumo e confirmar.</span>
        </label>
      )}

      {parseError && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Arquivo inválido: {fileName}</p>
            <p>{parseError}</p>
          </div>
        </div>
      )}

      {parsed && plan && (
        <div className="space-y-4" aria-live="polite">
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="font-semibold text-ink">{fileName}</p>
            <p className="text-xs text-ink-muted">
              Formato v{parsed.formatVersion}
              {parsed.exportedAt ? ` · exportado em ${formatDateTime(parsed.exportedAt)}` : ''} · {parsed.data.errors.length} erro(s) válido(s)
            </p>
          </div>

          {(parsed.invalid.length > 0 || parsed.warnings.length > 0) && (
            <div className="space-y-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              {parsed.warnings.map((w) => (
                <p key={w}>• {w}</p>
              ))}
              {parsed.invalid.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-semibold">
                    {parsed.invalid.length} item(ns) inválido(s) serão ignorados
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto text-xs">
                    {parsed.invalid.map((i) => (
                      <li key={`${i.entity}-${i.index}`}>
                        {ENTITY_LABELS[i.entity]} #{i.index + 1}: {i.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Como importar?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['merge', GitMerge, 'Mesclar com os dados existentes', 'Mantém tudo o que já existe; adiciona novidades e atualiza registros mais recentes. Duplicações são ignoradas.'],
                  ['replace', Replace, 'Substituir os dados existentes', 'Apaga os dados atuais e usa somente o arquivo. Um ponto de restauração é criado antes.'],
                ] as const
              ).map(([value, Icon, title, desc]) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition',
                    mode === value ? (value === 'replace' ? 'border-red-300 bg-red-50/50' : 'border-rose-medium bg-blush/40') : 'border-line hover:border-rose-medium/50',
                  )}
                >
                  <input type="radio" name="import-mode" value={value} checked={mode === value} onChange={() => void updatePlan(parsed, value)} className="mt-1 accent-rose-pink" />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Icon className="h-4 w-4 text-rose-pink" aria-hidden /> {title}
                    </span>
                    <span className="block text-xs text-ink-muted">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left text-sm font-semibold text-ink">Resumo antes da importação</caption>
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="pb-1 text-left font-semibold">
                    Item
                  </th>
                  <th scope="col" className="pb-1 text-right font-semibold">
                    {mode === 'merge' ? 'Novos' : 'Serão gravados'}
                  </th>
                  {mode === 'merge' && (
                    <>
                      <th scope="col" className="pb-1 text-right font-semibold">
                        Atualizados
                      </th>
                      <th scope="col" className="pb-1 text-right font-semibold">
                        Já existentes
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(['subjects', 'topics', 'errors', 'history', 'reviews', 'decks', 'cards', 'cardReviews', 'questions', 'questionAttempts'] as const).map((k) => (
                  <PlanRow key={k} label={ENTITY_LABELS[k]} counts={plan[k]} mode={mode} />
                ))}
              </tbody>
            </table>
          </div>

          {mode === 'replace' && (
            <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">
              Serão removidos dos dados atuais: {plan.toRemove.subjects} matéria(s), {plan.toRemove.topics} tópico(s), {plan.toRemove.errors} erro(s), {plan.toRemove.decks} baralho(s) e {plan.toRemove.cards} flashcard(s).
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={reset} disabled={importing}>
              Cancelar
            </Button>
            <Button
              variant={mode === 'replace' ? 'danger' : 'primary'}
              icon={mode === 'replace' ? Replace : GitMerge}
              loading={importing && mode === 'merge'}
              onClick={() => (mode === 'replace' ? setConfirmReplace(true) : void runImport())}
            >
              {mode === 'replace' ? 'Substituir dados…' : 'Mesclar dados'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReplace}
        title="Substituir todos os dados?"
        description="Os dados atuais deste dispositivo serão trocados pelo conteúdo do arquivo. Um ponto de restauração será criado antes, e você poderá desfazer em “Pontos de restauração”."
        confirmLabel="Substituir dados"
        requireText="SUBSTITUIR"
        loading={importing}
        onConfirm={runImport}
        onCancel={() => setConfirmReplace(false)}
      />
    </SectionCard>
  );
}
