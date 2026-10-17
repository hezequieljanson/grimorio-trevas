import { Injectable, computed, signal } from '@angular/core';
import { LinhaId } from './models';
import { gravar, ler } from './storage';

export interface LinhaXp {
  chave: string;
  nome: string;
  /** 'x' = nível atual × valor; 'fixo' = custo fixo (primeiro ponto de algo novo). */
  modo: 'x' | 'fixo';
  valor: number;
}

export interface RegrasCasa {
  /** De qual tabela a mesa partiu, só para mostrar. */
  origem: string;
  xp: Record<LinhaId, LinhaXp[]>;
  /** Custo em pontos de bônus de cada nível de Numina do documento da mesa (o documento não define). */
  numinaMesaBonus: number;
}

const BASE_VAMPIRO: LinhaXp[] = [
  { chave: 'atributo', nome: 'Atributo', modo: 'x', valor: 4 },
  { chave: 'habilidade', nome: 'Habilidade', modo: 'x', valor: 2 },
  { chave: 'habilidade-nova', nome: 'Nova Habilidade', modo: 'fixo', valor: 3 },
  { chave: 'disciplina-nova', nome: 'Nova Disciplina', modo: 'fixo', valor: 10 },
  { chave: 'disciplina-cla', nome: 'Disciplina do clã', modo: 'x', valor: 5 },
  { chave: 'disciplina-outra', nome: 'Outra Disciplina', modo: 'x', valor: 7 },
  { chave: 'virtude', nome: 'Virtude', modo: 'x', valor: 2 },
  { chave: 'trilha', nome: 'Humanidade / Trilha', modo: 'x', valor: 2 },
  { chave: 'fv', nome: 'Força de Vontade', modo: 'x', valor: 1 },
  { chave: 'antecedente', nome: 'Antecedente (se o narrador permitir)', modo: 'x', valor: 0 },
];

const BASE_LOBISOMEM: LinhaXp[] = [
  { chave: 'atributo', nome: 'Atributo', modo: 'x', valor: 4 },
  { chave: 'habilidade', nome: 'Habilidade', modo: 'x', valor: 2 },
  { chave: 'habilidade-nova', nome: 'Nova Habilidade', modo: 'fixo', valor: 3 },
  { chave: 'dom', nome: 'Dom da raça, augúrio ou tribo (× nível)', modo: 'x', valor: 3 },
  { chave: 'dom-outro', nome: 'Outro Dom (× nível)', modo: 'x', valor: 5 },
  { chave: 'furia', nome: 'Fúria', modo: 'x', valor: 1 },
  { chave: 'gnose', nome: 'Gnose', modo: 'x', valor: 2 },
  { chave: 'fv', nome: 'Força de Vontade', modo: 'x', valor: 1 },
  { chave: 'antecedente', nome: 'Antecedente (se o narrador permitir)', modo: 'x', valor: 0 },
];

const BASE_CACADOR: LinhaXp[] = [
  { chave: 'atributo', nome: 'Atributo', modo: 'x', valor: 4 },
  { chave: 'habilidade', nome: 'Habilidade', modo: 'x', valor: 2 },
  { chave: 'habilidade-nova', nome: 'Nova Habilidade', modo: 'fixo', valor: 3 },
  { chave: 'virtude', nome: 'Virtude', modo: 'x', valor: 2 },
  { chave: 'trilha', nome: 'Humanidade', modo: 'x', valor: 2 },
  { chave: 'fv', nome: 'Força de Vontade', modo: 'x', valor: 1 },
  { chave: 'numina-livro', nome: 'Numina do livro', modo: 'x', valor: 3 },
  { chave: 'numina-mesa', nome: 'Numina (documento da mesa)', modo: 'x', valor: 7 },
  { chave: 'numina-nova', nome: 'Novo Caminho de Numina', modo: 'fixo', valor: 10 },
  { chave: 'antecedente', nome: 'Antecedente (se o narrador permitir)', modo: 'x', valor: 0 },
];

export function regrasPadrao(): RegrasCasa {
  return {
    origem: 'Tabelas dos livros',
    xp: {
      vtm: structuredClone(BASE_VAMPIRO),
      vdta: structuredClone(BASE_VAMPIRO),
      lob: structuredClone(BASE_LOBISOMEM),
      lidt: structuredClone(BASE_LOBISOMEM),
      cac: structuredClone(BASE_CACADOR),
    },
    numinaMesaBonus: 7,
  };
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly _livros = signal<LinhaId[]>(ler<LinhaId[]>('livros', ['vtm', 'vdta', 'lob', 'lidt', 'cac']));
  readonly livrosAtivos = this._livros.asReadonly();

  private readonly _regras = signal<RegrasCasa>(this.mesclar(ler<Partial<RegrasCasa>>('regras-casa', {})));
  readonly regras = this._regras.asReadonly();
  /** Custos de bônus extras usados pelo motor de pontos. */
  readonly custosExtras = computed(() => ({ 'numina-mesa-bonus': this._regras().numinaMesaBonus }));

  ativo(id: LinhaId): boolean {
    return this._livros().includes(id);
  }

  alternarLivro(id: LinhaId): void {
    const atual = this._livros();
    const novo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
    this._livros.set(novo);
    gravar('livros', novo);
  }

  salvarRegras(r: RegrasCasa): void {
    this._regras.set(r);
    gravar('regras-casa', r);
  }

  restaurarPadrao(): void {
    this.salvarRegras(regrasPadrao());
  }

  importarRegras(r: Partial<RegrasCasa>): void {
    this.salvarRegras(this.mesclar(r));
  }

  custo(linha: LinhaId, chave: string): LinhaXp | undefined {
    return this._regras().xp[linha]?.find((x) => x.chave === chave);
  }

  private mesclar(r: Partial<RegrasCasa>): RegrasCasa {
    const p = regrasPadrao();
    const xp = { ...p.xp };
    for (const id of Object.keys(xp) as LinhaId[]) {
      const vindas = r.xp?.[id];
      if (Array.isArray(vindas)) {
        xp[id] = p.xp[id].map((linhaPadrao) => vindas.find((v) => v.chave === linhaPadrao.chave) ?? linhaPadrao);
        for (const v of vindas) if (!xp[id].some((x) => x.chave === v.chave)) xp[id].push(v);
      }
    }
    return { origem: r.origem ?? p.origem, xp, numinaMesaBonus: r.numinaMesaBonus ?? p.numinaMesaBonus };
  }
}
