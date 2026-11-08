import { db } from '@/database/db';
import { trackChange } from '@/database/changeTracker';
import { nowIso } from '@/utils/ids';
import { AppError } from '../errors';
import { notebookTitle } from '../profile';
import { normalizeQuestion } from './questionModel';

/** Arquivo para compartilhar questões próprias com outras pessoas. */
interface QuestionsFile {
  app: 'caderno-de-erros';
  kind: 'questoes';
  version: 1;
  exportedAt: string;
  author: string;
  questions: unknown[];
}

export async function exportMyQuestions(): Promise<{ fileName: string; content: string; count: number }> {
  const questions = await db.questions.toArray();
  const file: QuestionsFile = { app: 'caderno-de-erros', kind: 'questoes', version: 1, exportedAt: nowIso(), author: notebookTitle(), questions };
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fileName: `banco-de-questoes-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`,
    content: JSON.stringify(file, null, 2),
    count: questions.length,
  };
}

/**
 * Importa questões de um arquivo de questões ou de um backup completo do caderno.
 * Questões que já existem (mesmo identificador) são ignoradas.
 */
export async function importQuestionsFile(text: string): Promise<{ created: number; skipped: number }> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError('invalid_file', 'O arquivo selecionado não é um JSON válido.');
  }
  const list = json && typeof json === 'object' && Array.isArray((json as { questions?: unknown }).questions) ? (json as { questions: unknown[] }).questions : null;
  if (!list) throw new AppError('invalid_file', 'Este arquivo não contém questões do Mimo.');
  let created = 0;
  let skipped = 0;
  await db.transaction('rw', [db.questions, db.pendingChanges], async () => {
    const now = nowIso();
    for (const raw of list) {
      const q = normalizeQuestion({ ...(raw as object), origin: 'minha' });
      if (!q || (await db.questions.get(q.id))) {
        skipped++;
        continue;
      }
      await db.questions.add({ ...q, updatedAt: now });
      await trackChange('questions', q.id, now);
      created++;
    }
  });
  return { created, skipped };
}
