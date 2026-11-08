import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import type { Question, QuestionAttempt } from '@/types';
import { loadQuestionBank } from '@/data/questionBank';

/** Questões do banco embutido (carregadas sob demanda). */
export function useQuestionBank(): Question[] | undefined {
  const [bank, setBank] = useState<Question[] | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void loadQuestionBank().then((list) => active && setBank(list));
    return () => {
      active = false;
    };
  }, []);
  return bank;
}

export function useMyQuestions(): Question[] | undefined {
  return useLiveQuery(() => db.questions.toArray(), []);
}

export function useQuestionAttempts(): QuestionAttempt[] | undefined {
  return useLiveQuery(() => db.questionAttempts.toArray(), []);
}

export interface QuestionData {
  questions: Question[];
  attempts: QuestionAttempt[];
  loading: boolean;
}

/** Banco embutido + questões próprias + respostas. */
export function useQuestionData(): QuestionData {
  const bank = useQuestionBank();
  const mine = useMyQuestions();
  const attempts = useQuestionAttempts();
  return useMemo(
    () => ({
      questions: [...(mine ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), ...(bank ?? [])],
      attempts: attempts ?? [],
      loading: bank === undefined || mine === undefined || attempts === undefined,
    }),
    [bank, mine, attempts],
  );
}
