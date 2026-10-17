// Formato dos dados de regras em public/data/*.json.
// Todo texto descritivo é resumo com palavras próprias (nunca cópia longa do livro),
// sempre com a página para a pessoa conferir no PDF.

export type LinhaId = 'vtm' | 'vdta' | 'lob' | 'lidt' | 'cac';
export type TipoPersonagem = 'vampiro' | 'lobisomem' | 'cacador';

/** Elemento genérico com nome e descrição curta. */
export interface Item {
  id: string;
  nome: string;
  desc: string;
  pagina?: number;
}

export interface Arquetipo extends Item {
  /** Como o personagem recupera Força de Vontade com esta Natureza. */
  recuperarFV: string;
}

export interface Qualidade extends Item {
  /** Custo em pontos de bônus (qualidade) ou pontos ganhos (defeito). Ex.: [1] ou [1, 3] para custo variável. */
  custo: number[];
  categoria: 'Física' | 'Mental' | 'Social' | 'Sobrenatural';
  defeito: boolean;
}

export interface CustoXp {
  nome: string;
  /** 'x' = nível atual × valor; 'fixo' = valor fixo; 'novo' = custo para o primeiro ponto. */
  modo: 'x' | 'fixo' | 'novo';
  valor: number;
}

export interface Criacao {
  /** Pontos de atributos por prioridade [primário, secundário, terciário]. */
  atributos: [number, number, number];
  habilidades: [number, number, number];
  antecedentes: number;
  /** Máximo por Habilidade antes dos pontos de bônus. */
  maxHabilidade: number;
  bonus: number;
  /** Custo de 1 ponto com pontos de bônus. Chaves: atributo, habilidade, antecedente, disciplina, virtude, humanidade, forcaVontade, dom, furia, gnose, numina... */
  custosBonus: Record<string, number>;
  /** Máximo de pontos de Defeitos. */
  maxDefeitos?: number;
  /** Passos na ordem do livro, só para mostrar ao jogador. */
  passos: string[];
  pagina?: number;
}

// ---------- Vampiro ----------

export interface Cla extends Item {
  apelido: string;
  seita: string;
  disciplinas: string[]; // ids de Disciplina
  fraqueza: string;
  dica: string; // dica de criação do livro
  linhagens?: string[];
}

export interface PoderNivel {
  nivel: number;
  nome: string;
  sistema: string; // resumo da rolagem/custo/efeito
}

export interface Disciplina extends Item {
  niveis: PoderNivel[];
  /** Trilhas (Taumaturgia/Necromancia) e rituais, quando houver. */
  trilhas?: { nome: string; niveis: PoderNivel[] }[];
  rituais?: { nivel: number; nome: string; sistema: string }[];
}

export interface Trilha extends Item {
  /** Humanidade, Trilhas da Iluminação (VtM) ou Estradas (Idade das Trevas). */
  virtudes: [string, string, string]; // ex.: ['Consciência', 'Autocontrole', 'Coragem'] ou ['Convicção', 'Instinto', 'Coragem']
  /** Hierarquia de pecados, do nível 10 ao 1. */
  pecados: string[];
  apelido?: string;
}

export interface Geracao {
  geracao: number;
  maxTraco: number;
  sangue: number;
  porTurno: number;
}

// ---------- Lobisomem ----------

export interface Raca extends Item {
  gnose: number;
  donsIniciais: string[]; // ids de Dom
  restricoes?: string;
}

export interface Auspicio extends Item {
  lua: string;
  furia: number;
  renome: { gloria: number; honra: number; sabedoria: number; total?: number };
  donsIniciais: string[];
}

export interface Tribo extends Item {
  totem: string;
  forcaVontade: number;
  restricoes: string;
  donsIniciais: string[];
  fraqueza?: string;
}

export interface Dom extends Item {
  nivel: number;
  /** Quem pode aprender: ids de raça, augúrio ou tribo. */
  grupos: string[];
  sistema: string;
}

export interface Forma {
  id: 'hominideo' | 'glabro' | 'crinos' | 'hispo' | 'lupino';
  nome: string;
  /** Modificadores por atributo. 'zero' = o atributo vira 0 (Aparência no Crinos). */
  mod: Record<string, number | 'zero'>;
  dificuldade: number;
  notas: string[];
}

