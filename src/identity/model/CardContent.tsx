import type { ReactNode } from 'react';
import type { Flashcard } from '@/types';
import { ClozeText, RichText } from '@/components/flashcards/RichText';
import { useAppearance } from '@/services/appearance';

/**
 * Conteúdo de uma face do cartão separado em partes (pergunta, resposta, gabarito,
 * anotação), sem nenhum estilo próprio: a tipografia e a moldura vêm da identidade.
 */
export interface FaceParts {
  question: ReactNode;
  questionImage: string | null;
  answer: ReactNode | null;
  answerImage: string | null;
  /** Gabarito dos cartões Certo ou Errado. */
  verdict: 'certo' | 'errado' | null;
  extra: ReactNode | null;
  kind: 'basic' | 'cloze' | 'truefalse';
}

export function useFaceParts(card: Flashcard, ord: string, revealed: boolean): FaceParts {
  const { highlight } = useAppearance();
  if (card.type === 'cloze') {
    return {
      kind: 'cloze',
      question: <ClozeText text={card.front} active={Number(ord)} revealed={revealed} highlight={highlight} />,
      questionImage: card.frontImage,
      answer: card.back ? <RichText text={card.back} highlight={highlight} /> : null,
      answerImage: card.backImage,
      verdict: null,
      extra: card.extra ? <RichText text={card.extra} highlight={highlight} /> : null,
    };
  }
  if (card.type === 'truefalse') {
    return {
      kind: 'truefalse',
      question: <RichText text={card.front} highlight={highlight} />,
      questionImage: card.frontImage,
      answer: card.back ? <RichText text={card.back} highlight={highlight} /> : null,
      answerImage: card.backImage,
      verdict: card.answer,
      extra: card.extra ? <RichText text={card.extra} highlight={highlight} /> : null,
    };
  }
  const reverse = ord === '1';
  return {
    kind: 'basic',
    question: <RichText text={reverse ? card.back : card.front} highlight={highlight} />,
    questionImage: reverse ? card.backImage : card.frontImage,
    answer: <RichText text={reverse ? card.front : card.back} highlight={highlight} />,
    answerImage: reverse ? card.frontImage : card.backImage,
    verdict: null,
    extra: card.extra ? <RichText text={card.extra} highlight={highlight} /> : null,
  };
}
