import { useState } from 'react';
import { Download, FileJson } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { SectionCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { exportBackup, LAST_BACKUP_PREF } from '@/services/backupService';
import { errorMessage } from '@/services/errors';
import { readPreference } from '@/services/preferences';
import { downloadText } from '@/utils/download';
import { formatDateTime } from '@/utils/dates';

export function ExportSection() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(() => readPreference<string | null>(LAST_BACKUP_PREF, null));
  const counts = useLiveQuery(async () => ({
    subjects: await db.subjects.count(),
    topics: await db.topics.count(),
    errors: await db.errors.count(),
    history: await db.history.count(),
    reviews: await db.reviews.count(),
    decks: await db.decks.count(),
    cards: await db.cards.count(),
    questions: await db.questions.count(),
    attempts: await db.questionAttempts.count(),
  }));

  const handleExport = async () => {
    setLoading(true);
    try {
      const { fileName, content, file } = await exportBackup();
      downloadText(fileName, content);
      setLastBackup(file.exportedAt);
      toast.success('Backup gerado', `${fileName} — guarde em um local seguro (ex.: Google Drive, e-mail).`);
    } catch (error) {
      toast.error('Não foi possível gerar o backup', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Exportar backup" subtitle="Gera um arquivo JSON com todos os seus dados." icon={FileJson}>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {(
          [
            ['Matérias', counts?.subjects],
            ['Tópicos', counts?.topics],
            ['Erros', counts?.errors],
            ['Histórico', counts?.history],
            ['Revisões', counts?.reviews],
            ['Baralhos', counts?.decks],
            ['Flashcards', counts?.cards],
            ['Minhas questões', counts?.questions],
            ['Questões respondidas', counts?.attempts],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-canvas p-3">
            <dt className="text-[11px] font-semibold text-ink-muted">{label}</dt>
            <dd className="text-lg font-bold text-ink">{value ?? '…'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Inclui matérias, tópicos, erros (com prioridades, origens e datas), histórico de alterações, revisões, baralhos e flashcards (com imagens e progresso de estudo), suas questões cadastradas e as respostas do Banco de Questões.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button icon={Download} onClick={() => void handleExport()} loading={loading}>
          Exportar backup (JSON)
        </Button>
        <p className="text-xs text-ink-muted">{lastBackup ? `Último backup: ${formatDateTime(lastBackup)}` : 'Nenhum backup exportado ainda.'}</p>
      </div>
    </SectionCard>
  );
}
