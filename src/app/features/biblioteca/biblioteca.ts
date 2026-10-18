import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { pontuar, termosDe } from '../../core/busca';
import { ConfigService } from '../../core/config.service';
import { DataService, nomeLinha } from '../../core/data.service';
import { Linha, LinhaId, PoderNivel } from '../../core/models';
import { telaLarga } from '../../core/tela';
import { Icon } from '../../shared/icon';

type Aba = 'disciplinas' | 'dons' | 'rituais' | 'numina' | 'qualidades';

/** Um poder qualquer, já no formato da lista. */
interface Entrada {
  chave: string;
  aba: Aba;
  linha: LinhaId;
  nome: string;
  sub: string;
  /** Valores para os filtros (clã, grupo do Dom, nível, fonte, categoria…). */
  filtros: string[];
  nivel?: number;
  desc: string;
  sistema?: string;
  pagina?: number;
  niveis?: PoderNivel[];
  trilhas?: { nome: string; niveis: PoderNivel[] }[];
  rituais?: { nivel: number; nome: string; sistema: string }[];
  quem?: string[];
}

const ABAS: { id: Aba; nome: string }[] = [
  { id: 'disciplinas', nome: 'Disciplinas' },
  { id: 'dons', nome: 'Dons' },
  { id: 'rituais', nome: 'Rituais' },
  { id: 'numina', nome: 'Numina' },
  { id: 'qualidades', nome: 'Qualidades' },
];

@Component({
  selector: 'app-biblioteca',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './biblioteca.html',
  styles: `
    .layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
    .lista { flex: 1 1 320px; max-width: 430px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .detalhe { flex: 999 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
    .list-link.atual { background: var(--red-bg); }
    .nivel-linha { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
    .bola-nivel { width: 26px; height: 26px; border-radius: 50%; background: var(--red-bg-2); color: var(--red-soft); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
    .filtros { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    @media (max-width: 899px) { .lista { max-width: none; } .esconder-celular { display: none; } }
    @media (min-width: 900px) { .so-celular { display: none; } .lista { position: sticky; top: 16px; max-height: calc(100dvh - 32px); overflow-y: auto; } }
  `,
})
export class Biblioteca {
  private readonly data = inject(DataService);
  protected readonly config = inject(ConfigService);
  protected readonly nomeLinha = nomeLinha;
  protected readonly abas = ABAS;
  private readonly larga = telaLarga();

  protected readonly linhas = signal<Linha[]>([]);
  protected readonly erro = signal('');
  protected readonly aba = signal<Aba>('disciplinas');
  protected readonly q = signal('');
  protected readonly livro = signal<LinhaId | ''>('');
  protected readonly filtro1 = signal('');
  protected readonly filtro2 = signal('');
  protected readonly atualChave = signal<string | null>(null);

  constructor() {
    const aba = inject(ActivatedRoute).snapshot.queryParamMap.get('aba') as Aba | null;
    if (aba && ABAS.some((a) => a.id === aba)) this.aba.set(aba);
    this.data
      .todasLinhas()
      .then((l) => this.linhas.set(l))
      .catch(() => this.erro.set('Não consegui carregar os livros.'));
  }

  /** Todas as entradas de todos os livros ativos. */
  private readonly todas = computed<Entrada[]>(() => {
    const out: Entrada[] = [];
    for (const l of this.linhas()) {
      if (!this.config.ativo(l.id)) continue;
      for (const d of l.disciplinas ?? []) {
        const clas = (l.clas ?? []).filter((c) => c.disciplinas.includes(d.id)).map((c) => c.nome);
        out.push({ chave: `${l.id}:dis:${d.id}`, aba: 'disciplinas', linha: l.id, nome: d.nome, sub: clas.length ? clas.join(', ') : 'Nenhum clã a tem de saída', filtros: clas, desc: d.desc, pagina: d.pagina, niveis: d.niveis, trilhas: d.trilhas, rituais: d.rituais, quem: clas });
      }
      const nomeGrupo = (id: string) => l.racas?.find((x) => x.id === id)?.nome ?? l.auspicios?.find((x) => x.id === id)?.nome ?? l.tribos?.find((x) => x.id === id)?.nome ?? id;
      for (const d of l.dons ?? []) {
        const quem = d.grupos.map(nomeGrupo);
        out.push({ chave: `${l.id}:dom:${d.id}`, aba: 'dons', linha: l.id, nome: d.nome, sub: `Nível ${d.nivel} · ${quem.join(', ')}`, filtros: quem, nivel: d.nivel, desc: d.desc, sistema: d.sistema, pagina: d.pagina, quem });
      }
      for (const r of l.rituais ?? []) {
        out.push({ chave: `${l.id}:rit:${r.id}`, aba: 'rituais', linha: l.id, nome: r.nome, sub: `Nível ${r.nivel} · ${r.tipo}`, filtros: [r.tipo], nivel: r.nivel, desc: r.desc, sistema: r.sistema, pagina: r.pagina });
      }
      for (const d of l.disciplinas ?? []) {
        for (const r of d.rituais ?? []) {
          out.push({ chave: `${l.id}:rit:${d.id}:${r.nome}`, aba: 'rituais', linha: l.id, nome: r.nome, sub: `Nível ${r.nivel} · Ritual de ${d.nome}`, filtros: [`Ritual de ${d.nome}`], nivel: r.nivel, desc: '', sistema: r.sistema, pagina: d.pagina });
        }
      }
      for (const n of l.numina ?? []) {
        const fonte = n.fonte === 'mesa' ? 'Documento da mesa' : 'Livro';
        out.push({ chave: `${l.id}:num:${n.id}`, aba: 'numina', linha: l.id, nome: n.nome, sub: `${fonte} · ${n.classe}`, filtros: [fonte, n.classe], desc: n.desc, sistema: [n.rolagem, n.custo, n.duracao].filter(Boolean).join(' · '), pagina: n.pagina, niveis: n.niveis });
      }
      for (const q of l.qualidades) {
        const tipo = q.defeito ? 'Defeito' : 'Qualidade';
        const custo = q.custo.length > 1 ? `${q.custo[0]}–${q.custo[q.custo.length - 1]}` : `${q.custo[0] ?? 0}`;
        out.push({ chave: `${l.id}:qua:${q.id}`, aba: 'qualidades', linha: l.id, nome: q.nome, sub: `${tipo} · ${q.categoria} · ${q.defeito ? '+' : '−'}${custo} bônus`, filtros: [tipo, q.categoria], desc: q.desc, pagina: q.pagina });
      }
    }
    return out;
  });

