import { Ficha, valor } from './ficha';
import { LinhaXp } from './config.service';
import { Linha } from './models';

export interface CustoEvolucao {
  custo: number | null; // null = o narrador decide (custo 0 na tabela)
  regra: string;
}

/** Custo em XP para subir um traço em 1 ponto, segundo a tabela da mesa. */
export function custoEvolucao(f: Ficha, linha: Linha, chave: string, tabela: LinhaXp[]): CustoEvolucao {
  const atual = valor(f, chave, linha);
  const linhaXp = (k: string) => tabela.find((x) => x.chave === k);
  const calc = (k: string, nivel = atual): CustoEvolucao => {
    const l = linhaXp(k);
    if (!l || !l.valor) return { custo: null, regra: l ? l.nome + ': o narrador decide' : 'Sem custo na tabela' };
    const c = l.modo === 'fixo' ? l.valor : Math.max(nivel, 1) * l.valor;
    return { custo: c, regra: l.modo === 'fixo' ? `${l.nome}: ${l.valor}` : `${l.nome}: ${Math.max(nivel, 1)} × ${l.valor}` };
  };

  if (chave.startsWith('atr:')) return calc('atributo');
  if (chave.startsWith('hab:')) return atual === 0 ? calc('habilidade-nova') : calc('habilidade');
  if (chave.startsWith('dis:')) {
    if (atual === 0) return calc('disciplina-nova');
    const doCla = linha.clas?.find((c) => c.id === f.cla)?.disciplinas.includes(chave.slice(4));
    return calc(doCla ? 'disciplina-cla' : 'disciplina-outra');
  }
  if (chave.startsWith('vir:')) return calc('virtude');
  if (chave.startsWith('ant:')) return calc('antecedente');
  if (chave.startsWith('dom:')) {
    const dom = linha.dons?.find((d) => 'dom:' + d.id === chave);
    const proprio = !!dom && [f.raca, f.auspicio, f.tribo].some((g) => g && dom.grupos.includes(g));
    return calc(proprio ? 'dom' : 'dom-outro', dom?.nivel ?? 1);
  }
  if (chave.startsWith('num:')) {
    if (atual === 0) return calc('numina-nova');
    const n = linha.numina?.find((x) => 'num:' + x.id === chave);
    return calc(n?.fonte === 'livro' ? 'numina-livro' : 'numina-mesa');
  }
  if (chave === 'trilha' || chave === 'fv' || chave === 'furia' || chave === 'gnose') return calc(chave);
  return { custo: null, regra: 'Sem custo na tabela' };
}

export function xpGasto(f: Ficha): number {
  return f.xp.log.reduce((s, l) => s + l.custo, 0);
}
