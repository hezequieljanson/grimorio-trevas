import { Ficha, nomeTraco, penalidadeAtual, slug, todasHabilidades, todosAtributos, valorParaRolagem, virtudesDe } from './ficha';
import { Criatura, Linha } from './models';

/** Algo com que o rolador pode trabalhar: uma criatura do bestiário ou uma ficha. */
export interface Alvo {
  tipo: 'criatura' | 'ficha';
  id: string;
  nome: string;
  subtitulo: string;
  /** Traços com número, para montar rolagens livres. */
  tracos: { nome: string; valor: number }[];
  rolagens: RolagemAlvo[];
  poderes: { nome: string; desc: string }[];
  avisos: string[];
}

export interface RolagemAlvo {
  nome: string;
  formula: string;
  dados: number;
  dificuldade: number;
  nota?: string;
}

/** Primeiro número de um texto ("3+" → 3). Em faixas ("1–3") usa o maior. */
export function numero(v: string | number | undefined): number | null {
  if (typeof v === 'number') return v;
  if (!v) return null;
  const nums = String(v).match(/\d+/g);
  if (!nums) return null;
  const faixa = /\d+\s*[–-]\s*\d+/.test(String(v));
  return faixa ? Math.max(...nums.map(Number)) : Number(nums[0]);
}

function chave(t: string): string {
  return slug(t).replace(/-/g, ' ');
}

/** "Briga 1–3, Esquiva 1" → mapa nome → valor. */
export function lerHabilidades(texto?: string): Map<string, { nome: string; valor: number; faixa: boolean }> {
  const m = new Map<string, { nome: string; valor: number; faixa: boolean }>();
  if (!texto) return m;
  for (const parte of texto.split(/[,;]/)) {
    const r = parte.trim().match(/^(.+?)\s+(\d+(?:\s*[–-]\s*\d+)?)\b/);
    if (!r) continue;
    const v = numero(r[2]);
    if (v != null) m.set(chave(r[1]), { nome: r[1].trim(), valor: v, faixa: /[–-]/.test(r[2]) });
  }
  return m;
}

const ROLAGEM_NO_TEXTO = /([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+(?: [\p{L}]+)?)\s*\+\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+(?: (?:de|com|da|do) [\p{L}]+)?)[^.;]*?dif\.?\s*(\d+)/gu;

export function alvoDeCriatura(c: Criatura): Alvo {
  const avisos: string[] = [];
  const atr = new Map<string, { nome: string; valor: number }>();
  for (const [k, v] of Object.entries(c.atributos ?? {})) {
    const n = numero(v);
    if (n != null && k !== 'Todos') atr.set(chave(k), { nome: k, valor: n });
  }
  const hab = lerHabilidades(c.habilidades);
  if ([...hab.values()].some((h) => h.faixa) || Object.values(c.atributos ?? {}).some((v) => /\d\s*\+|[–-]/.test(String(v)))) {
    avisos.push('O livro dá faixas ou mínimos ("3+", "1–3"). Usei o maior valor; ajuste os dados se quiser um capanga mais fraco.');
  }
  const tracos: { nome: string; valor: number }[] = [];
  for (const [k, v] of Object.entries(c.tracos ?? {})) {
    const n = typeof v === 'number' ? v : /^\s*\d+\s*$/.test(String(v)) ? Number(v) : null;
    if (n != null && !['Antecedentes', 'Essência', 'Vitalidade', 'Geração'].includes(k)) tracos.push({ nome: k, valor: n });
  }

  const a = (n: string) => atr.get(chave(n))?.valor;
  const h = (n: string) => hab.get(chave(n))?.valor ?? 0;
  const rolagens: RolagemAlvo[] = [];
  const add = (nome: string, x: string, y: string | null, dif: number, nota?: string) => {
    const vx = a(x);
    if (vx == null) return;
    const vy = y ? h(y) : 0;
    rolagens.push({ nome, formula: y ? `${x} + ${y}` : x, dados: vx + vy, dificuldade: dif, nota });
  };
  add('Ataque desarmado', 'Destreza', 'Briga', 6);
  if (hab.has('armas brancas')) add('Ataque com arma branca', 'Destreza', 'Armas Brancas', 6);
  if (hab.has('armas de fogo')) add('Tiro', 'Destreza', 'Armas de Fogo', 6);
  add('Esquiva', 'Destreza', 'Esquiva', 6);
  add('Perceber algo', 'Percepção', 'Prontidão', 6);
  const garras = c.poderes.some((p) => /garra|presa/i.test(p.nome));
  const forca = a('Força');
  if (forca != null) {
    rolagens.push({ nome: garras ? 'Dano de garras/presas' : 'Dano desarmado', formula: garras ? 'Força + 1 (agravado)' : 'Força (contusão)', dados: forca + (garras ? 1 : 0), dificuldade: 6 });
  }
  if (hab.has('intimidacao')) add('Intimidar', 'Manipulação', 'Intimidação', 7);
  if (hab.has('furtividade')) add('Esgueirar-se', 'Destreza', 'Furtividade', 6);

  for (const t of tracos) {
    rolagens.push({ nome: `Teste de ${t.nome}`, formula: t.nome, dados: t.valor, dificuldade: 6, nota: 'Dificuldade conforme a cena' });
  }

  // Rolagens escritas nos poderes: "Carisma + Intimidação (dif. 8)"
  const nomesConhecidos = new Map<string, number>();
  for (const x of atr.values()) nomesConhecidos.set(chave(x.nome), x.valor);
  for (const [k, x] of hab) nomesConhecidos.set(k, x.valor);
  for (const t of tracos) nomesConhecidos.set(chave(t.nome), t.valor);
  for (const p of c.poderes) {
    for (const m of p.desc.matchAll(ROLAGEM_NO_TEXTO)) {
      const v1 = nomesConhecidos.get(chave(m[1]));
      const v2 = nomesConhecidos.get(chave(m[2])) ?? (atr.size ? 0 : undefined);
      if (v1 == null || v2 == null) continue;
      rolagens.push({ nome: p.nome, formula: `${m[1]} + ${m[2]}`, dados: v1 + v2, dificuldade: Number(m[3]) });
    }
  }

  if (!rolagens.length) avisos.push('O livro não traz números para esta criatura. Use “Rolagem livre” com a parada que o narrador definir.');

  const lista = [...atr.values()].map((x) => ({ nome: x.nome, valor: x.valor }));
  for (const x of hab.values()) lista.push({ nome: x.nome, valor: x.valor });
  return {
    tipo: 'criatura',
    id: c.id,
    nome: c.nome,
    subtitulo: `${c.categoria}${c.pagina ? ' · p. ' + c.pagina : ''}`,
    tracos: [...lista, ...tracos],
    rolagens,
    poderes: c.poderes,
    avisos,
  };
}

