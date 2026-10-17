import { Linha, LinhaId, Numina } from './models';

export type GrupoAtributo = 'fisicos' | 'sociais' | 'mentais';
export type GrupoHabilidade = 'talentos' | 'pericias' | 'conhecimentos';
export type TipoDano = 'c' | 'l' | 'a'; // contusão, letal, agravado

/**
 * Chaves dos traços: 'atr:forca', 'hab:briga', 'dis:potencia', 'ant:recursos',
 * 'vir:consciencia', 'dom:garras-afiadas', 'num:adivinhacoes',
 * e as especiais 'trilha', 'fv', 'furia', 'gnose'.
 */
export interface Ficha {
  id: string;
  linha: LinhaId;
  criadaEm: string;
  atualizadaEm: string;
  criacaoConcluida: boolean;
  passo: number;

  nome: string;
  jogador: string;
  cronica: string;
  conceito: string;
  natureza: string;
  comportamento: string;

  cla?: string;
  trilha?: string;
  refugio?: string;
  senhor?: string;
  raca?: string;
  auspicio?: string;
  tribo?: string;
  organizacao?: string;
  motivo?: string;
  metodo?: string;
  /** Os 3 Dons iniciais do Garou: um da raça, um do augúrio e um da tribo. */
  donsIniciais?: { raca?: string; auspicio?: string; tribo?: string };

  prioridadeAtributos: GrupoAtributo[];
  prioridadeHabilidades: GrupoHabilidade[];
  /** Pontos distribuídos na criação (antes dos pontos de bônus). */
  base: Record<string, number>;
  /** Pontos comprados com pontos de bônus. */
  bonus: Record<string, number>;
  /** Pontos comprados com XP depois da criação. */
  xpComprado: Record<string, number>;
  qualidades: string[];

  estado: {
    dano: TipoDano[];
    sangue: number;
    fv: number;
    furia: number;
    gnose: number;
    forma: string;
    lua: number;
  };
  renome: { gloria: number; honra: number; sabedoria: number; gloriaT: number; honraT: number; sabedoriaT: number };
  posto: number;
  xp: { total: number; log: { data: string; item: string; de: number; para: number; custo: number }[] };
  rolagens: { id: string; nome: string; tracos: string[]; dificuldade: number }[];
  anotacoes: string;
}

