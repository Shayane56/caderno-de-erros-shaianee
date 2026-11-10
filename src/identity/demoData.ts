import { db } from '@/database/db';
import { trackDeletion } from '@/database/changeTracker';
import type { CardType, DeckColor, Rating } from '@/types';
import { createDeck } from '@/services/flashcards/deckService';
import { createCard, deleteCardsCascade } from '@/services/flashcards/cardService';
import { answerCard } from '@/services/flashcards/studyService';
import { defaultDeckInput, emptyCardInput } from '@/services/flashcards/cardModel';
import { studyDayStart } from '@/services/flashcards/scheduler';
import { createSubject } from '@/services/subjectService';
import { readPreference, removePreference, writePreference } from '@/services/preferences';
import { sameName } from '@/utils/text';

/**
 * Baralhos de exemplo para avaliar as identidades com dados de verdade.
 * Opcional e reversível: tudo o que é criado fica registrado e "Remover exemplos"
 * apaga exatamente esses baralhos (com cartões e respostas) e as disciplinas
 * criadas por eles que continuarem sem uso.
 *
 * O histórico de duas semanas é produzido pelo próprio agendador do Mimo
 * (answerCard com datas passadas), então intervalos e estatísticas são reais.
 */
const PREF = 'identity:demo';
const TAG = 'exemplo-mimo';

interface DemoRecord {
  deckIds: string[];
  subjectIds: string[];
}

type DemoCard = { type: CardType; front: string; back?: string; answer?: 'certo' | 'errado'; extra?: string };

