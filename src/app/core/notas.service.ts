import { Injectable, signal } from '@angular/core';
import { gravar, ler, novoId } from './storage';

export type TipoNota = 'sessao' | 'npc' | 'pista' | 'lugar' | 'outro';

export const TIPOS_NOTA: { id: TipoNota; nome: string; classe: string }[] = [
  { id: 'sessao', nome: 'Sessão', classe: 'tag-gray' },
  { id: 'npc', nome: 'NPC', classe: '' },
  { id: 'pista', nome: 'Pista', classe: 'tag-gold' },
  { id: 'lugar', nome: 'Lugar', classe: 'tag-blue' },
  { id: 'outro', nome: 'Outro', classe: 'tag-gray' },
];

export interface Nota {
  id: string;
  tipo: TipoNota;
  titulo: string;
  texto: string;
  fichaId: string | null;
  criadaEm: string;
  atualizadaEm: string;
}

@Injectable({ providedIn: 'root' })
export class NotasService {
  private readonly _notas = signal<Nota[]>(ler<Nota[]>('notas', []));
  readonly notas = this._notas.asReadonly();

  porId(id: string): Nota | undefined {
    return this._notas().find((n) => n.id === id);
  }

  criar(parcial: Partial<Nota> = {}): Nota {
    const agora = new Date().toISOString();
    const n: Nota = { id: novoId(), tipo: 'sessao', titulo: '', texto: '', fichaId: null, criadaEm: agora, atualizadaEm: agora, ...parcial };
    this.salvarLista([n, ...this._notas()]);
    return n;
  }

  salvar(n: Nota): void {
    const atualizada = { ...n, atualizadaEm: new Date().toISOString() };
    this.salvarLista(this._notas().map((x) => (x.id === n.id ? atualizada : x)));
  }

  remover(id: string): void {
    this.salvarLista(this._notas().filter((n) => n.id !== id));
  }

  importar(lista: Nota[]): void {
    const atuais = new Map(this._notas().map((n) => [n.id, n]));
    for (const n of lista) if (n && n.id) atuais.set(n.id, n);
    this.salvarLista([...atuais.values()]);
  }

  private salvarLista(lista: Nota[]): void {
    this._notas.set(lista);
    gravar('notas', lista);
  }
}

export function quando(iso: string): string {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 14) return 'há 1 semana';
  if (dias < 31) return `há ${Math.floor(dias / 7)} semanas`;
  return d.toLocaleDateString('pt-BR');
}
