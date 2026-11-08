/**
 * Calculadora simples (sem eval): avalia expressões com + − × ÷, parênteses,
 * porcentagem (50% = 0,5) e vírgula ou ponto decimal.
 */
export function evaluateExpression(input: string): number {
  const src = input.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.');
  let pos = 0;
  const peek = () => src[pos];
  const fail = (): never => {
    throw new Error('Expressão inválida');
  };
  function parseNumber(): number {
    const m = /^\d*\.?\d+(?:e[+-]?\d+)?/i.exec(src.slice(pos)) ?? /^\d+\./.exec(src.slice(pos));
    if (!m) fail();
    pos += m![0].length;
    let value = Number(m![0]);
    while (peek() === '%') {
      pos++;
      value /= 100;
    }
    return value;
  }
  function factor(): number {
    const c = peek();
    if (c === '-') {
      pos++;
      return -factor();
    }
    if (c === '+') {
      pos++;
      return factor();
    }
    if (c === '(') {
      pos++;
      const v = expr();
      if (peek() !== ')') fail();
      pos++;
      let value = v;
      while (peek() === '%') {
        pos++;
        value /= 100;
      }
      return value;
    }
    return parseNumber();
  }
  function term(): number {
    let v = factor();
    while (peek() === '*' || peek() === '/') {
      const op = src[pos++];
      const r = factor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function expr(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = src[pos++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  if (!src) return 0;
  const result = expr();
  if (pos !== src.length || !Number.isFinite(result)) fail();
  return result;
}

export function formatResult(value: number): string {
  const rounded = Math.round(value * 1e10) / 1e10;
  return rounded.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
}
