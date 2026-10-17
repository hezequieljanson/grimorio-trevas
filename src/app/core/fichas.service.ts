import { Injectable, computed, signal } from '@angular/core';
import { Ficha, novaFicha } from './ficha';
import { Linha } from './models';
import { gravar, ler, novoId } from './storage';

@Injectable({ providedIn: 'root' })
export class FichasService {
  private readonly _fichas = signal<Ficha[]>(ler<Ficha[]>('fichas', []));
  readonly fichas = this._fichas.asReadonly();
  readonly prontas = computed(() => this._fichas().filter((f) => f.criacaoConcluida));
  readonly rascunhos = computed(() => this._fichas().filter((f) => !f.criacaoConcluida));

  porId(id: string): Ficha | undefined {
    return this._fichas().find((f) => f.id === id);
  }

  criar(linha: Linha): Ficha {
    const f = novaFicha(novoId(), linha);
    this.salvarLista([f, ...this._fichas()]);
    return f;
  }

  salvar(f: Ficha): void {
    const atualizada = { ...f, atualizadaEm: new Date().toISOString() };
    this.salvarLista(this._fichas().map((x) => (x.id === f.id ? atualizada : x)));
  }

  /** Aplica uma alteração e salva. */
  alterar(id: string, fn: (f: Ficha) => void): Ficha | undefined {
    const atual = this.porId(id);
    if (!atual) return undefined;
    const copia: Ficha = structuredClone(atual);
    fn(copia);
    this.salvar(copia);
    return copia;
  }

  remover(id: string): void {
    this.salvarLista(this._fichas().filter((f) => f.id !== id));
  }

  importar(lista: Ficha[]): number {
    const atuais = new Map(this._fichas().map((f) => [f.id, f]));
    for (const f of lista) if (f && f.id && f.linha) atuais.set(f.id, f);
    this.salvarLista([...atuais.values()]);
    return lista.length;
  }

  private salvarLista(lista: Ficha[]): void {
    this._fichas.set(lista);
    gravar('fichas', lista);
  }
}
