// Regras de rolagem do Storyteller: d10 contra dificuldade; cada 1 anula um sucesso;
// sem sucessos e com algum 1 = falha crítica. Força de Vontade dá 1 sucesso automático.

export interface Resultado {
  dados: number[];
  dificuldade: number;
  sucessos: number;
  critica: boolean;
  texto: string;
  usouFv: boolean;
}

export function rolarD10(n: number): number[] {
  const out: number[] = [];
  const qtd = Math.max(0, Math.min(n, 50));
  const buf = new Uint32Array(qtd);
  try {
    crypto.getRandomValues(buf);
    for (const x of buf) out.push((x % 10) + 1);
  } catch {
    for (let i = 0; i < qtd; i++) out.push(1 + Math.floor(Math.random() * 10));
  }
  return out;
}

export function avaliar(dados: number[], dificuldade: number, usouFv = false): Resultado {
  const acertos = dados.filter((d) => d >= dificuldade).length;
  const uns = dados.filter((d) => d === 1).length;
  const liquido = Math.max(acertos - uns, 0) + (usouFv ? 1 : 0);
  const critica = !usouFv && acertos === 0 && uns > 0;
  let texto: string;
  if (critica) texto = 'Falha crítica!';
  else if (liquido <= 0) texto = 'Falha';
  else texto = liquido === 1 ? '1 sucesso' : `${liquido} sucessos`;
  return { dados, dificuldade, sucessos: critica ? 0 : liquido, critica, texto, usouFv };
}

export function rolar(n: number, dificuldade: number, usouFv = false): Resultado {
  return avaliar(rolarD10(Math.max(n, 0)), dificuldade, usouFv);
}

export function classeDado(d: number, dificuldade: number): string {
  if (d === 1) return 'die one';
  if (d >= dificuldade) return 'die succ';
  return 'die';
}