const LIBRARY: Array<{ name: string; subject: string; color: DeckColor; description: string; cards: DemoCard[] }> = [
  {
    name: 'Direitos Fundamentais',
    subject: 'Direito Constitucional',
    color: 'roxo',
    description: 'Art. 5º da Constituição: garantias, remédios constitucionais e vedações.',
    cards: [
      { type: 'basic', front: 'Qual remédio constitucional protege a **liberdade de locomoção**?', back: 'Habeas corpus.', extra: 'CF/88, art. 5º, LXVIII.' },
      { type: 'basic', front: 'Qual remédio assegura o conhecimento de informações pessoais em registros públicos?', back: 'Habeas data.', extra: 'CF/88, art. 5º, LXXII.' },
      { type: 'cloze', front: 'O mandado de segurança coletivo pode ser impetrado por {{c1::partido político com representação no Congresso Nacional}} e por organização sindical, entidade de classe ou associação em funcionamento há pelo menos {{c2::um ano}}.' },
      { type: 'truefalse', front: 'A casa é asilo inviolável do indivíduo, podendo-se nela penetrar, durante a noite, por determinação judicial.', answer: 'errado', back: 'Por determinação judicial, só durante o dia. À noite, apenas em flagrante delito, desastre ou para prestar socorro (art. 5º, XI).' },
      { type: 'truefalse', front: 'É livre a manifestação do pensamento, sendo vedado o anonimato.', answer: 'certo', back: 'Literal do art. 5º, IV.' },
      { type: 'basic', front: 'Qual é o prazo para impetrar mandado de segurança?', back: '120 dias, contados da ciência do ato impugnado.', extra: 'Lei 12.016/2009, art. 23.' },
      { type: 'basic', front: 'Quem tem legitimidade para propor ação popular?', back: 'Qualquer cidadão.', extra: 'CF/88, art. 5º, LXXIII.' },
      { type: 'truefalse', front: 'A prática do racismo constitui crime inafiançável e imprescritível, sujeito à pena de reclusão.', answer: 'certo', back: 'Art. 5º, XLII.' },
      { type: 'cloze', front: 'Ninguém será considerado culpado até o {{c1::trânsito em julgado}} de sentença penal condenatória.' },
      { type: 'basic', front: 'Tortura, tráfico, terrorismo e crimes hediondos são…', back: 'Inafiançáveis e insuscetíveis de graça ou anistia.', extra: 'Art. 5º, XLIII.' },
    ],
  },
  {
    name: 'Crase e Regência',
    subject: 'Língua Portuguesa',
    color: 'lavanda',
    description: 'Casos obrigatórios, proibidos e as regências que mais caem.',
    cards: [
      { type: 'truefalse', front: 'Em “Vou a Bahia”, não ocorre crase.', answer: 'errado', back: '“Bahia” admite artigo (venho __da__ Bahia), então: Vou à Bahia.' },
      { type: 'basic', front: 'Ocorre crase antes de palavra masculina?', back: 'Em regra, não. Exceção: com a ideia de “à moda de” subentendida — bife à milanesa.' },
      { type: 'cloze', front: 'Usa-se crase na indicação de horas: a reunião começa {{c1::às}} 14h.' },
      { type: 'cloze', front: 'Antes de verbo {{c1::não}} ocorre crase: começou a chover.' },
      { type: 'basic', front: 'Regência de “assistir” no sentido de ver', back: 'Transitivo indireto, com a preposição “a”: assisti ao filme.' },
      { type: 'basic', front: 'Regência de “obedecer”', back: 'Transitivo indireto: obedecer ao regulamento.' },
      { type: 'truefalse', front: '“Prefiro estudar do que dormir” está de acordo com a norma-padrão.', answer: 'errado', back: 'Prefere-se algo **a** algo: prefiro estudar a dormir.' },
      { type: 'truefalse', front: 'Em “Refiro-me a ela”, não há crase porque não se usa artigo antes de pronome pessoal.', answer: 'certo' },
      { type: 'basic', front: 'Regra prática da crase antes de nome de lugar', back: 'Volto **da**, crase há; volto **de**, crase pra quê? — Vou à Bahia; vou a Roma.' },
    ],
  },
  {
    name: 'Segurança da Informação',
    subject: 'Informática',
    color: 'ceu',
    description: 'Pilares, códigos maliciosos, backup e criptografia.',
    cards: [
      { type: 'basic', front: 'Quais são os três pilares da segurança da informação?', back: 'Confidencialidade, integridade e disponibilidade.' },
      { type: 'basic', front: 'O que é phishing?', back: 'Golpe com mensagens falsas que induzem a vítima a revelar dados ou instalar programas maliciosos.' },
      { type: 'truefalse', front: 'Um worm precisa de um programa hospedeiro para se propagar.', answer: 'errado', back: 'O worm se propaga sozinho, explorando vulnerabilidades. Quem depende de hospedeiro é o vírus.' },
      { type: 'basic', front: 'O que é ransomware?', back: 'Código malicioso que torna os dados inacessíveis — em geral criptografando-os — e exige resgate.' },
      { type: 'cloze', front: 'O backup {{c1::incremental}} copia o que mudou desde o último backup de qualquer tipo; o {{c2::diferencial}}, o que mudou desde o último backup completo.' },
      { type: 'truefalse', front: 'A assinatura digital garante autenticidade, integridade e não repúdio.', answer: 'certo' },
      { type: 'basic', front: 'Para que serve um firewall?', back: 'Controlar o tráfego da rede segundo regras, bloqueando acessos não autorizados.' },
      { type: 'truefalse', front: 'A criptografia simétrica usa um par de chaves, uma pública e uma privada.', answer: 'errado', back: 'A simétrica usa uma única chave. O par pública/privada é da criptografia assimétrica.' },
    ],
  },
  {
    name: 'SUS — Leis Orgânicas',
    subject: 'Saúde Pública',
    color: 'menta',
    description: 'Leis 8.080/1990 e 8.142/1990: princípios, participação e financiamento.',
    cards: [
      { type: 'basic', front: 'Quais são os princípios doutrinários do SUS?', back: 'Universalidade, integralidade e equidade.' },
      { type: 'cloze', front: 'A Lei {{c1::8.080}}/1990 trata da promoção, proteção e recuperação da saúde; a Lei {{c2::8.142}}/1990, da participação da comunidade e das transferências de recursos.' },
      { type: 'truefalse', front: 'A participação da comunidade no SUS ocorre por meio das Conferências e dos Conselhos de Saúde.', answer: 'certo', back: 'Lei 8.142/1990, art. 1º.' },
      { type: 'basic', front: 'Com que periodicidade se reúne a Conferência de Saúde?', back: 'A cada quatro anos.' },
      { type: 'truefalse', front: 'O Conselho de Saúde tem caráter apenas consultivo.', answer: 'errado', back: 'Tem caráter permanente e deliberativo.' },
      { type: 'truefalse', front: 'A iniciativa privada pode participar do SUS de forma complementar.', answer: 'certo', back: 'CF/88, art. 199, § 1º.' },
    ],
  },
];

export function readDemo(): DemoRecord | null {
  const r = readPreference<DemoRecord | null>(PREF, null);
  return r && Array.isArray(r.deckIds) ? r : null;
}