  protected readonly daAba = computed(() => this.todas().filter((e) => e.aba === this.aba()));

  /** Livros que têm algo nesta aba. */
  protected readonly livrosDaAba = computed(() => [...new Set(this.daAba().map((e) => e.linha))]);

  /** Opções do primeiro filtro (clã, grupo, tipo de ritual, fonte, tipo de qualidade). */
  protected readonly opcoes1 = computed(() => {
    const base = this.daAba().filter((e) => !this.livro() || e.linha === this.livro());
    const a = this.aba();
    let valores: string[];
    if (a === 'numina' || a === 'qualidades') valores = base.map((e) => e.filtros[0]);
    else valores = base.flatMap((e) => e.filtros);
    return [...new Set(valores)].filter(Boolean).sort((x, y) => x.localeCompare(y));
  });

  protected readonly rotulo1 = computed(() => ({ disciplinas: 'Clã', dons: 'Raça, augúrio ou tribo', rituais: 'Tipo', numina: 'Fonte', qualidades: 'Tipo' })[this.aba()]);

  protected readonly opcoes2 = computed(() => {
    const a = this.aba();
    if (a === 'dons' || a === 'rituais') return ['1', '2', '3', '4', '5'];
    if (a === 'qualidades') return ['Física', 'Mental', 'Social', 'Sobrenatural'];
    if (a === 'numina') return [...new Set(this.daAba().map((e) => e.filtros[1]))].filter(Boolean);
    return [];
  });

  protected readonly rotulo2 = computed(() => ({ disciplinas: '', dons: 'Nível', rituais: 'Nível', numina: 'Classe', qualidades: 'Categoria' })[this.aba()]);

  protected readonly lista = computed(() => {
    const termos = termosDe(this.q());
    const f1 = this.filtro1();
    const f2 = this.filtro2();
    const a = this.aba();
    const out = this.daAba().filter((e) => {
      if (this.livro() && e.linha !== this.livro()) return false;
      if (f1 && !e.filtros.includes(f1)) return false;
      if (f2) {
        if ((a === 'dons' || a === 'rituais') && String(e.nivel) !== f2) return false;
        if ((a === 'qualidades' || a === 'numina') && !e.filtros.includes(f2)) return false;
      }
      return !termos.length || pontuar(termos, [{ texto: e.nome, peso: 4 }, { texto: e.sub, peso: 2 }, { texto: `${e.desc} ${e.sistema ?? ''} ${(e.niveis ?? []).map((n) => n.nome + ' ' + n.sistema).join(' ')}`, peso: 1 }]) > 0;
    });
    return out.sort((x, y) => (x.nivel ?? 0) - (y.nivel ?? 0) || x.nome.localeCompare(y.nome));
  });

  protected readonly atual = computed(() => {
    const lista = this.lista();
    return lista.find((e) => e.chave === this.atualChave()) ?? (this.larga() ? (lista[0] ?? null) : null);
  });

  protected trocarAba(a: Aba): void {
    this.aba.set(a);
    this.filtro1.set('');
    this.filtro2.set('');
    this.livro.set('');
    this.atualChave.set(null);
  }

  protected mudou(): void {
    if (this.larga()) this.atualChave.set(null);
  }

  protected abrir(e: Entrada): void {
    this.atualChave.set(e.chave);
    window.scrollTo({ top: 0 });
  }
}
