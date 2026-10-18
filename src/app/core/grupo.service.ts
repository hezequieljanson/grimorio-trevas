import { Injectable, signal } from '@angular/core';
import { Ficha, slug } from './ficha';
import { gravar, ler, novoId } from './storage';

/** Arquivo com uma ficha só, para mandar ao narrador ou a outro jogador. */
export interface ArquivoFicha {
  tipo: 'grimorio-ficha';
  versao: 1;
  enviadaEm: string;
  ficha: Ficha;
}

export interface FichaRecebida {
  ficha: Ficha;
  recebidaEm: string;
}

/** Fichas de outros jogadores, só para consulta. Ficam separadas das suas. */
@Injectable({ providedIn: 'root' })
export class GrupoService {
  private readonly _lista = signal<FichaRecebida[]>(ler<FichaRecebida[]>('grupo', []));
  readonly lista = this._lista.asReadonly();

  porId(id: string): Ficha | undefined {
    return this._lista().find((r) => r.ficha.id === id)?.ficha;
  }

  /** Guarda a ficha recebida. Se já existir uma com o mesmo id, troca pela versão nova. */
  receber(arq: ArquivoFicha): { nome: string; atualizada: boolean } {
    const atual = this._lista();
    const existe = atual.some((r) => r.ficha.id === arq.ficha.id);
    const nova: FichaRecebida = { ficha: arq.ficha, recebidaEm: new Date().toISOString() };
    this.salvar(existe ? atual.map((r) => (r.ficha.id === arq.ficha.id ? nova : r)) : [nova, ...atual]);
    return { nome: arq.ficha.nome || 'Sem nome', atualizada: existe };
  }

  remover(id: string): void {
    this.salvar(this._lista().filter((r) => r.ficha.id !== id));
  }

  private salvar(l: FichaRecebida[]): void {
    this._lista.set(l);
    gravar('grupo', l);
  }
}

export function ehArquivoFicha(x: unknown): x is ArquivoFicha {
  const a = x as ArquivoFicha;
  return !!a && a.tipo === 'grimorio-ficha' && !!a.ficha?.id && !!a.ficha?.linha;
}

/** Cópia editável de uma ficha recebida, com id novo para não misturar com a original. */
export function copiaEditavel(f: Ficha): Ficha {
  return { ...structuredClone(f), id: novoId(), nome: `${f.nome || 'Sem nome'} (cópia)`, atualizadaEm: new Date().toISOString() };
}

/**
 * Manda a ficha pelo compartilhamento do celular (WhatsApp, e-mail…).
 * Onde não houver, baixa o arquivo para a pessoa enviar como quiser.
 */
export async function enviarFicha(f: Ficha): Promise<'compartilhada' | 'baixada' | 'cancelada'> {
  const arq: ArquivoFicha = { tipo: 'grimorio-ficha', versao: 1, enviadaEm: new Date().toISOString(), ficha: f };
  const nome = `ficha-${slug(f.nome || 'personagem') || 'personagem'}.json`;
  const blob = new Blob([JSON.stringify(arq, null, 2)], { type: 'application/json' });
  try {
    const file = new File([blob], nome, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `Ficha de ${f.nome}`, text: 'Ficha do Grimório das Trevas. Abra em Fichas › Receber ficha.' });
      return 'compartilhada';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'cancelada';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'baixada';
}
