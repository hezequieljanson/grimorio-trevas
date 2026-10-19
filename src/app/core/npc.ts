import { RolagemAlvo, lerHabilidades, numero } from './alvo';
import { slug } from './ficha';
import { Criatura, Geradores, Linha, LinhaId } from './models';

// Gerador de NPC: tudo que dá para escolher antes de rolar, os perfis, os papéis
// e as listas de aparência e motivação (texto próprio, não é do livro).

export type TipoNpc = 'vampiro' | 'carnical' | 'cacador' | 'lobisomem' | 'mortal' | 'bestiario';
export type PoderNpc = 'capanga' | 'neofito' | 'anciao';
export type PerfilId = 'equilibrado' | 'combate' | 'social' | 'erudito' | 'furtivo';
export type AtitudeId = 'aliado' | 'neutro' | 'rival' | 'inimigo';
export type ParteNpc = 'nome' | 'linhagem' | 'atributos' | 'poderes' | 'personalidade' | 'historia' | 'aparencia';
type Grupo = 'fisicos' | 'sociais' | 'mentais';

export interface OpcoesNpc {
  tipo: TipoNpc;
  poder: PoderNpc;
  epoca: 'moderno' | 'medieval';
  papel: string;
  perfil: PerfilId;
  /** Clã, tribo ou organização ('' = aleatório). */
  grupo: string;
  /** Filtro de seita para vampiros ('' = qualquer). */
  seita: string;
  auspicio: string;
  raca: string;
  /** Chaves de poder obrigatórias: 'dis:potencia', 'dom:garras', 'num:telepatia'. */
  poderes: string[];
  /** Atributos fixados à mão (id → valor). */
  atributos: Record<string, number>;
  atitude: AtitudeId | '';
  quantidade: number;
  criatura: string;
}

export const OPCOES_PADRAO: OpcoesNpc = {
  tipo: 'vampiro',
  poder: 'neofito',
  epoca: 'moderno',
  papel: '',
  perfil: 'equilibrado',
  grupo: '',
  seita: '',
  auspicio: '',
  raca: '',
  poderes: [],
  atributos: {},
  atitude: '',
  quantidade: 1,
  criatura: '',
};

export interface TracoNpc {
  id: string;
  nome: string;
  valor: number;
}

export interface PoderGerado {
  /** Chave da ficha ('dis:potencia'), quando vem de um livro. */
  chave?: string;
  nome: string;
  nivel?: number;
  desc?: string;
  aba?: 'disciplinas' | 'dons' | 'numina';
}

export interface NpcGerado {
  id: string;
  criadoEm: string;
  tipo: TipoNpc;
  poder: PoderNpc;
  epoca: 'moderno' | 'medieval';
  linhaId: LinhaId | null;
  linha: string;
  lider: boolean;

  nome: string;
  grupo: string;
  grupoId: string;
  auspicioId: string;
  racaId: string;
  papel: string;
  perfil: PerfilId;

  natureza: string;
  comportamento: string;
  jeito: string;

  atributos: TracoNpc[];
  habilidades: TracoNpc[];
  /** Força de Vontade, Fúria, Gnose, Sangue, Geração… */
  extras: TracoNpc[];
  poderes: PoderGerado[];

  atitude: AtitudeId;
  motivacao: string;
  segredo: string;
  gancho: string;

  aparencia: { idade: string; roupa: string; detalhe: string; abraco: string };
  notas: string[];
}

// ---------- perfis ----------

export interface Perfil {
  id: PerfilId;
  nome: string;
  desc: string;
  ordem: Grupo[] | null;
  atributos: string[];
  habilidades: string[];
  disciplinas: string[];
}

export const PERFIS: Perfil[] = [
  { id: 'equilibrado', nome: 'Equilibrado', desc: 'Sorteio livre, como antes', ordem: null, atributos: [], habilidades: [], disciplinas: [] },
  {
    id: 'combate',
    nome: 'Combate',
    desc: 'Físicos primeiro, Briga, Armas, Esquiva',
    ordem: ['fisicos', 'mentais', 'sociais'],
    atributos: ['forca', 'destreza', 'vigor', 'raciocinio', 'percepcao'],
    habilidades: ['briga', 'armas-brancas', 'armas-de-fogo', 'arqueirismo', 'esquiva', 'esportes', 'prontidao', 'intimidacao'],
    disciplinas: ['potencia', 'rapidez', 'fortitude', 'metamorfose', 'vicissitude', 'quietus'],
  },
  {
    id: 'social',
    nome: 'Social',
    desc: 'Sociais primeiro, Lábia, Etiqueta, Liderança',
    ordem: ['sociais', 'mentais', 'fisicos'],
    atributos: ['carisma', 'manipulacao', 'aparencia', 'raciocinio'],
    habilidades: ['labia', 'etiqueta', 'protocolo', 'empatia', 'lideranca', 'expressao', 'manha', 'intimidacao', 'performance', 'representacao', 'interpretacao', 'atuacao', 'politica'],
    disciplinas: ['presenca', 'dominacao', 'quimerismo', 'auspicios', 'serpentis'],
  },
  {
    id: 'erudito',
    nome: 'Erudito',
    desc: 'Mentais primeiro, Ocultismo, Investigação',
    ordem: ['mentais', 'sociais', 'fisicos'],
    atributos: ['inteligencia', 'percepcao', 'raciocinio'],
    habilidades: ['ocultismo', 'investigacao', 'academicos', 'instrucao', 'ciencia', 'medicina', 'linguistica', 'direito', 'enigmas', 'rituais', 'computador', 'financas', 'sabedoria-popular', 'herborismo'],
    disciplinas: ['taumaturgia', 'auspicios', 'necromancia', 'mortis', 'demencia', 'daimoinon'],
  },
  {
    id: 'furtivo',
    nome: 'Furtivo',
    desc: 'Destreza, Furtividade, Prontidão',
    ordem: ['fisicos', 'mentais', 'sociais'],
    atributos: ['destreza', 'percepcao', 'raciocinio', 'manipulacao'],
    habilidades: ['furtividade', 'seguranca', 'crime', 'manha', 'prontidao', 'esquiva', 'disfarce', 'conducao', 'investigacao', 'armas-brancas'],
    disciplinas: ['ofuscacao', 'rapidez', 'animalismo', 'tenebrosidade', 'auspicios', 'quietus'],
  },
];

