/**
 * Dice (bigram) + Levenshtein for in-process area suggestion fuzzy match.
 * DB campus/listing suggestions use pg_trgm instead.
 */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  const counts = new Map<string, number>();
  for (const g of aGrams) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of bGrams) {
    const c = counts.get(g) ?? 0;
    if (c <= 0) continue;
    hits += 1;
    counts.set(g, c - 1);
  }
  return (2 * hits) / (aGrams.length + bGrams.length);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}