/** Gerador determinístico (o mesmo histórico a cada criação). */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickRating(r: number, phase: string): Rating {
  if (phase === 'new') return r < 0.22 ? 1 : r < 0.35 ? 2 : r < 0.9 ? 3 : 4;
  return r < 0.12 ? 1 : r < 0.27 ? 2 : r < 0.88 ? 3 : 4;
}

export async function createDemoLibrary(onProgress?: (msg: string) => void): Promise<DemoRecord> {
  const previous = readDemo();
  if (previous) {
    // Registro antigo cujos baralhos já não existem (ex.: dados apagados): começa de novo.
    if ((await db.decks.where('id').anyOf(previous.deckIds).count()) > 0) throw new Error('Os baralhos de exemplo já foram criados.');
    removePreference(PREF);
  }
  const record: DemoRecord = { deckIds: [], subjectIds: [] };
  const subjects = await db.subjects.toArray();
  const existingDecks = await db.decks.toArray();

  for (const entry of LIBRARY) {
    onProgress?.(`Criando “${entry.name}”…`);
    let subject = subjects.find((s) => sameName(s.name, entry.subject));
    if (!subject) {
      subject = await createSubject(entry.subject);
      subjects.push(subject);
      record.subjectIds.push(subject.id);
    }
    const name = existingDecks.some((d) => sameName(d.name, entry.name)) ? `${entry.name} (exemplo)` : entry.name;
    const deck = await createDeck(defaultDeckInput({ name, subjectId: subject.id, color: entry.color, description: entry.description, emoji: '📒', newPerDay: 6 }));
    record.deckIds.push(deck.id);
    writePreference(PREF, record);
    for (const c of entry.cards) {
      await createCard({ ...emptyCardInput(deck.id, c.type), front: c.front, back: c.back ?? '', extra: c.extra ?? '', answer: c.answer ?? '', tags: [TAG] });
    }
  }

  // Duas semanas e meia de estudo simuladas com o agendador real.
  onProgress?.('Simulando duas semanas de revisões…');
  const rand = random(20261110);
  const today = studyDayStart(new Date());
  for (let back = 16; back >= 1; back--) {
    if (rand() < 0.16) continue; // alguns dias sem estudo, como na vida real
    const day = new Date(today.getTime() - back * 86_400_000);
    let t = new Date(day);
    t.setHours(19, Math.floor(rand() * 50), 0, 0);
    const dayEnd = new Date(day.getTime() + 86_400_000).toISOString();
    const cards = await db.cards.where('deckId').anyOf(record.deckIds).toArray();
    let fresh = 0;
    for (const card of cards.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      for (const ord of Object.keys(card.srs)) {
        const state = card.srs[ord];
        const due = state.phase !== 'new' && state.due && state.due < dayEnd;
        const learnNew = state.phase === 'new' && fresh < 2 && back > 1;
        if (!due && !learnNew) continue;
        if (learnNew) fresh++;
        let phase: string = state.phase;
        for (let step = 0; step < 4; step++) {
          const rating = pickRating(rand(), phase);
          const duration = 4000 + Math.floor(rand() * 14000);
          const result = await answerCard(card.id, ord, rating, duration, t);
          const next = result.card.srs[ord];
          phase = next.phase;
          if (next.phase === 'review' || !next.due) break;
          t = new Date(Math.max(new Date(next.due).getTime(), t.getTime() + 60_000));
        }
        t = new Date(t.getTime() + duration());
      }
    }
  }
  onProgress?.('Pronto.');
  return record;

  function duration() {
    return 20_000 + Math.floor(rand() * 30_000);
  }
}

export async function removeDemoLibrary(): Promise<void> {
  const record = readDemo();
  if (!record) return;
  await db.transaction('rw', [db.decks, db.cards, db.cardReviews, db.tombstones, db.pendingChanges], async () => {
    for (const deckId of record.deckIds) {
      const cardIds = (await db.cards.where('deckId').equals(deckId).primaryKeys()) as string[];
      await deleteCardsCascade(cardIds);
      if (await db.decks.get(deckId)) {
        await db.decks.delete(deckId);
        await trackDeletion('decks', deckId);
      }
    }
  });
  for (const id of record.subjectIds) {
    const [topics, errors, decks] = await Promise.all([
      db.topics.where('subjectId').equals(id).count(),
      db.errors.where('subjectId').equals(id).count(),
      db.decks.where('subjectId').equals(id).count(),
    ]);
    if (topics + errors + decks === 0 && (await db.subjects.get(id))) {
      await db.subjects.delete(id);
      await trackDeletion('subjects', id);
    }
  }
  removePreference(PREF);
}