// ---------- papéis na história ----------

export interface Papel {
  id: string;
  nome: string;
  perfil: PerfilId;
  poder: PoderNpc;
  /** Só aparece nesta época, quando definido. */
  epoca?: 'moderno' | 'medieval';
}

export const PAPEIS: Partial<Record<TipoNpc, Papel[]>> = {
  vampiro: [
    { id: 'principe', nome: 'Príncipe', perfil: 'social', poder: 'anciao', epoca: 'moderno' },
    { id: 'senhor-feudal', nome: 'Senhor Cainita', perfil: 'social', poder: 'anciao', epoca: 'medieval' },
    { id: 'primogeno', nome: 'Primógeno', perfil: 'erudito', poder: 'anciao' },
    { id: 'xerife', nome: 'Xerife', perfil: 'combate', poder: 'anciao', epoca: 'moderno' },
    { id: 'flagelo', nome: 'Flagelo', perfil: 'combate', poder: 'neofito', epoca: 'moderno' },
    { id: 'harpia', nome: 'Harpia', perfil: 'social', poder: 'neofito', epoca: 'moderno' },
    { id: 'guardiao-elisio', nome: 'Guardião do Elísio', perfil: 'combate', poder: 'neofito', epoca: 'moderno' },
    { id: 'anarquista', nome: 'Anarquista', perfil: 'combate', poder: 'neofito', epoca: 'moderno' },
    { id: 'bispo', nome: 'Bispo do Sabá', perfil: 'erudito', poder: 'anciao', epoca: 'moderno' },
    { id: 'cavaleiro', nome: 'Cavaleiro Cainita', perfil: 'combate', poder: 'neofito', epoca: 'medieval' },
    { id: 'cortesao', nome: 'Cortesão', perfil: 'social', poder: 'neofito', epoca: 'medieval' },
    { id: 'informante', nome: 'Espião', perfil: 'furtivo', poder: 'neofito' },
    { id: 'recem', nome: 'Recém-Abraçado', perfil: 'equilibrado', poder: 'capanga' },
  ],
  carnical: [
    { id: 'guarda-costas', nome: 'Guarda-costas', perfil: 'combate', poder: 'neofito' },
    { id: 'mordomo', nome: 'Mordomo', perfil: 'social', poder: 'neofito' },
    { id: 'informante', nome: 'Informante', perfil: 'furtivo', poder: 'capanga' },
    { id: 'capanga', nome: 'Capanga', perfil: 'combate', poder: 'capanga' },
  ],
  lobisomem: [
    { id: 'alfa', nome: 'Alfa da matilha', perfil: 'combate', poder: 'anciao' },
    { id: 'guardiao', nome: 'Guardião do caern', perfil: 'combate', poder: 'neofito' },
    { id: 'xama', nome: 'Xamã (Theurge)', perfil: 'erudito', poder: 'neofito' },
    { id: 'contador', nome: 'Contador de histórias', perfil: 'social', poder: 'neofito' },
    { id: 'batedor', nome: 'Batedor', perfil: 'furtivo', poder: 'neofito' },
    { id: 'filhote', nome: 'Filhote', perfil: 'equilibrado', poder: 'capanga' },
  ],
  cacador: [
    { id: 'lider', nome: 'Líder da célula', perfil: 'social', poder: 'anciao' },
    { id: 'pesquisador', nome: 'Pesquisador', perfil: 'erudito', poder: 'neofito' },
    { id: 'atirador', nome: 'Atirador', perfil: 'combate', poder: 'neofito' },
    { id: 'infiltrado', nome: 'Infiltrado', perfil: 'furtivo', poder: 'neofito' },
    { id: 'novato', nome: 'Novato', perfil: 'equilibrado', poder: 'capanga' },
  ],
  mortal: [
    { id: 'policial', nome: 'Policial', perfil: 'combate', poder: 'neofito', epoca: 'moderno' },
    { id: 'jornalista', nome: 'Jornalista', perfil: 'erudito', poder: 'neofito', epoca: 'moderno' },
    { id: 'criminoso', nome: 'Criminoso', perfil: 'furtivo', poder: 'neofito', epoca: 'moderno' },
    { id: 'medico', nome: 'Médico', perfil: 'erudito', poder: 'neofito', epoca: 'moderno' },
    { id: 'guarda', nome: 'Guarda da cidade', perfil: 'combate', poder: 'neofito', epoca: 'medieval' },
    { id: 'mercador', nome: 'Mercador', perfil: 'social', poder: 'neofito', epoca: 'medieval' },
    { id: 'padre', nome: 'Padre', perfil: 'social', poder: 'neofito' },
    { id: 'contato', nome: 'Contato', perfil: 'social', poder: 'capanga' },
    { id: 'capanga', nome: 'Capanga', perfil: 'combate', poder: 'capanga' },
  ],
};

