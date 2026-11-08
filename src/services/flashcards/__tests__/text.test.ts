import { describe, expect, it } from 'vitest';
import { clozeNumbers, clozeToPlain, insertCloze, nextClozeNumber, parseCloze } from '@/utils/cloze';
import { parseRichText, stripRichText, wrapSelection } from '@/utils/richText';
import { cardOrds, normalizeCard, syncSrs, validateCardInput, emptyCardInput } from '../cardModel';

describe('lacunas (cloze)', () => {
  const text = 'O prazo é de {{c1::15 dias}} e o recurso vai para a {{c2::autoridade superior::quem?}}. {{c1::Improrrogável}}.';

  it('identifica lacunas, números e dicas', () => {
    expect(clozeNumbers(text)).toEqual([1, 2]);
    expect(nextClozeNumber(text)).toBe(3);
    const segments = parseCloze(text);
    expect(segments.filter((s) => s.t === 'cloze')).toEqual([
      { t: 'cloze', n: 1, answer: '15 dias', hint: null },
      { t: 'cloze', n: 2, answer: 'autoridade superior', hint: 'quem?' },
      { t: 'cloze', n: 1, answer: 'Improrrogável', hint: null },
    ]);
    expect(clozeToPlain(text)).toBe('O prazo é de 15 dias e o recurso vai para a autoridade superior. Improrrogável.');
  });

  it('insere novas lacunas ou reutiliza o último número', () => {
    const base = 'A posse ocorre em 30 dias';
    const r1 = insertCloze(base, 18, 25);
    expect(r1.value).toBe('A posse ocorre em {{c1::30 dias}}');
    const r2 = insertCloze(r1.value, 2, 7);
    expect(r2.value).toContain('{{c2::posse}}');
    const r3 = insertCloze(r1.value, 2, 7, true);
    expect(r3.value).toContain('{{c1::posse}}');
  });

  it('cada número de lacuna vira uma face do cartão; editar preserva o progresso', () => {
    const card = { type: 'cloze' as const, front: text, reverse: false };
    expect(cardOrds(card)).toEqual(['1', '2']);
    const srs = syncSrs(card);
    srs['1'] = { ...srs['1'], phase: 'review', interval: 9, due: new Date().toISOString() };
    const edited = syncSrs({ ...card, front: 'Só {{c1::15 dias}} e {{c3::nova}}' }, srs);
    expect(Object.keys(edited)).toEqual(['1', '3']);
    expect(edited['1'].interval).toBe(9);
    expect(edited['3'].phase).toBe('new');
  });
});

describe('marca-texto e formatação', () => {
  it('interpreta negrito, itálico, sublinhado e marca-texto colorido', () => {
    expect(parseRichText('a **b** *c* __d__ ==e== ==verde:f==')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'b', c: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' ' },
      { t: 'i', c: [{ t: 'text', v: 'c' }] },
      { t: 'text', v: ' ' },
      { t: 'u', c: [{ t: 'text', v: 'd' }] },
      { t: 'text', v: ' ' },
      { t: 'hl', color: null, c: [{ t: 'text', v: 'e' }] },
      { t: 'text', v: ' ' },
      { t: 'hl', color: 'verde', c: [{ t: 'text', v: 'f' }] },
    ]);
  });

  it('permite formatação dentro do marca-texto e ignora asteriscos soltos', () => {
    expect(parseRichText('==rosa:**importante**==')).toEqual([{ t: 'hl', color: 'rosa', c: [{ t: 'b', c: [{ t: 'text', v: 'importante' }] }] }]);
    expect(parseRichText('2 * 3 = 6')).toEqual([{ t: 'text', v: '2 * 3 = 6' }]);
    expect(stripRichText('**Lei** ==azul:8.112== de *1990*')).toBe('Lei 8.112 de 1990');
  });

  it('envolve a seleção com marcadores', () => {
    expect(wrapSelection('abc def', 4, 7, '==amarelo:', '==')).toEqual({ value: 'abc ==amarelo:def==', selectionStart: 14, selectionEnd: 17 });
  });
});

describe('validação e normalização de cartões', () => {
  it('exige o conteúdo de cada tipo', () => {
    expect(validateCardInput(emptyCardInput('d1'))).toMatchObject({ front: expect.any(String), back: expect.any(String) });
    expect(validateCardInput({ ...emptyCardInput('d1', 'cloze'), front: 'sem lacuna' }).front).toMatch(/Lacuna/);
    expect(validateCardInput({ ...emptyCardInput('d1', 'truefalse'), front: 'Afirmação' }).answer).toBeDefined();
    expect(validateCardInput({ ...emptyCardInput('d1', 'truefalse'), front: 'Afirmação', answer: 'errado' })).toEqual({});
    expect(validateCardInput({ ...emptyCardInput('d1'), frontImage: 'data:image/png;base64,AAA', back: 'ok' })).toEqual({});
  });

  it('descarta dados inválidos vindos de backup/sincronização sem perder o progresso válido', () => {
    expect(normalizeCard({ id: 'c', deckId: 'd', type: 'xyz', front: 'a' })).toBeNull();
    expect(normalizeCard({ id: 'c', deckId: 'd', type: 'cloze', front: 'sem lacunas' })).toBeNull();
    const card = normalizeCard({
      id: 'c',
      deckId: 'd',
      type: 'basic',
      front: 'Pergunta',
      back: 'Resposta',
      reverse: true,
      frontImage: 'javascript:alert(1)',
      srs: { '0': { phase: 'review', due: '2026-01-01T04:00:00.000Z', interval: 12, ease: 2.2 }, '9': {} },
    });
    expect(card).not.toBeNull();
    expect(card!.frontImage).toBeNull();
    expect(Object.keys(card!.srs)).toEqual(['0', '1']);
    expect(card!.srs['0']).toMatchObject({ phase: 'review', interval: 12, ease: 2.2 });
    expect(card!.srs['1'].phase).toBe('new');
  });
});