export interface Ritual extends Item {
  nivel: number;
  tipo: string;
  sistema: string;
}

export interface Posto {
  posto: number;
  nome: string;
  /** Renome permanente exigido por augúrio (id do augúrio). Ragabash usa 'total'. */
  exigido: Record<string, { gloria?: number; honra?: number; sabedoria?: number; total?: number }>;
}

// ---------- Caçador ----------

export interface Numina extends Item {
  fonte: 'livro' | 'mesa'; // livro Caçadores Caçados ou documento caseiro da mesa
  classe: string; // Magia de Superstição, Fenômeno Psíquico, Fé Verdadeira, Habilidade Psíquica, Taumaturgia...
  rolagem: string;
  custo: string;
  duracao?: string;
  /** Custo em pontos de bônus por nível, quando a fonte define. null = narrador define. */
  custoBonus: number | null;
  niveis: PoderNivel[];
}

export interface Organizacao extends Item {
  antecedentes: string;
  arquetipos: string[];
}

// ---------- Linha (um livro/jogo) ----------

export interface Linha {
  id: LinhaId;
  nome: string;
  livro: string;
  tipo: TipoPersonagem;
  epoca: 'moderno' | 'medieval';
  criacao: Criacao;
  atributos: { fisicos: Item[]; sociais: Item[]; mentais: Item[] };
  habilidades: { talentos: Item[]; pericias: Item[]; conhecimentos: Item[] };
  antecedentes: Item[];
  arquetipos: Arquetipo[];
  qualidades: Qualidade[];
  xp: CustoXp[];
  vitalidade: { nome: string; penalidade: number | null }[];
  conceitos: string[];

  // vampiro
  clas?: Cla[];
  disciplinas?: Disciplina[];
  pontosDisciplina?: number;
  trilhas?: Trilha[];
  geracoes?: Geracao[];
  geracaoPadrao?: number;

  // lobisomem
  racas?: Raca[];
  auspicios?: Auspicio[];
  tribos?: Tribo[];
  dons?: Dom[];
  formas?: Forma[];
  rituais?: Ritual[];
  postos?: Posto[];
  /** Dificuldade dos testes de Fúria por lua. */
  luas?: { nome: string; dificuldade: number }[];

  // caçador
  organizacoes?: Organizacao[];
  motivos?: string[];
  metodos?: string[];
  numina?: Numina[];
  /** Regras gerais de Numina (limite de classes etc.), em texto curto. */
  regrasNumina?: string[];
}

// ---------- Consulta ----------

export interface Regra {
  id: string;
  linha: LinhaId;
  titulo: string;
  capitulo: string;
  pagina: number | null;
  /** Resumo com palavras próprias, em parágrafos curtos. */
  resumo: string[];
  /** Tabela opcional: primeira linha é o cabeçalho. */
  tabela?: string[][];
  tags: string[];
}

export interface Termo {
  termo: string;
  linha: LinhaId;
  def: string;
  pagina?: number;
}

export interface Criatura {
  id: string;
  nome: string;
  categoria: 'Wyrm' | 'Weaver e Wyld' | 'Espíritos' | 'Humanos' | 'Sobrenaturais' | 'Vampiros' | 'Caçadores';
  linha: LinhaId;
  pagina: number | null;
  desc: string;
  /** Atributos em texto ("Força 3+") ou números. */
  atributos?: Record<string, string | number>;
  habilidades?: string;
  /** FV, Fúria, Gnose, Essência, Sangue etc. */
  tracos?: Record<string, string | number>;
  poderes: { nome: string; desc: string }[];
  /** Quantos poderes escolher, quando a criatura é montável (ex.: fomor 2–3). */
  escolherPoderes?: string;
}

export interface TabelaGerador {
  titulos: string[];
  a: { rotulo: string; opcoes: string[] };
  b: { rotulo: string; opcoes: string[] };
}

export interface Geradores {
  moderno: Record<'nome' | 'refugio' | 'local' | 'cena' | 'gancho', TabelaGerador>;
  medieval: Record<'nome' | 'refugio' | 'local' | 'cena' | 'gancho', TabelaGerador>;
  npc: {
    nomesModernos: string[];
    nomesMedievais: string[];
    jeitos: string[];
    segredos: string[];
    ganchos: string[];
  };
}
