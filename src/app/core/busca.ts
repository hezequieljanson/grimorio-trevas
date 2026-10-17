/** Normaliza para busca: sem acentos, minúsculas. */
export function norm(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Pontua um texto contra os termos digitados (todos precisam aparecer). */
export function pontuar(termos: string[], campos: { texto: string; peso: number }[]): number {
  let total = 0;
  for (const t of termos) {
    let melhor = 0;
    for (const c of campos) {
      const n = norm(c.texto);
      if (n.includes(t)) melhor = Math.max(melhor, c.peso * (n.startsWith(t) ? 2 : 1));
    }
    if (!melhor) return 0;
    total += melhor;
  }
  return total;
}

export function termosDe(q: string): string[] {
  return norm(q)
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1);
}