export function slug(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function novaFicha(id: string, linha: Linha): Ficha {
  const agora = new Date().toISOString();
  const f: Ficha = {
    id,
    linha: linha.id,
    criadaEm: agora,
    atualizadaEm: agora,
    criacaoConcluida: false,
    passo: 0,
    nome: '',
    jogador: '',
    cronica: '',
    conceito: '',
    natureza: '',
    comportamento: '',
    prioridadeAtributos: ['fisicos', 'sociais', 'mentais'],
    prioridadeHabilidades: ['talentos', 'pericias', 'conhecimentos'],
    base: {},
    bonus: {},
    xpComprado: {},
    qualidades: [],
    estado: { dano: [], sangue: 0, fv: 0, furia: 0, gnose: 0, forma: 'hominideo', lua: 2 },
    renome: { gloria: 0, honra: 0, sabedoria: 0, gloriaT: 0, honraT: 0, sabedoriaT: 0 },
    posto: 1,
    xp: { total: 0, log: [] },
    rolagens: [],
    anotacoes: '',
  };
  for (const g of ['fisicos', 'sociais', 'mentais'] as const) {
    for (const a of linha.atributos[g]) f.base['atr:' + a.id] = 1;
  }
  if (linha.tipo !== 'lobisomem') {
    for (const v of virtudesDe(linha, f)) f.base['vir:' + slug(v)] = 1;
  }
  return f;
}

// ---------- leitura de valores ----------

export function valor(f: Ficha, chave: string, linha?: Linha): number {
  const base = chave in f.base ? f.base[chave] : derivadoBase(f, chave, linha);
  return base + (f.bonus[chave] ?? 0) + (f.xpComprado[chave] ?? 0);
}

/** Valor só da criação (base + bônus), sem XP. */
export function valorCriacao(f: Ficha, chave: string, linha?: Linha): number {
  const base = chave in f.base ? f.base[chave] : derivadoBase(f, chave, linha);
  return base + (f.bonus[chave] ?? 0);
}

/** Traços que nascem de outros: Humanidade/Trilha, FV, Fúria, Gnose. */
export function derivadoBase(f: Ficha, chave: string, linha?: Linha): number {
  if (!linha) return 0;
  if (linha.tipo === 'lobisomem') {
    if (chave === 'furia') return linha.auspicios?.find((a) => a.id === f.auspicio)?.furia ?? 0;
    if (chave === 'gnose') return linha.racas?.find((r) => r.id === f.raca)?.gnose ?? 0;
    if (chave === 'fv') return linha.tribos?.find((t) => t.id === f.tribo)?.forcaVontade ?? 0;
    return 0;
  }
  const [v1, v2, v3] = virtudesDe(linha, f).map((v) => f.base['vir:' + slug(v)] ?? 1);
  if (chave === 'trilha') return v1 + v2;
  if (chave === 'fv') return v3;
  return 0;
}

export function virtudesDe(linha: Linha, f: Ficha): string[] {
  const t = linha.trilhas?.find((x) => x.id === f.trilha) ?? linha.trilhas?.[0];
  return t ? [...t.virtudes] : ['Consciência', 'Autocontrole', 'Coragem'];
}

export function nomeTrilha(linha: Linha, f: Ficha): string {
  const t = linha.trilhas?.find((x) => x.id === f.trilha) ?? linha.trilhas?.[0];
  return t?.nome ?? 'Humanidade';
}

// ---------- pontos da criação ----------

export interface ContaPontos {
  gasto: number;
  total: number;
}

export function pontosAtributos(f: Ficha, linha: Linha, g: GrupoAtributo): ContaPontos {
  const idx = f.prioridadeAtributos.indexOf(g);
  const total = linha.criacao.atributos[idx];
  const gasto = linha.atributos[g].reduce((s, a) => s + (f.base['atr:' + a.id] ?? 1) - minimoAtributo(f, linha, a.id), 0);
  return { gasto, total };
}

export function minimoAtributo(f: Ficha, linha: Linha, id: string): number {
  return aparenciaZero(f, linha) && id === 'aparencia' ? 0 : 1;
}

export function aparenciaZero(f: Ficha, linha: Linha): boolean {
  return linha.tipo === 'vampiro' && (f.cla ?? '').startsWith('nosferatu');
}

export function pontosHabilidades(f: Ficha, linha: Linha, g: GrupoHabilidade): ContaPontos {
  const idx = f.prioridadeHabilidades.indexOf(g);
  const total = linha.criacao.habilidades[idx];
  const gasto = linha.habilidades[g].reduce((s, h) => s + (f.base['hab:' + h.id] ?? 0), 0);
  return { gasto, total };
}

export function somaPrefixo(f: Ficha, prefixo: string, menos = 0): number {
  return Object.entries(f.base)
    .filter(([k]) => k.startsWith(prefixo))
    .reduce((s, [, v]) => s + v - menos, 0);
}

export function pontosVirtudes(f: Ficha, linha: Linha): ContaPontos {
  const total = linha.tipo === 'lobisomem' ? 0 : 7;
  return { gasto: somaPrefixo(f, 'vir:', 1), total };
}

export function pontosDisciplinas(f: Ficha, linha: Linha): ContaPontos {
  return { gasto: somaPrefixo(f, 'dis:'), total: linha.pontosDisciplina ?? 3 };
}

export function pontosAntecedentes(f: Ficha, linha: Linha): ContaPontos {
  return { gasto: somaPrefixo(f, 'ant:'), total: linha.criacao.antecedentes };
}

export function donsIniciais(f: Ficha): ContaPontos {
  return { gasto: Object.keys(f.base).filter((k) => k.startsWith('dom:')).length, total: 3 };
}

// ---------- pontos de bônus ----------

export function custoNuminaBonus(n: Numina | undefined, regrasCasa: Record<string, number>): number {
  if (!n) return 7;
  if (n.custoBonus != null) return n.custoBonus;
  return regrasCasa['numina-mesa-bonus'] ?? 7;
}

export function custoBonusChave(chave: string, linha: Linha, regrasCasa: Record<string, number>): number {
  const c = linha.criacao.custosBonus;
  const pick = (...nomes: string[]) => {
    for (const n of nomes) if (c[n] != null) return c[n];
    return 1;
  };
  if (chave.startsWith('atr:')) return pick('atributo');
  if (chave.startsWith('hab:')) return pick('habilidade');
  if (chave.startsWith('dis:')) return pick('disciplina');
  if (chave.startsWith('ant:')) return pick('antecedente');
  if (chave.startsWith('vir:')) return pick('virtude');
  if (chave.startsWith('dom:')) return pick('dom');
  if (chave.startsWith('num:')) return custoNuminaBonus(linha.numina?.find((n) => 'num:' + n.id === chave), regrasCasa);
  if (chave === 'trilha') return pick('humanidade', 'trilha', 'estrada');
  if (chave === 'fv') return pick('forcaVontade', 'fv');
  if (chave === 'furia') return pick('furia');
  if (chave === 'gnose') return pick('gnose');
  return 1;
}

export function custoQualidades(f: Ficha, linha: Linha): { qualidades: number; defeitos: number } {
  let q = 0;
  let d = 0;
  for (const id of f.qualidades) {
    const item = linha.qualidades.find((x) => x.id === id);
    if (!item) continue;
    const c = item.custo[0] ?? 0;
    if (item.defeito) d += c;
    else q += c;
  }
  return { qualidades: q, defeitos: d };
}

export function bonusGasto(f: Ficha, linha: Linha, regrasCasa: Record<string, number>): { gasto: number; total: number } {
  let gasto = 0;
  for (const [k, n] of Object.entries(f.bonus)) gasto += n * custoBonusChave(k, linha, regrasCasa);
  const { qualidades, defeitos } = custoQualidades(f, linha);
  const maxDef = linha.criacao.maxDefeitos ?? 7;
  gasto += qualidades;
  return { gasto, total: linha.criacao.bonus + Math.min(defeitos, maxDef) };
}

// ---------- checagens ----------

export interface Checagem {
  ok: boolean;
  texto: string;
}

export function checagens(f: Ficha, linha: Linha, regrasCasa: Record<string, number>): Checagem[] {
  const out: Checagem[] = [];
  const restam = (c: ContaPontos) => c.total - c.gasto;
  const atr = (['fisicos', 'sociais', 'mentais'] as const).map((g) => restam(pontosAtributos(f, linha, g)));
  out.push({ ok: atr.every((r) => r === 0), texto: `Atributos ${linha.criacao.atributos.join('/')} distribuídos` });
  const hab = (['talentos', 'pericias', 'conhecimentos'] as const).map((g) => restam(pontosHabilidades(f, linha, g)));
  out.push({ ok: hab.every((r) => r === 0), texto: `Habilidades ${linha.criacao.habilidades.join('/')} distribuídas` });
  const acima = Object.entries(f.base).filter(([k, v]) => k.startsWith('hab:') && v > linha.criacao.maxHabilidade);
  out.push({ ok: acima.length === 0, texto: `Nenhuma Habilidade acima de ${linha.criacao.maxHabilidade} antes do bônus` });
  const ant = restam(pontosAntecedentes(f, linha));
  out.push({ ok: ant === 0, texto: ant > 0 ? `Antecedentes: faltam ${ant} pontos` : 'Antecedentes distribuídos' });
  if (linha.tipo === 'vampiro') {
    const d = restam(pontosDisciplinas(f, linha));
    out.push({ ok: d === 0, texto: d > 0 ? `Disciplinas: faltam ${d} pontos` : 'Disciplinas distribuídas' });
  }
  if (linha.tipo !== 'lobisomem') {
    const v = restam(pontosVirtudes(f, linha));
    out.push({ ok: v === 0, texto: v > 0 ? `Virtudes: faltam ${v} pontos` : 'Virtudes distribuídas' });
  } else {
    const d = restam(donsIniciais(f));
    out.push({ ok: d === 0, texto: d > 0 ? `Dons iniciais: faltam ${d}` : '3 Dons iniciais escolhidos' });
    out.push({ ok: !!(f.raca && f.auspicio && f.tribo), texto: 'Raça, augúrio e tribo escolhidos' });
  }
  if (linha.tipo === 'vampiro') out.push({ ok: !!f.cla, texto: 'Clã escolhido' });
  const b = bonusGasto(f, linha, regrasCasa);
  out.push({ ok: b.gasto <= b.total, texto: b.gasto > b.total ? `Pontos de bônus passaram ${b.gasto - b.total} do limite` : `Pontos de bônus: ${b.total - b.gasto} sobrando` });
  out.push({ ok: !!f.nome.trim(), texto: 'Personagem tem nome' });
  return out;
}

// ---------- vitalidade ----------

export function penalidadeAtual(f: Ficha, linha: Linha): number | null {
  const n = f.estado.dano.length;
  if (n === 0) return 0;
  const nivel = linha.vitalidade[Math.min(n, linha.vitalidade.length) - 1];
  return nivel ? nivel.penalidade : null;
}

export function nivelVitalidade(f: Ficha, linha: Linha): string {
  const n = f.estado.dano.length;
  if (n === 0) return 'Sem ferimentos';
  if (n > linha.vitalidade.length) return 'Além de Incapacitado';
  return linha.vitalidade[n - 1].nome;
}

// ---------- geração ----------

export function geracaoDe(f: Ficha, linha: Linha): number {
  const padrao = linha.geracaoPadrao ?? 13;
  const pontos = valor(f, 'ant:geracao', linha);
  return padrao - pontos;
}

export function reservaSangue(f: Ficha, linha: Linha): { max: number; porTurno: number } {
  const g = geracaoDe(f, linha);
  const linhaG = linha.geracoes?.find((x) => x.geracao === g);
  return { max: linhaG?.sangue ?? 10, porTurno: linhaG?.porTurno ?? 1 };
}

// ---------- formas (Lobisomem) ----------

export function atributoNaForma(f: Ficha, linha: Linha, idAtributo: string): { valor: number; delta: number } {
  const base = valor(f, 'atr:' + idAtributo, linha);
  const forma = linha.formas?.find((x) => x.id === f.estado.forma);
  const nomeAttr = todosAtributos(linha).find((a) => a.id === idAtributo)?.nome ?? idAtributo;
  const m = forma ? (forma.mod[nomeAttr] ?? forma.mod[idAtributo]) : undefined;
  if (m === 'zero') return { valor: 0, delta: -base };
  const delta = typeof m === 'number' ? m : 0;
  return { valor: Math.max(0, base + delta), delta };
}

export function todosAtributos(linha: Linha) {
  return [...linha.atributos.fisicos, ...linha.atributos.sociais, ...linha.atributos.mentais];
}

export function todasHabilidades(linha: Linha) {
  return [...linha.habilidades.talentos, ...linha.habilidades.pericias, ...linha.habilidades.conhecimentos];
}

/** Valor de um traço para montar parada de dados, já considerando a forma do Garou. */
export function valorParaRolagem(f: Ficha, linha: Linha, chave: string): number {
  if (chave.startsWith('atr:') && linha.tipo === 'lobisomem') return atributoNaForma(f, linha, chave.slice(4)).valor;
  return valor(f, chave, linha);
}

export function nomeTraco(linha: Linha, chave: string): string {
  const [pre, id] = chave.split(':');
  if (pre === 'atr') return todosAtributos(linha).find((a) => a.id === id)?.nome ?? id;
  if (pre === 'hab') return todasHabilidades(linha).find((a) => a.id === id)?.nome ?? id;
  if (pre === 'dis') return linha.disciplinas?.find((a) => a.id === id)?.nome ?? id;
  if (pre === 'ant') return linha.antecedentes.find((a) => a.id === id)?.nome ?? id;
  if (pre === 'vir') return id.charAt(0).toUpperCase() + id.slice(1);
  if (chave === 'fv') return 'Força de Vontade';
  if (chave === 'furia') return 'Fúria';
  if (chave === 'gnose') return 'Gnose';
  if (chave === 'trilha') return 'Humanidade/Trilha';
  return chave;
}
