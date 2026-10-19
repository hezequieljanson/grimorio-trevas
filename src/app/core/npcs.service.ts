import { Injectable, signal } from '@angular/core';
import { Ficha, novaFicha } from './ficha';
import { Linha } from './models';
import { NpcGerado, textoNpc } from './npc';
import { gravar, ler, novoId } from './storage';

/** NPCs que o narrador guardou: a lista "NPCs da crônica". */
@Injectable({ providedIn: 'root' })
export class NpcsService {
  private readonly _npcs = signal<NpcGerado[]>(ler<NpcGerado[]>('npcs', []));
  readonly npcs = this._npcs.asReadonly();

  salvo(id: string): boolean {
    return this._npcs().some((n) => n.id === id);
  }

  salvar(n: NpcGerado): void {
    const outros = this._npcs().filter((x) => x.id !== n.id);
    this.gravarLista([n, ...outros]);
  }

  remover(id: string): void {
    this.gravarLista(this._npcs().filter((n) => n.id !== id));
  }

  private gravarLista(lista: NpcGerado[]): void {
    this._npcs.set(lista);
    gravar('npcs', lista);
  }
}

/** Transforma o NPC numa ficha completa, já pronta para a mesa. */
export function fichaDeNpc(n: NpcGerado, l: Linha): Ficha {
  const f = novaFicha(novoId(), l);
  f.nome = n.nome;
  f.conceito = [n.papel, n.tipo === 'carnical' ? 'Carniçal' : n.tipo === 'mortal' ? 'Mortal' : ''].filter(Boolean).join(' · ') || n.grupo;
  f.natureza = l.arquetipos.find((a) => a.nome === n.natureza)?.id ?? '';
  f.comportamento = l.arquetipos.find((a) => a.nome === n.comportamento)?.id ?? '';
  f.criacaoConcluida = true;
  f.passo = 99;
  if (n.tipo === 'vampiro') {
    f.cla = n.grupoId;
    const g = n.extras.find((e) => e.id === 'geracao')?.valor;
    if (g) f.base['ant:geracao'] = Math.max(0, (l.geracaoPadrao ?? 13) - g);
  }
  if (n.tipo === 'lobisomem') {
    f.tribo = n.grupoId;
    f.auspicio = n.auspicioId;
    f.raca = n.racaId;
  }
  if (n.tipo === 'cacador') f.organizacao = n.grupoId;
  for (const a of n.atributos) f.base['atr:' + a.id] = a.valor;
  for (const h of n.habilidades) f.base['hab:' + h.id] = h.valor;
  for (const p of n.poderes) if (p.chave) f.base[p.chave] = p.nivel ?? 1;
  for (const e of n.extras) if (['fv', 'furia', 'gnose'].includes(e.id)) f.base[e.id] = e.valor;
  f.estado.fv = n.extras.find((e) => e.id === 'fv')?.valor ?? 0;
  f.estado.furia = n.extras.find((e) => e.id === 'furia')?.valor ?? 0;
  f.estado.gnose = n.extras.find((e) => e.id === 'gnose')?.valor ?? 0;
  f.estado.sangue = n.extras.find((e) => e.id === 'sangue')?.valor ?? 0;
  f.anotacoes = `Gerado no NPC rápido.\n${textoNpc(n)}`;
  return f;
}