export const ATITUDES: { id: AtitudeId; nome: string }[] = [
  { id: 'aliado', nome: 'Aliado' },
  { id: 'neutro', nome: 'Neutro' },
  { id: 'rival', nome: 'Rival' },
  { id: 'inimigo', nome: 'Inimigo' },
];

const MOTIVACOES: Record<AtitudeId, string[]> = {
  aliado: [
    'deve a vida a alguém do grupo e quer pagar a dívida',
    'tem o mesmo inimigo que vocês',
    'vê no grupo a chance de subir na hierarquia',
    'está apaixonado por alguém do grupo',
    'quer proteção e oferece informação em troca',
    'acredita que o grupo é o único que pode impedir uma desgraça',
  ],
  neutro: [
    'só quer ser deixado em paz para cuidar dos seus negócios',
    'vende o que sabe para quem pagar mais',
    'observa o grupo a mando de alguém mais poderoso',
    'tem um favor a pedir, mas ainda não confia em vocês',
    'aposta que o grupo vai cair e prefere não escolher lado',
  ],
  rival: [
    'quer o mesmo território ou refúgio que vocês',
    'disputa o favor do mesmo patrono',
    'foi humilhado por alguém do grupo em público',
    'acha que merecia o lugar que um de vocês ocupa',
    'coleciona segredos do grupo para usar na hora certa',
  ],
  inimigo: [
    'culpa o grupo pela morte de alguém próximo',
    'recebeu ordens de destruir vocês',
    'quer algo que um de vocês carrega',
    'serve a uma força maior que vê o grupo como ameaça',
    'precisa que o grupo leve a culpa de um crime que ele cometeu',
    'tem fome, e vocês estão no caminho',
  ],
};

const IDADES = ['jovem, uns 18 anos', 'vinte e poucos anos', 'uns 30 anos', 'quarentão', 'meia-idade, cabelo grisalho', 'velho, rosto marcado'];
const ROUPAS = {
  moderno: [
    'terno caro, impecável', 'jaqueta de couro gasta e coturno', 'moletom com capuz e tênis sujo', 'roupa social barata e amassada',
    'vestido de grife e muitas joias', 'uniforme de trabalho (segurança, enfermeiro, garçom)', 'roupas pretas góticas e maquiagem pesada',
    'camisa de banda e calça rasgada', 'sobretudo comprido mesmo no calor', 'roupa de academia e corrente de ouro',
  ],
  medieval: [
    'túnica de lã simples e capuz', 'manto de veludo com broche de prata', 'cota de malha sob a sobreveste', 'hábito de monge',
    'roupas de mercador, com bolsas no cinto', 'trapos de mendigo', 'vestido bordado de dama da corte', 'peles e couro de caçador',
  ],
};
const DETALHES = [
  'cicatriz atravessando o rosto', 'sotaque forte de outro lugar', 'cheiro de terra molhada', 'olhos de cores diferentes',
  'um dedo faltando', 'tatuagem que sobe pelo pescoço', 'voz rouca, quase um sussurro', 'sorriso largo demais',
  'mãos sempre geladas', 'anéis em todos os dedos', 'manca de uma perna', 'cabelo branco apesar da idade',
  'nunca pisca quando encara', 'risada alta e fora de hora', 'queimadura antiga num dos braços', 'unhas roídas até sangrar',
  'perfume doce e enjoativo', 'fala olhando para o chão', 'dentes perfeitos demais', 'pele pálida com veias aparentes',
];

// ---------- utilidades ----------

