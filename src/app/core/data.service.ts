import { Injectable, signal } from '@angular/core';
import { Criatura, Geradores, Linha, LinhaId, Regra, Termo } from './models';

export interface IndicePaginas {
  livros: Record<string, { nome: string; paginas: number }>;
  termos: Record<string, Record<string, number[]>>;
}

export const LINHAS: { id: LinhaId; nome: string; curto: string }[] = [
  { id: 'vtm', nome: 'Vampiro: A Máscara', curto: 'A Máscara' },
  { id: 'vdta', nome: 'Vampiro: A Idade das Trevas', curto: 'Idade das Trevas' },
  { id: 'lob', nome: 'Lobisomem: O Apocalipse', curto: 'Lobisomem' },
  { id: 'lidt', nome: 'Lobisomem: A Idade das Trevas', curto: 'Lobisomem medieval' },
  { id: 'cac', nome: 'Caçadores Caçados e Numina', curto: 'Caçadores' },
];

export function nomeLinha(id: LinhaId, curto = false): string {
  const l = LINHAS.find((x) => x.id === id);
  return l ? (curto ? l.curto : l.nome) : id;
}

/** Carrega os JSON de regras sob demanda e guarda em memória. */
@Injectable({ providedIn: 'root' })
export class DataService {
  private cache = new Map<string, Promise<unknown>>();

  readonly linhas = signal<Partial<Record<LinhaId, Linha>>>({});

  private carregar<T>(arquivo: string): Promise<T> {
    let p = this.cache.get(arquivo) as Promise<T> | undefined;
    if (!p) {
      p = fetch(`data/${arquivo}.json`).then((r) => {
        if (!r.ok) throw new Error(`Não foi possível carregar ${arquivo}`);
        return r.json() as Promise<T>;
      });
      p.catch(() => this.cache.delete(arquivo));
      this.cache.set(arquivo, p);
    }
    return p;
  }

  async linha(id: LinhaId): Promise<Linha> {
    const l = await this.carregar<Linha>(id);
    this.linhas.update((m) => ({ ...m, [id]: l }));
    return l;
  }

  todasLinhas(): Promise<Linha[]> {
    return Promise.all(LINHAS.map((l) => this.linha(l.id)));
  }

  regras(): Promise<Regra[]> {
    return this.carregar<Regra[]>('regras');
  }

  glossario(): Promise<Termo[]> {
    return this.carregar<Termo[]>('glossario');
  }

  bestiario(): Promise<Criatura[]> {
    return this.carregar<Criatura[]>('bestiario');
  }

  /** Índice remissivo: palavra (sem acento) -> páginas de cada livro com texto. */
  indice(): Promise<IndicePaginas> {
    return this.carregar<IndicePaginas>('indice');
  }

  geradores(): Promise<Geradores> {
    return this.carregar<Geradores>('geradores');
  }
}