export function alvoDeFicha(f: Ficha, l: Linha): Alvo {
  const pen = penalidadeAtual(f, l);
  const avisos: string[] = [];
  if (pen === null) avisos.push('Incapacitado: o personagem não pode agir.');
  else if (pen) avisos.push(`Penalidade de ferimento já aplicada: ${pen} dados.`);
  const p = pen ?? 0;
  const v = (k: string) => valorParaRolagem(f, l, k);
  const tem = (k: string) => todosAtributos(l).some((a) => 'atr:' + a.id === k) || todasHabilidades(l).some((h) => 'hab:' + h.id === k);
  const rolagens: RolagemAlvo[] = [];
  const add = (nome: string, tracos: string[], dif: number, comPenalidade = true) => {
    if (!tracos.every((t) => tem(t) || ['fv', 'furia', 'gnose'].includes(t) || t.startsWith('vir:'))) return;
    const soma = tracos.reduce((s, t) => s + v(t), 0);
    rolagens.push({ nome, formula: tracos.map((t) => nomeTraco(l, t)).join(' + '), dados: Math.max(0, soma + (comPenalidade ? p : 0)), dificuldade: dif });
  };
  for (const r of f.rolagens) add(r.nome, r.tracos, r.dificuldade);
  add('Ataque desarmado', ['atr:destreza', 'hab:briga'], 6);
  add('Ataque com arma branca', ['atr:destreza', 'hab:armas-brancas'], 6);
  add('Tiro', ['atr:destreza', 'hab:armas-de-fogo'], 6);
  add('Esquiva', ['atr:destreza', 'hab:esquiva'], 6);
  add('Perceber algo', ['atr:percepcao', 'hab:prontidao'], 6);
  add('Dano desarmado', ['atr:forca'], 6, false);
  if (l.tipo === 'lobisomem') {
    add('Mudar de forma', ['atr:vigor', 'hab:instinto-primitivo'], l.formas?.find((x) => x.id === f.estado.forma)?.dificuldade ?? 6);
    add('Teste de Fúria', ['furia'], l.luas?.[f.estado.lua]?.dificuldade ?? 6, false);
    add('Teste de Gnose', ['gnose'], 6, false);
  } else {
    const [, v2] = virtudesDe(l, f);
    if (v2) add(`Resistir ao frenesi (${v2})`, ['vir:' + slug(v2)], 6, false);
  }
  add('Força de Vontade', ['fv'], 6, false);

  const tracos = [
    ...todosAtributos(l).map((a) => ({ nome: a.nome, valor: v('atr:' + a.id) })),
    ...todasHabilidades(l).map((h) => ({ nome: h.nome, valor: v('hab:' + h.id) })).filter((x) => x.valor > 0),
    { nome: 'Força de Vontade', valor: v('fv') },
  ];
  const poderes = [
    ...(l.disciplinas ?? []).filter((d) => v('dis:' + d.id) > 0).map((d) => ({ nome: `${d.nome} ${v('dis:' + d.id)}`, desc: d.desc })),
    ...(l.dons ?? []).filter((d) => v('dom:' + d.id) > 0).map((d) => ({ nome: d.nome, desc: d.sistema })),
    ...(l.numina ?? []).filter((n) => v('num:' + n.id) > 0).map((n) => ({ nome: `${n.nome} ${v('num:' + n.id)}`, desc: `${n.rolagem}. ${n.desc}` })),
  ];
  return { tipo: 'ficha', id: f.id, nome: f.nome || 'Sem nome', subtitulo: l.nome, tracos, rolagens, poderes, avisos };
}