function sorteio<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}
function entre(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function embaralhar<T>(lista: T[]): T[] {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
/** Sorteia com peso: favoritos saem 3 vezes mais. */
function sorteioPeso<T extends { id: string }>(lista: T[], favoritos: string[]): T {
  const pesos = lista.map((x) => (favoritos.includes(x.id) ? 3 : 1));
  let r = Math.random() * pesos.reduce((s, p) => s + p, 0);
  for (let i = 0; i < lista.length; i++) {
    r -= pesos[i];
    if (r < 0) return lista[i];
  }
  return lista[lista.length - 1];
}
function novoIdNpc(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const PONTOS: Record<PoderNpc, [number, number, number]> = { capanga: [5, 3, 2], neofito: [7, 5, 3], anciao: [10, 8, 6] };
const NIVEIS_DIS: Record<PoderNpc, number[]> = { capanga: [1, 1, 0], neofito: [2, 1, 1], anciao: [4, 3, 3] };
const HAB: Record<PoderNpc, { fortes: [number, number]; qtd: number; outras: number }> = {
  capanga: { fortes: [1, 2], qtd: 3, outras: 2 },
  neofito: { fortes: [2, 3], qtd: 4, outras: 4 },
  anciao: { fortes: [3, 5], qtd: 5, outras: 6 },
};
const GERACAO: Record<PoderNpc, number> = { capanga: 13, neofito: 12, anciao: 8 };

export function linhaDoNpc(o: Pick<OpcoesNpc, 'tipo' | 'epoca'>): LinhaId {
  const med = o.epoca === 'medieval';
  if (o.tipo === 'lobisomem') return med ? 'lidt' : 'lob';
  if (o.tipo === 'cacador') return 'cac';
  if (o.tipo === 'mortal' && !med) return 'cac';
  return med ? 'vdta' : 'vtm';
}

export function subirPoder(p: PoderNpc): PoderNpc {
  return p === 'capanga' ? 'neofito' : 'anciao';
}

export function seitasDe(l: Linha): string[] {
  const s = new Set<string>();
  for (const c of l.clas ?? []) {
    for (const nome of ['Camarilla', 'Sabá', 'Independente']) if (c.seita.includes(nome)) s.add(nome);
  }
  return [...s];
}

/** Poderes que podem ser fixados antes de rolar, conforme o que já foi escolhido. */
export function poderesDisponiveis(l: Linha, o: OpcoesNpc): { chave: string; nome: string; doGrupo: boolean }[] {
  if (o.tipo === 'vampiro' || o.tipo === 'carnical') {
    const cla = l.clas?.find((c) => c.id === o.grupo);
    return (l.disciplinas ?? [])
      .map((d) => ({ chave: 'dis:' + d.id, nome: d.nome, doGrupo: !!cla?.disciplinas.includes(d.id) }))
      .sort((a, b) => Number(b.doGrupo) - Number(a.doGrupo) || a.nome.localeCompare(b.nome));
  }
  if (o.tipo === 'lobisomem') {
    const max = nivelMaxDom(o.poder);
    const grupos = [o.grupo, o.auspicio, o.raca].filter(Boolean);
    return (l.dons ?? [])
      .filter((d) => d.nivel <= max && (!grupos.length || d.grupos.some((g) => grupos.includes(g))))
      .map((d) => ({ chave: 'dom:' + d.id, nome: `${d.nome} (${d.nivel})`, doGrupo: true }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }
  if (o.tipo === 'cacador') return (l.numina ?? []).map((n) => ({ chave: 'num:' + n.id, nome: n.nome, doGrupo: true }));
  return [];
}

function nivelMaxDom(p: PoderNpc): number {
  return p === 'capanga' ? 1 : p === 'neofito' ? 2 : 4;
}

// ---------- gerar a partir de um livro ----------

export function gerarNpc(l: Linha, ger: Geradores, o: OpcoesNpc, nomesUsados: Set<string> = new Set()): NpcGerado {
  const p = o.poder;
  const perfil = PERFIS.find((x) => x.id === o.perfil) ?? PERFIS[0];
  const papel = (PAPEIS[o.tipo] ?? []).find((x) => x.id === o.papel);
  const notas: string[] = [];

  // linhagem
  let grupo = '';
  let grupoId = '';
  let auspicioId = '';
  let racaId = '';
  let poderes: PoderGerado[] = [];
  const extras: TracoNpc[] = [];
  const fixos = o.poderes;
  const nomeDis = (id: string) => l.disciplinas?.find((d) => d.id === id)?.nome ?? id;
  const descDis = (id: string) => l.disciplinas?.find((d) => d.id === id)?.desc;

  if (o.tipo === 'vampiro' || o.tipo === 'carnical') {
    let clas = (l.clas ?? []).filter((c) => c.disciplinas.length);
    if (o.seita) clas = clas.filter((c) => c.seita.includes(o.seita));
    const c = clas.find((x) => x.id === o.grupo) ?? (o.grupo ? undefined : clas.length ? sorteio(clas) : undefined) ?? l.clas?.find((x) => x.id === o.grupo);
    grupoId = c?.id ?? '';
    const fixDis = fixos.filter((k) => k.startsWith('dis:')).map((k) => k.slice(4));
    if (o.tipo === 'vampiro') {
      grupo = c?.nome ?? 'Caitiff';
      // disciplinas do clã primeiro, as favoritas do perfil puxam para cima; as fixadas entram na frente
      const doCla = c?.disciplinas ?? [];
      const ordenadas = [...doCla].sort((a, b) => Number(perfil.disciplinas.includes(b)) - Number(perfil.disciplinas.includes(a)));
      const lista = [...new Set([...fixDis, ...ordenadas])];
      const niveis = NIVEIS_DIS[p];
      poderes = lista
        .map((d, i) => ({ d, n: niveis[i] ?? (fixDis.includes(d) ? 1 : 0) }))
        .map((x) => (fixDis.includes(x.d) ? { ...x, n: Math.max(1, x.n) } : x))
        .filter((x) => x.n > 0)
        .map((x) => ({ chave: 'dis:' + x.d, nome: nomeDis(x.d), nivel: x.n, desc: descDis(x.d), aba: 'disciplinas' as const }));
      const g = GERACAO[p] + (l.epoca === 'medieval' ? -1 : 0);
      const ger2 = l.geracoes?.find((x) => x.geracao === g);
      extras.push({ id: 'geracao', nome: 'Geração', valor: g });
      if (ger2) extras.push({ id: 'sangue', nome: 'Sangue', valor: ger2.sangue });
      if (fixDis.some((d) => !doCla.includes(d))) notas.push('Tem uma Disciplina fora do clã: aprendeu com outro vampiro.');
    } else {
      grupo = c ? `Carniçal de ${c.nome}` : 'Carniçal';
      const d = fixDis[0] ?? (c ? sorteio(c.disciplinas) : 'potencia');
      poderes = [{ chave: 'dis:' + d, nome: nomeDis(d), nivel: p === 'anciao' ? 2 : 1, desc: descDis(d), aba: 'disciplinas' }];
      if (fixDis[1]) poderes.push({ chave: 'dis:' + fixDis[1], nome: nomeDis(fixDis[1]), nivel: 1, desc: descDis(fixDis[1]), aba: 'disciplinas' });
      extras.push({ id: 'sangue', nome: 'Sangue', valor: p === 'anciao' ? 3 : 1 });
    }
  } else if (o.tipo === 'lobisomem') {
    const tribo = l.tribos?.find((x) => x.id === o.grupo) ?? sorteio(l.tribos ?? []);
    const ausp = l.auspicios?.find((x) => x.id === o.auspicio) ?? (papel?.id === 'xama' ? l.auspicios?.find((x) => x.id === 'theurge') : undefined) ?? sorteio(l.auspicios ?? []);
    const raca = l.racas?.find((x) => x.id === o.raca) ?? sorteio(l.racas ?? []);
    grupoId = tribo?.id ?? '';
    auspicioId = ausp?.id ?? '';
    racaId = raca?.id ?? '';
    grupo = [tribo?.nome, ausp?.nome, raca?.nome].filter(Boolean).join(' · ');
    const max = nivelMaxDom(p);
    const dons = l.dons ?? [];
    const escolhidos = fixos.filter((k) => k.startsWith('dom:')).map((k) => dons.find((d) => 'dom:' + d.id === k)).filter((d) => !!d);
    const possiveis = embaralhar(dons.filter((d) => d.nivel <= max && d.grupos.some((g) => g === tribo?.id || g === ausp?.id || g === raca?.id)));
    const qtd = p === 'capanga' ? 2 : p === 'neofito' ? 3 : 5;
    for (const d of possiveis) {
      if (escolhidos.length >= qtd) break;
      if (!escolhidos.includes(d)) escolhidos.push(d);
    }
    poderes = escolhidos.map((d) => ({ chave: 'dom:' + d.id, nome: d.nome, nivel: d.nivel, desc: d.sistema, aba: 'dons' as const }));
    const bonus = p === 'anciao' ? 3 : 0;
    extras.push({ id: 'furia', nome: 'Fúria', valor: Math.min(10, (ausp?.furia ?? 3) + bonus) }, { id: 'gnose', nome: 'Gnose', valor: Math.min(10, (raca?.gnose ?? 3) + bonus) });
  } else if (o.tipo === 'cacador') {
    const orgs = l.organizacoes ?? [];
    const org = orgs.find((x) => x.id === o.grupo) ?? (orgs.length ? sorteio(orgs) : undefined);
    grupoId = org?.id ?? '';
    grupo = org?.nome ?? 'Caçador independente';
    const numina = l.numina ?? [];
    const fixN = fixos.filter((k) => k.startsWith('num:')).map((k) => numina.find((n) => 'num:' + n.id === k)).filter((n) => !!n);
    if (!fixN.length && p !== 'capanga' && numina.length) fixN.push(sorteio(numina));
    poderes = fixN.map((n) => ({ chave: 'num:' + n.id, nome: n.nome, nivel: p === 'anciao' ? 3 : p === 'neofito' ? 2 : 1, desc: `${n.rolagem}. ${n.desc}`, aba: 'numina' as const }));
  } else {
    const ocupacoes = o.epoca === 'medieval' ? ger.medieval.nome.b.opcoes : ger.moderno.nome.b.opcoes;
    grupo = papel?.nome ?? sorteio(ocupacoes.length ? ocupacoes : ['Mortal']);
  }

  // atributos
  const max = p === 'anciao' && o.tipo === 'vampiro' ? 6 : 5;
  const grupos: Grupo[] = perfil.ordem ?? embaralhar<Grupo>(['fisicos', 'sociais', 'mentais']);
  const valores = new Map<string, number>();
  grupos.forEach((g, i) => {
    const lista = l.atributos[g];
    for (const a of lista) valores.set(a.id, 1);
    // os fixados à mão gastam pontos do grupo
    let resto = PONTOS[p][i];
    for (const a of lista) {
      const fixo = o.atributos[a.id];
      if (fixo) {
        valores.set(a.id, Math.min(max, fixo));
        resto -= Math.min(max, fixo) - 1;
      }
    }
    const livres = lista.filter((a) => !o.atributos[a.id]);
    let guarda = 0;
    while (resto > 0 && livres.length && guarda++ < 200) {
      const a = sorteioPeso(livres, perfil.atributos);
      const v = valores.get(a.id)!;
      if (v < max) {
        valores.set(a.id, v + 1);
        resto--;
      }
    }
  });
  if (o.tipo === 'vampiro' && grupoId === 'nosferatu') {
    const ap = l.atributos.sociais.find((a) => a.id === 'aparencia');
    if (ap) valores.set(ap.id, 0);
  }
  const atributos = [...l.atributos.fisicos, ...l.atributos.sociais, ...l.atributos.mentais].map((a) => ({ id: a.id, nome: a.nome, valor: valores.get(a.id) ?? 1 }));

  // habilidades: as do perfil ficam fortes, mais algumas aleatórias baixas
  const todasHab = [...l.habilidades.talentos, ...l.habilidades.pericias, ...l.habilidades.conhecimentos];
  const h = HAB[p];
  const habV = new Map<string, number>();
  const favoritas = embaralhar(todasHab.filter((x) => perfil.habilidades.includes(x.id)));
  const fortes = (favoritas.length ? favoritas : embaralhar(todasHab)).slice(0, h.qtd);
  for (const x of fortes) habV.set(x.id, entre(h.fortes[0], h.fortes[1]));
  for (const x of embaralhar(todasHab).slice(0, h.outras)) if (!habV.has(x.id)) habV.set(x.id, entre(1, Math.max(1, h.fortes[0])));
  // todo mundo sabe se defender um pouco
  for (const id of ['briga', 'esquiva', 'prontidao']) if (!habV.has(id) && todasHab.some((x) => x.id === id)) habV.set(id, entre(0, 1));
  const habilidades = todasHab.filter((x) => (habV.get(x.id) ?? 0) > 0).map((x) => ({ id: x.id, nome: x.nome, valor: habV.get(x.id)! }));

  const fv = p === 'capanga' ? entre(2, 4) : p === 'neofito' ? entre(4, 6) : entre(7, 9);
  extras.unshift({ id: 'fv', nome: 'Força de Vontade', valor: fv });

  const arq = l.arquetipos.length ? l.arquetipos : [{ nome: '—' }];
  const nomes = o.epoca === 'medieval' ? ger.npc.nomesMedievais : ger.npc.nomesModernos;
  const atitude = o.atitude || sorteio(ATITUDES).id;

  return {
    id: novoIdNpc(),
    criadoEm: new Date().toISOString(),
    tipo: o.tipo,
    poder: p,
    epoca: o.epoca,
    linhaId: l.id,
    linha: l.nome,
    lider: false,
    nome: nomeNovo(nomes, nomesUsados),
    grupo,
    grupoId,
    auspicioId,
    racaId,
    papel: papel?.nome ?? '',
    perfil: perfil.id,
    natureza: sorteio(arq).nome,
    comportamento: sorteio(arq).nome,
    jeito: sorteio(ger.npc.jeitos),
    atributos,
    habilidades,
    extras,
    poderes,
    atitude,
    motivacao: sorteio(MOTIVACOES[atitude]),
    segredo: sorteio(ger.npc.segredos),
    gancho: sorteio(ger.npc.ganchos),
    aparencia: aparenciaNova(o),
    notas,
  };
}

function nomeNovo(nomes: string[], usados: Set<string>): string {
  const livres = nomes.filter((n) => !usados.has(n));
  const n = sorteio(livres.length ? livres : nomes.length ? nomes : ['Sem nome']);
  usados.add(n);
  return n;
}

function aparenciaNova(o: Pick<OpcoesNpc, 'tipo' | 'poder' | 'epoca'>): NpcGerado['aparencia'] {
  let abraco = '';
  if (o.tipo === 'vampiro') {
    const ano =
      o.epoca === 'medieval'
        ? o.poder === 'anciao' ? entre(700, 1100) : entre(1120, 1195)
        : o.poder === 'anciao' ? entre(1600, 1900) : o.poder === 'neofito' ? entre(1930, 2015) : entre(2015, 2025);
    abraco = `Abraçado por volta de ${ano}`;
  } else if (o.tipo === 'lobisomem') {
    abraco = o.poder === 'anciao' ? 'Passou pelo Rito há décadas' : o.poder === 'neofito' ? 'Passou pelo Rito há poucos anos' : 'Acabou de passar pelo Rito';
  } else if (o.tipo === 'cacador') {
    abraco = o.poder === 'anciao' ? 'Caça há mais de 20 anos' : o.poder === 'neofito' ? 'Caça há alguns anos' : 'Viu o sobrenatural pela primeira vez há pouco';
  }
  return { idade: sorteio(IDADES), roupa: sorteio(ROUPAS[o.epoca]), detalhe: sorteio(DETALHES), abraco };
}

// ---------- gerar a partir do bestiário ----------

export function gerarDeCriatura(c: Criatura, ger: Geradores, o: OpcoesNpc, nomesUsados: Set<string> = new Set()): NpcGerado {
  const variar = (v: number) => Math.max(0, v + (Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0));
  const atributos: TracoNpc[] = [];
  for (const [k, v] of Object.entries(c.atributos ?? {})) {
    const n = numero(v);
    if (n != null && k !== 'Todos') atributos.push({ id: slug(k), nome: k, valor: Math.max(k === 'Aparência' ? 0 : 1, variar(n)) });
  }
  const habilidades = [...lerHabilidades(c.habilidades).values()].map((x) => ({ id: slug(x.nome), nome: x.nome, valor: Math.max(1, x.faixa ? entre(1, x.valor) : variar(x.valor)) }));
  const extras: TracoNpc[] = [];
  const textos: string[] = [];
  for (const [k, v] of Object.entries(c.tracos ?? {})) {
    if (typeof v === 'number' || /^\s*\d+\s*$/.test(String(v))) extras.push({ id: slug(k), nome: k, valor: Number(v) });
    else textos.push(`${k}: ${v}`);
  }
  let poderes = c.poderes.map((x) => ({ nome: x.nome, desc: x.desc }));
  if (c.escolherPoderes) {
    const nums = c.escolherPoderes.match(/\d+/g)?.map(Number) ?? [2];
    poderes = embaralhar(poderes).slice(0, entre(nums[0], nums[nums.length - 1]));
  }
  const nomes = o.epoca === 'medieval' ? ger.npc.nomesMedievais : ger.npc.nomesModernos;
  const atitude = o.atitude || sorteio<AtitudeId>(['rival', 'inimigo', 'inimigo', 'neutro']);
  return {
    id: novoIdNpc(),
    criadoEm: new Date().toISOString(),
    tipo: 'bestiario',
    poder: o.poder,
    epoca: o.epoca,
    linhaId: null,
    linha: `Bestiário${c.pagina ? ' · p. ' + c.pagina : ''}`,
    lider: false,
    nome: nomeNovo(nomes, nomesUsados),
    grupo: c.nome,
    grupoId: c.id,
    auspicioId: '',
    racaId: '',
    papel: '',
    perfil: 'equilibrado',
    natureza: '',
    comportamento: '',
    jeito: sorteio(ger.npc.jeitos),
    atributos,
    habilidades,
    extras,
    poderes,
    atitude,
    motivacao: sorteio(MOTIVACOES[atitude]),
    segredo: sorteio(ger.npc.segredos),
    gancho: sorteio(ger.npc.ganchos),
    aparencia: { ...aparenciaNova({ tipo: 'mortal', poder: o.poder, epoca: o.epoca }), abraco: '' },
    notas: [c.desc, ...textos, 'Valores variam um pouco a partir do bestiário.'],
  };
}

// ---------- travar partes ----------

export const PARTES: { id: ParteNpc; nome: string }[] = [
  { id: 'nome', nome: 'Nome' },
  { id: 'linhagem', nome: 'Linhagem' },
  { id: 'atributos', nome: 'Atributos' },
  { id: 'poderes', nome: 'Poderes' },
  { id: 'personalidade', nome: 'Personalidade' },
  { id: 'historia', nome: 'História' },
  { id: 'aparencia', nome: 'Aparência' },
];

/** Opções para rolar de novo, presas à linhagem atual quando ela está travada. */
export function opcoesComTravas(o: OpcoesNpc, atual: NpcGerado, travas: Set<ParteNpc>): OpcoesNpc {
  if (!travas.has('linhagem') && !travas.has('poderes')) return o;
  return { ...o, grupo: atual.grupoId || o.grupo, auspicio: atual.auspicioId || o.auspicio, raca: atual.racaId || o.raca, seita: '' };
}

/** Copia do NPC anterior as partes travadas. */
export function aplicarTravas(novo: NpcGerado, atual: NpcGerado, travas: Set<ParteNpc>): NpcGerado {
  const r = { ...novo, id: atual.id, lider: atual.lider };
  if (travas.has('nome')) r.nome = atual.nome;
  if (travas.has('linhagem')) Object.assign(r, { grupo: atual.grupo, grupoId: atual.grupoId, auspicioId: atual.auspicioId, racaId: atual.racaId, papel: atual.papel });
  if (travas.has('atributos')) Object.assign(r, { atributos: atual.atributos, habilidades: atual.habilidades });
  if (travas.has('poderes')) {
    r.poderes = atual.poderes;
    const sobrenaturais = ['furia', 'gnose', 'sangue', 'geracao'];
    r.extras = [...r.extras.filter((x) => !sobrenaturais.includes(x.id)), ...atual.extras.filter((x) => sobrenaturais.includes(x.id))];
  }
  if (travas.has('personalidade')) Object.assign(r, { natureza: atual.natureza, comportamento: atual.comportamento, jeito: atual.jeito });
  if (travas.has('historia')) Object.assign(r, { atitude: atual.atitude, motivacao: atual.motivacao, segredo: atual.segredo, gancho: atual.gancho });
  if (travas.has('aparencia')) r.aparencia = atual.aparencia;
  return r;
}

// ---------- paradas e rolagens ----------

export function valorNpc(n: NpcGerado, id: string): number {
  return n.atributos.find((a) => a.id === id)?.valor ?? n.habilidades.find((h) => h.id === id)?.valor ?? n.extras.find((e) => e.id === id)?.valor ?? 0;
}

function tem(n: NpcGerado, id: string): boolean {
  return n.atributos.some((a) => a.id === id) || n.habilidades.some((h) => h.id === id) || n.extras.some((e) => e.id === id);
}

export function rolagensNpc(n: NpcGerado): RolagemAlvo[] {
  const out: RolagemAlvo[] = [];
  const padrao: Record<string, string> = { briga: 'Briga', esquiva: 'Esquiva', prontidao: 'Prontidão' };
  const nome = (id: string) => n.atributos.find((a) => a.id === id)?.nome ?? n.habilidades.find((h) => h.id === id)?.nome ?? n.extras.find((e) => e.id === id)?.nome ?? padrao[id] ?? id;
  const add = (rot: string, a: string, b: string | null, dif = 6, sempre = false) => {
    if (!tem(n, a)) return;
    if (b && !sempre && !tem(n, b)) return;
    out.push({ nome: rot, formula: b ? `${nome(a)} + ${nome(b)}` : nome(a), dados: valorNpc(n, a) + (b ? valorNpc(n, b) : 0), dificuldade: dif });
  };
  add('Ataque desarmado', 'destreza', 'briga', 6, true);
  add('Arma branca', 'destreza', 'armas-brancas');
  add('Tiro', 'destreza', 'armas-de-fogo');
  add('Arco', 'destreza', 'arqueirismo');
  add('Esquiva', 'destreza', 'esquiva', 6, true);
  add('Perceber algo', 'percepcao', 'prontidao', 6, true);
  add('Intimidar', 'manipulacao', 'intimidacao', 7);
  add('Convencer', 'manipulacao', 'labia', 6);
  add('Esgueirar-se', 'destreza', 'furtividade', 6);
  add('Investigar', 'percepcao', 'investigacao', 6);
  add('Ocultismo', 'inteligencia', 'ocultismo', 6);
  if (tem(n, 'forca')) out.push({ nome: 'Dano desarmado', formula: 'Força', dados: valorNpc(n, 'forca'), dificuldade: 6 });
  for (const e of n.extras) {
    if (['geracao', 'sangue'].includes(e.id)) continue;
    out.push({ nome: `Teste de ${e.nome}`, formula: e.nome, dados: e.valor, dificuldade: 6 });
  }
  return out.filter((r) => r.dados > 0);
}

export function paradasNpc(n: NpcGerado): { k: string; v: number }[] {
  const a = (id: string) => valorNpc(n, id);
  const ataque = a('destreza') + Math.max(a('briga'), a('armas-brancas'), a('armas-de-fogo'), a('arqueirismo'));
  return [
    { k: 'Ataque', v: ataque },
    { k: 'Esquiva', v: a('destreza') + a('esquiva') },
    { k: 'Percepção', v: a('percepcao') + a('prontidao') },
    { k: 'F. Vont.', v: a('fv') },
  ].filter((p) => p.k !== 'F. Vont.' || p.v > 0);
}

/** Texto do NPC para as anotações. */
export function textoNpc(n: NpcGerado): string {
  return [
    [n.grupo, n.papel, n.linha].filter(Boolean).join(' · '),
    n.natureza ? `Natureza: ${n.natureza} · Comportamento: ${n.comportamento}` : '',
    `Aparência: ${n.aparencia.idade}; ${n.aparencia.roupa}; ${n.aparencia.detalhe}.${n.aparencia.abraco ? ' ' + n.aparencia.abraco + '.' : ''}`,
    `Atributos: ${n.atributos.map((a) => `${a.nome} ${a.valor}`).join(', ')}`,
    n.habilidades.length ? `Habilidades: ${n.habilidades.map((h) => `${h.nome} ${h.valor}`).join(', ')}` : '',
    `Traços: ${n.extras.map((e) => `${e.nome} ${e.valor}`).join(' · ')}`,
    n.poderes.length ? `Poderes: ${n.poderes.map((p) => (p.nivel ? `${p.nome} ${p.nivel}` : p.nome)).join(', ')}` : '',
    `Atitude: ${ATITUDES.find((x) => x.id === n.atitude)?.nome}, ${n.motivacao}`,
    `Jeito: ${n.jeito}`,
    `Segredo: ${n.segredo}`,
    `Gancho: ${n.gancho}`,
    ...n.notas,
  ]
    .filter(Boolean)
    .join('\n');
}
