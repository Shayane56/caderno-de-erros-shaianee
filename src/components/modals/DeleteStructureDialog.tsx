import { useEffect, useState } from 'react';
import { ArrowRightLeft, Trash2 } from 'lucide-react';
import type { Subject, Topic } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { Select } from '@/components/forms/Fields';
import { deleteSubject, getSubjectImpact, type SubjectImpact } from '@/services/subjectService';
import { deleteTopic, getTopicImpact, type TopicImpact } from '@/services/topicService';
import { errorMessage } from '@/services/errors';
import { pluralize } from '@/utils/text';
import { cn } from '@/utils/cn';

type Target = { kind: 'subject'; item: Subject } | { kind: 'topic'; item: Topic };

interface DeleteStructureDialogProps {
  target: Target | null;
  subjects: Subject[];
  topics: Topic[];
  onClose: () => void;
}

const CONFIRM_WORD = 'EXCLUIR';

/**
 * Exclusão de matéria/tópico com apresentação das consequências.
 * Quando há registros vinculados, nada é apagado silenciosamente: a usuária escolhe
 * entre transferir os registros ou excluí-los explicitamente.
 */
export function DeleteStructureDialog({ target, subjects, topics, onClose }: DeleteStructureDialogProps) {
  const toast = useToast();
  const [impact, setImpact] = useState<(SubjectImpact | TopicImpact) | null>(null);
  const [mode, setMode] = useState<'move' | 'cascade'>('move');
  const [destination, setDestination] = useState('');
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setImpact(null);
    setMode('move');
    setDestination('');
    setTyped('');
    if (!target) return;
    const load = target.kind === 'subject' ? getSubjectImpact(target.item.id) : getTopicImpact(target.item.id);
    void load.then(setImpact);
  }, [target]);

  if (!target) return null;
  const isSubject = target.kind === 'subject';
  const hasErrors = (impact?.errors ?? 0) > 0;
  const hasTopics = isSubject && ((impact as SubjectImpact | null)?.topics ?? 0) > 0;
  const needsChoice = hasErrors || hasTopics;
  const options = isSubject
    ? subjects.filter((s) => s.id !== target.item.id).map((s) => ({ id: s.id, label: s.name }))
    : topics
        .filter((t) => t.id !== target.item.id)
        .sort((a, b) => Number(b.subjectId === (target.item as Topic).subjectId) - Number(a.subjectId === (target.item as Topic).subjectId))
        .map((t) => ({ id: t.id, label: `${t.name} — ${subjects.find((s) => s.id === t.subjectId)?.name ?? ''}` }));
  const canMove = options.length > 0;
  const effectiveMode = needsChoice ? (canMove ? mode : 'cascade') : 'cascade';
  const blocked =
    !impact || (needsChoice && effectiveMode === 'move' && !destination) || (needsChoice && effectiveMode === 'cascade' && typed.trim().toUpperCase() !== CONFIRM_WORD);

  const confirm = async () => {
    setLoading(true);
    try {
      if (isSubject) {
        await deleteSubject(target.item.id, effectiveMode === 'move' ? { mode: 'move', targetSubjectId: destination } : { mode: 'cascade' });
      } else {
        await deleteTopic(target.item.id, effectiveMode === 'move' ? { mode: 'move', targetTopicId: destination } : { mode: 'cascade' });
      }
      toast.success(
        isSubject ? 'Matéria excluída' : 'Tópico excluído',
        effectiveMode === 'move' && needsChoice ? 'Os registros foram transferidos e preservados.' : hasErrors ? 'Um ponto de restauração foi criado em Backup.' : undefined,
      );
      onClose();
    } catch (error) {
      toast.error('Não foi possível excluir', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const name = target.item.name;

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={isSubject ? `Excluir a matéria "${name}"?` : `Excluir o tópico "${name}"?`}
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 className="h-5 w-5" aria-hidden />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={effectiveMode === 'move' && needsChoice ? 'primary' : 'danger'} onClick={() => void confirm()} disabled={blocked} loading={loading}>
            {effectiveMode === 'move' && needsChoice ? 'Transferir e excluir' : isSubject ? 'Excluir matéria' : 'Excluir tópico'}
          </Button>
        </>
      }
    >
      {!impact ? (
        <p className="text-sm text-ink-muted">Verificando registros vinculados…</p>
      ) : !needsChoice ? (
        <p className="text-sm text-ink">
          {isSubject ? 'Esta matéria' : 'Este tópico'} não possui registros vinculados. A exclusão pode ser feita com segurança.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Consequências desta operação:</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {hasTopics && <li>{pluralize((impact as SubjectImpact).topics, 'tópico vinculado', 'tópicos vinculados')}</li>}
              <li>
                {pluralize(impact.errors, 'registro de erro', 'registros de erro')} ({impact.pending} pendente{impact.pending === 1 ? '' : 's'},{' '}
                {impact.superados} superado{impact.superados === 1 ? '' : 's'})
              </li>
            </ul>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 font-semibold text-ink">O que fazer com os dados vinculados?</legend>
            <label className={cn('flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition', effectiveMode === 'move' ? 'border-rose-medium bg-blush/40' : 'border-line', !canMove && 'cursor-not-allowed opacity-60')}>
              <input type="radio" name="delete-mode" className="mt-1 accent-[#DB2777]" checked={effectiveMode === 'move'} disabled={!canMove} onChange={() => setMode('move')} />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  <ArrowRightLeft className="h-4 w-4 text-rose-pink" aria-hidden /> Transferir para {isSubject ? 'outra matéria' : 'outro tópico'} (recomendado)
                </span>
                <span className="block text-xs text-ink-muted">
                  {canMove
                    ? isSubject
                      ? 'Tópicos e registros são preservados. Tópicos com o mesmo nome são unificados.'
                      : 'Todos os registros são preservados, com o histórico da transferência.'
                    : `Não há ${isSubject ? 'outra matéria' : 'outro tópico'} para receber os registros.`}
                </span>
                {effectiveMode === 'move' && canMove && (
                  <Select
                    aria-label={isSubject ? 'Matéria de destino' : 'Tópico de destino'}
                    wrapperClassName="mt-2.5"
                    className="h-10 py-2 text-sm"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    <option value="">Selecione o destino…</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </span>
            </label>
            <label className={cn('flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition', effectiveMode === 'cascade' ? 'border-red-300 bg-red-50/60' : 'border-line')}>
              <input type="radio" name="delete-mode" className="mt-1 accent-red-600" checked={effectiveMode === 'cascade'} onChange={() => setMode('cascade')} />
              <span className="flex-1">
                <span className="font-semibold text-red-700">Excluir também todos os registros vinculados</span>
                <span className="block text-xs text-ink-muted">
                  Inclui os erros superados e seus históricos. Um ponto de restauração é criado automaticamente antes.
                </span>
                {effectiveMode === 'cascade' && (
                  <span className="mt-2.5 block">
                    <span className="mb-1 block text-xs text-ink">
                      Digite <strong className="text-red-600">{CONFIRM_WORD}</strong> para confirmar
                    </span>
                    <input className="input h-10 py-2 text-sm" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={`Digite ${CONFIRM_WORD} para confirmar`} autoComplete="off" />
                  </span>
                )}
              </span>
            </label>
          </fieldset>
        </div>
      )}
    </Modal>
  );
}
