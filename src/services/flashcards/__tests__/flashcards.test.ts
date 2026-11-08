import { describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import { exportBackup, importBackup, parseBackupText } from '@/services/backupService';
import { runSync } from '@/services/sync/syncEngine';
import { MemoryRemote } from '@/services/sync/__tests__/memoryAdapter';
import { seedError } from '@/test/factories';
import { defaultDeckInput, emptyCardInput } from '../cardModel';
import { createCard, createCardsFromErrors, deleteCards, updateCard } from '../cardService';
import { createDeck, deleteDeck, findOrCreateDeckForSubject } from '../deckService';
import { buildStudyQueue } from '../queue';
import { answerCard, undoAnswer } from '../studyService';
import { studyDayStart } from '../scheduler';

async function seedDeck(name = 'Direito Constitucional', overrides = {}) {
  return createDeck(defaultDeckInput({ name, ...overrides }));
}

async function basicCard(deckId: string, front = 'Qual o prazo do mandado de segurança?', back = '120 dias') {
  return createCard({ ...emptyCardInput(deckId), front, back });
}

async function queueFor(deckIds?: string[], now = new Date()) {
  const [cards, decks, reviewsToday] = await Promise.all([
    db.cards.toArray(),
    db.decks.toArray(),
    db.cardReviews.where('reviewedAt').aboveOrEqual(studyDayStart(now).toISOString()).toArray(),
  ]);
  return buildStudyQueue({ cards, decks, reviewsToday, now, deckIds });
}

describe('baralhos e cartões', () => {
  it('cria baralho, impede nomes repetidos e exclui em cascata com ponto de restauração', async () => {
    const deck = await seedDeck();
    await expect(seedDeck('direito  constitucional')).rejects.toThrow(/já existe/);
    const card = await basicCard(deck.id);
    await answerCard(card.id, '0', 3);
    await deleteDeck(deck.id);
    expect(await db.cards.count()).toBe(0);
    expect(await db.cardReviews.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(1);
    expect((await db.tombstones.toArray()).map((t) => t.entity).sort()).toEqual(['cardReviews', 'cards', 'decks']);
  });

  it('transforma erros do caderno em cartões sem duplicar', async () => {
    const { record, subject } = await seedError({ prevention: 'Fazer quadro comparativo', reference: 'Q123 FGV' });
    const deck = await findOrCreateDeckForSubject(subject.id);
    expect(deck).toMatchObject({ name: subject.name, subjectId: subject.id });
    expect((await findOrCreateDeckForSubject(subject.id)).id).toBe(deck.id);

    const first = await createCardsFromErrors(deck.id, [record.id]);
    expect(first).toEqual({ created: 1, skipped: 0 });
    const again = await createCardsFromErrors(deck.id, [record.id]);
    expect(again).toEqual({ created: 0, skipped: 1 });

    const card = (await db.cards.toArray())[0];
    expect(card).toMatchObject({ type: 'basic', sourceErrorId: record.id, back: record.correction });
    expect(card.front).toContain('Q123 FGV');
    expect(card.extra).toContain('Como evitar: Fazer quadro comparativo');
  });

  it('editar o texto preserva o progresso; mudar o tipo recomeça', async () => {
    const deck = await seedDeck();
    const card = await basicCard(deck.id);
    await answerCard(card.id, '0', 4);
    const edited = await updateCard(card.id, { ...emptyCardInput(deck.id), front: 'Prazo do MS?', back: '120 dias', reverse: true });
    expect(edited.srs['0'].phase).toBe('review');
    expect(edited.srs['1'].phase).toBe('new');
    const changed = await updateCard(card.id, { ...emptyCardInput(deck.id, 'cloze'), front: 'O prazo do MS é de {{c1::120 dias}}' });
    expect(Object.keys(changed.srs)).toEqual(['1']);
    expect(changed.srs['1'].phase).toBe('new');
  });
});

describe('fila de estudo', () => {
  it('respeita o limite diário de novos e mostra primeiro o que está vencido', async () => {
    const deck = await seedDeck('Português', { newPerDay: 2 });
    const cards = [];
    for (let i = 0; i < 4; i++) {
      const card = await basicCard(deck.id, `Pergunta ${i}`, `Resposta ${i}`);
      // Datas distintas: a ordem dos novos segue a data de criação.
      await db.cards.update(card.id, { createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() });
      cards.push(card);
    }
    let queue = await queueFor();
    expect(queue.counts).toEqual({ new: 2, learning: 0, review: 0 });
    expect(queue.next?.card.id).toBe(cards[0].id);

    await answerCard(cards[0].id, '0', 1); // Errei → aprendizagem (1 min)
    queue = await queueFor();
    expect(queue.counts).toEqual({ new: 1, learning: 1, review: 0 });
    // O cartão em aprendizagem ainda não venceu: aparece o próximo novo.
    expect(queue.next?.card.id).toBe(cards[1].id);

    const later = new Date(Date.now() + 2 * 60_000);
    queue = await queueFor(undefined, later);
    expect(queue.next?.card.id).toBe(cards[0].id);
    expect(queue.next?.kind).toBe('learning');
  });

  it('não mostra no mesmo dia a face inversa de um cartão já estudado (irmãos)', async () => {
    const deck = await seedDeck();
    const card = await createCard({ ...emptyCardInput(deck.id), front: 'Capital do Brasil', back: 'Brasília', reverse: true });
    let queue = await queueFor();
    expect(queue.counts.new).toBe(1);
    await answerCard(card.id, '0', 4);
    queue = await queueFor();
    expect(queue.counts).toEqual({ new: 0, learning: 0, review: 0 });
    expect(queue.next).toBeNull();
  });

  it('cartões suspensos e de outros baralhos ficam de fora', async () => {
    const a = await seedDeck('A');
    const b = await seedDeck('B');
    await basicCard(a.id, 'a1');
    const suspended = await basicCard(a.id, 'a2');
    await db.cards.update(suspended.id, { suspended: true });
    await basicCard(b.id, 'b1');
    expect((await queueFor([a.id])).counts.new).toBe(1);
    expect((await queueFor()).counts.new).toBe(2);
  });

  it('desfazer restaura o agendamento e apaga a resposta', async () => {
    const deck = await seedDeck();
    const card = await basicCard(deck.id);
    const { undo } = await answerCard(card.id, '0', 4);
    expect((await db.cards.get(card.id))!.srs['0'].phase).toBe('review');
    await undoAnswer(undo);
    expect((await db.cards.get(card.id))!.srs['0'].phase).toBe('new');
    expect(await db.cardReviews.count()).toBe(0);
  });
});

describe('backup e sincronização dos flashcards', () => {
  it('exporta e reimporta baralhos, cartões e respostas', async () => {
    const deck = await seedDeck('Informática', { color: 'menta', pattern: 'coracoes', paper: 'quadriculado' });
    const card = await createCard({ ...emptyCardInput(deck.id, 'truefalse'), front: 'O Linux é proprietário.', answer: 'errado', back: 'É software livre.' });
    await answerCard(card.id, '0', 3);
    const { content } = await exportBackup();

    await deleteCards([card.id]);
    await db.decks.clear();
    const parsed = parseBackupText(content);
    expect(parsed.data.decks).toHaveLength(1);
    expect(parsed.data.cards).toHaveLength(1);
    expect(parsed.data.cardReviews).toHaveLength(1);
    const result = await importBackup(parsed, 'merge');
    expect(result.plan.cards.new).toBe(1);
    expect(await db.decks.get(deck.id)).toMatchObject({ color: 'menta', pattern: 'coracoes', paper: 'quadriculado' });
    expect((await db.cards.get(card.id))!.answer).toBe('errado');

    // Importar o mesmo arquivo de novo não duplica nada.
    const again = await importBackup(parseBackupText(content), 'merge');
    expect(again.plan.cards.new).toBe(0);
    expect(await db.cards.count()).toBe(1);
  });

  it('aceita backups antigos (sem flashcards)', async () => {
    const legacy = JSON.stringify({ app: 'caderno-de-erros', formatVersion: 2, subjects: [], topics: [], errors: [] });
    const parsed = parseBackupText(legacy);
    expect(parsed.data.cards).toEqual([]);
    expect(parsed.invalid).toEqual([]);
  });

  it('cartões órfãos são ignorados na importação', () => {
    const file = JSON.stringify({
      app: 'caderno-de-erros',
      formatVersion: 3,
      subjects: [],
      topics: [],
      errors: [],
      decks: [],
      cards: [{ id: 'x', deckId: 'nao-existe', type: 'basic', front: 'a', back: 'b' }],
    });
    const parsed = parseBackupText(file);
    expect(parsed.data.cards).toEqual([]);
    expect(parsed.invalid[0]).toMatchObject({ entity: 'cards' });
  });

  it('sincroniza baralhos, cartões e respostas entre dispositivos', async () => {
    const deck = await seedDeck();
    const card = await basicCard(deck.id);
    await answerCard(card.id, '0', 3);
    const remote = new MemoryRemote();
    await runSync(remote.adapter(), 'u1');
    expect(remote.rows.has(`decks:${deck.id}`)).toBe(true);
    expect(remote.rows.has(`cards:${card.id}`)).toBe(true);
    expect([...remote.rows.keys()].some((k) => k.startsWith('cardReviews:'))).toBe(true);

    // "Outro aparelho": banco vazio recebe tudo.
    await db.delete();
    await db.open();
    await runSync(remote.adapter(), 'u1');
    expect(await db.decks.count()).toBe(1);
    expect((await db.cards.get(card.id))!.srs['0'].phase).toBe('learning');
    expect(await db.cardReviews.count()).toBe(1);
  });
});
