import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfigService } from '../../core/config.service';
import { rolarD10 } from '../../core/dados';
import { DataService } from '../../core/data.service';
import {
  Ficha,
  GrupoAtributo,
  GrupoHabilidade,
  aparenciaZero,
  bonusGasto,
  checagens,
  custoBonusChave,
  custoQualidades,
  derivadoBase,
  donsIniciais,
  minimoAtributo,
  nomeTrilha,
  pontosAntecedentes,
  pontosAtributos,
  pontosDisciplinas,
  pontosHabilidades,
  pontosVirtudes,
  reservaSangue,
  slug,
  valorCriacao,
  virtudesDe,
} from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { Cla, Dom, Item, Linha, Numina, Qualidade } from '../../core/models';
import { Dots } from '../../shared/dots';
import { Icon } from '../../shared/icon';

type Passo = 'conceito' | 'cla' | 'garou' | 'organizacao' | 'atributos' | 'habilidades' | 'vantagens' | 'numina' | 'qualidades' | 'bonus' | 'revisao';

const NOMES_PASSO: Record<Passo, string> = {
  conceito: 'Conceito',
  cla: 'Clã',
  garou: 'Raça, augúrio e tribo',
  organizacao: 'Organização',
  atributos: 'Atributos',
  habilidades: 'Habilidades',
  vantagens: 'Vantagens',
  numina: 'Numina',
  qualidades: 'Qualidades e Defeitos',
  bonus: 'Pontos de bônus',
  revisao: 'Revisão',
};

const GRUPOS_ATR: { id: GrupoAtributo; nome: string }[] = [
  { id: 'fisicos', nome: 'Físicos' },
  { id: 'sociais', nome: 'Sociais' },
  { id: 'mentais', nome: 'Mentais' },
];
const GRUPOS_HAB: { id: GrupoHabilidade; nome: string }[] = [
  { id: 'talentos', nome: 'Talentos' },
  { id: 'pericias', nome: 'Perícias' },
  { id: 'conhecimentos', nome: 'Conhecimentos' },
];

@Component({
  selector: 'app-criar',
  imports: [FormsModule, RouterLink, Dots, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './criar.html',
  styleUrl: './criar.css',
})
export class Criar {
  readonly id = input.required<string>();

  private readonly data = inject(DataService);
  private readonly fichas = inject(FichasService);
  protected readonly config = inject(ConfigService);
  private readonly router = inject(Router);

  protected readonly linha = signal<Linha | null>(null);
  protected readonly erro = signal('');
  protected readonly aviso = signal('');
  protected readonly f = computed(() => this.fichas.fichas().find((x) => x.id === this.id()));

  protected readonly gruposAtr = GRUPOS_ATR;
  protected readonly gruposHab = GRUPOS_HAB;
  protected readonly prioridades = ['Primário', 'Secundário', 'Terciário'];

  // filtros e ajuda
  protected readonly filtroQualidade = signal<'todas' | 'qualidades' | 'defeitos'>('todas');
  protected readonly quizAberto = signal(false);
  protected readonly quizPostura = signal<'Físicos' | 'Sociais' | 'Mentais' | ''>('');
  protected readonly quizSeita = signal('');
  protected readonly filtroNumina = signal<'todas' | 'livro' | 'mesa'>('todas');

  constructor() {
    effect(() => {
      const f = this.f();
      if (!f || this.linha()?.id === f.linha) return;
      this.data
        .linha(f.linha)
        .then((l) => this.linha.set(l))
        .catch(() => this.erro.set('Não consegui carregar as regras deste livro.'));
    });
  }

  // ---------- passos ----------

  protected readonly passos = computed<Passo[]>(() => {
    const l = this.linha();
    if (!l) return [];
    if (l.tipo === 'vampiro') return ['conceito', 'cla', 'atributos', 'habilidades', 'vantagens', 'qualidades', 'bonus', 'revisao'];
    if (l.tipo === 'lobisomem') return ['conceito', 'garou', 'atributos', 'habilidades', 'vantagens', 'qualidades', 'bonus', 'revisao'];
    return ['conceito', 'organizacao', 'atributos', 'habilidades', 'vantagens', 'numina', 'qualidades', 'bonus', 'revisao'];
  });
  protected readonly nomesPasso = NOMES_PASSO;
  protected readonly indice = computed(() => Math.min(this.f()?.passo ?? 0, Math.max(this.passos().length - 1, 0)));
  protected readonly passo = computed(() => this.passos()[this.indice()]);

  protected irPara(i: number): void {
    this.aviso.set('');
    this.mut((f) => (f.passo = Math.max(0, Math.min(i, this.passos().length - 1))));
    window.scrollTo({ top: 0 });
  }

  // ---------- alterações ----------

  private mut(fn: (f: Ficha) => void): void {
    this.fichas.alterar(this.id(), fn);
  }

  protected campo<K extends keyof Ficha>(k: K, v: Ficha[K]): void {
    this.mut((f) => (f[k] = v));
  }

  protected base(chave: string): number {
    const f = this.f();
    return f ? (f.base[chave] ?? 0) : 0;
  }

  protected v(chave: string): number {
    const f = this.f();
    const l = this.linha();
    return f && l ? valorCriacao(f, chave, l) : 0;
  }

  protected bonusDe(chave: string): number {
    return this.f()?.bonus[chave] ?? 0;
  }

  // ---------- clã / Garou / organização ----------

  protected escolherCla(c: Cla): void {
    const l = this.linha();
    this.mut((f) => {
      const mudou = f.cla !== c.id;
      f.cla = c.id;
      if (mudou) {
        // Disciplinas de outro clã não valem mais
        for (const k of Object.keys(f.base)) if (k.startsWith('dis:') && !c.disciplinas.includes(k.slice(4)) && !this.ehCaitiff(c)) delete f.base[k];
        for (const k of Object.keys(f.bonus)) if (k.startsWith('dis:') && !c.disciplinas.includes(k.slice(4)) && !this.ehCaitiff(c)) delete f.bonus[k];
      }
      if (l && aparenciaZero(f, l)) f.base['atr:aparencia'] = 0;
      else if (f.base['atr:aparencia'] === 0) f.base['atr:aparencia'] = 1;
    });
  }

  protected ehCaitiff(c?: Cla): boolean {
    return !!c && (c.id.includes('caitiff') || c.disciplinas.length === 0);
  }

  protected readonly cla = computed(() => this.linha()?.clas?.find((c) => c.id === this.f()?.cla));

  protected nomeDisciplina(id: string): string {
    return this.linha()?.disciplinas?.find((d) => d.id === id)?.nome ?? id;
  }

  protected readonly seitas = computed(() => {
    const s = new Set<string>();
    for (const c of this.linha()?.clas ?? []) s.add(this.seitaCurta(c.seita));
    return [...s];
  });

  protected seitaCurta(s: string): string {
    if (/sab[áa]/i.test(s)) return 'Sabá';
    if (/camarilla/i.test(s)) return 'Camarilla';
    if (/independ/i.test(s)) return 'Independente';
    return s.split(/[ (;,]/)[0];
  }

  protected readonly sugestoes = computed(() => {
    const postura = this.quizPostura();
    const seita = this.quizSeita();
    const clas = this.linha()?.clas ?? [];
    if (!postura && !seita) return [];
    return clas
      .map((c) => {
        let p = 0;
        if (postura && c.dica.includes(postura)) p += 2;
        if (seita && this.seitaCurta(c.seita) === seita) p += 1;
        return { c, p };
      })
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
      .map((x) => x.c);
  });

  protected escolherRaca(id: string): void {
    this.mut((f) => {
      f.raca = id;
      this.limparDomInicial(f, 'raca');
    });
  }
  protected escolherAuspicio(id: string): void {
    const a = this.linha()?.auspicios?.find((x) => x.id === id);
    this.mut((f) => {
      f.auspicio = id;
      if (a) {
        f.renome.gloria = a.renome.gloria ?? 0;
        f.renome.honra = a.renome.honra ?? 0;
        f.renome.sabedoria = a.renome.sabedoria ?? 0;
      }
      this.limparDomInicial(f, 'auspicio');
    });
  }
  protected escolherTribo(id: string): void {
    this.mut((f) => {
      f.tribo = id;
      this.limparDomInicial(f, 'tribo');
    });
  }

  private limparDomInicial(f: Ficha, slot: 'raca' | 'auspicio' | 'tribo'): void {
    const atual = f.donsIniciais?.[slot];
    if (atual) delete f.base['dom:' + atual];
    f.donsIniciais = { ...(f.donsIniciais ?? {}), [slot]: undefined };
  }

  protected readonly raca = computed(() => this.linha()?.racas?.find((x) => x.id === this.f()?.raca));
  protected readonly auspicio = computed(() => this.linha()?.auspicios?.find((x) => x.id === this.f()?.auspicio));
  protected readonly tribo = computed(() => this.linha()?.tribos?.find((x) => x.id === this.f()?.tribo));

  /** Dons de nível 1 que o grupo (raça, augúrio ou tribo) pode escolher na criação. */
  protected donsDoGrupo(slot: 'raca' | 'auspicio' | 'tribo'): Dom[] {
    const l = this.linha();
    const f = this.f();
    if (!l || !f) return [];
    const grupo = slot === 'raca' ? this.raca() : slot === 'auspicio' ? this.auspicio() : this.tribo();
    if (!grupo) return [];
    const iniciais = new Set(grupo.donsIniciais);
    const lista = (l.dons ?? []).filter((d) => iniciais.has(d.id) || (d.nivel === 1 && d.grupos.includes(grupo.id)));
    return lista.filter((d, i) => lista.findIndex((x) => x.id === d.id) === i);
  }

  protected escolherDomInicial(slot: 'raca' | 'auspicio' | 'tribo', id: string): void {
    this.mut((f) => {
      const atual = f.donsIniciais?.[slot];
      if (atual) delete f.base['dom:' + atual];
      f.donsIniciais = { ...(f.donsIniciais ?? {}), [slot]: id || undefined };
      if (id) f.base['dom:' + id] = 1;
    });
  }

  protected readonly organizacao = computed(() => this.linha()?.organizacoes?.find((o) => o.id === this.f()?.organizacao));

  // ---------- atributos e habilidades ----------

  protected prioridadeDe(lista: string[], g: string): number {
    return lista.indexOf(g);
  }

  protected setPrioridadeAtr(g: GrupoAtributo, idx: number): void {
    this.mut((f) => {
      const p = [...f.prioridadeAtributos];
      const atual = p.indexOf(g);
      [p[atual], p[idx]] = [p[idx], p[atual]];
      f.prioridadeAtributos = p;
    });
  }

  protected setPrioridadeHab(g: GrupoHabilidade, idx: number): void {
    this.mut((f) => {
      const p = [...f.prioridadeHabilidades];
      const atual = p.indexOf(g);
      [p[atual], p[idx]] = [p[idx], p[atual]];
      f.prioridadeHabilidades = p;
    });
  }

  protected contaAtr(g: GrupoAtributo) {
    const f = this.f()!;
    return pontosAtributos(f, this.linha()!, g);
  }
  protected contaHab(g: GrupoHabilidade) {
    return pontosHabilidades(this.f()!, this.linha()!, g);
  }
  protected minAtr(id: string): number {
    return minimoAtributo(this.f()!, this.linha()!, id);
  }

  protected setAtributo(g: GrupoAtributo, id: string, n: number): void {
    const f = this.f()!;
    const l = this.linha()!;
    const min = minimoAtributo(f, l, id);
    if (min === 0 && id === 'aparencia') {
      this.aviso.set('Nosferatu têm Aparência 0, e ela não pode subir.');
      return;
    }
    const conta = pontosAtributos(f, l, g);
    const atual = f.base['atr:' + id] ?? 1;
    if (conta.gasto + (n - atual) > conta.total) {
      this.aviso.set(`Sem pontos sobrando em ${GRUPOS_ATR.find((x) => x.id === g)!.nome}. Tire de outro atributo ou use pontos de bônus no fim.`);
      return;
    }
    this.aviso.set('');
    this.mut((x) => (x.base['atr:' + id] = Math.max(min, n)));
  }

  protected setHabilidade(g: GrupoHabilidade, id: string, n: number): void {
    const f = this.f()!;
    const l = this.linha()!;
    if (n > l.criacao.maxHabilidade) {
      this.aviso.set(`Na criação, nenhuma Habilidade passa de ${l.criacao.maxHabilidade}. Acima disso, só com pontos de bônus.`);
      return;
    }
    const conta = pontosHabilidades(f, l, g);
    const atual = f.base['hab:' + id] ?? 0;
    if (conta.gasto + (n - atual) > conta.total) {
      this.aviso.set(`Sem pontos sobrando em ${GRUPOS_HAB.find((x) => x.id === g)!.nome}.`);
      return;
    }
    this.aviso.set('');
    this.mut((x) => {
      if (n === 0) delete x.base['hab:' + id];
      else x.base['hab:' + id] = n;
    });
  }

  // ---------- vantagens ----------

  protected readonly disciplinasPermitidas = computed(() => {
    const l = this.linha();
    const c = this.cla();
    if (!l) return [];
    const todas = l.disciplinas ?? [];
    if (!c || this.ehCaitiff(c)) return todas;
    return c.disciplinas.map((id) => todas.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => !!d);
  });

  protected contaDis() {
    return pontosDisciplinas(this.f()!, this.linha()!);
  }
  protected contaAnt() {
    return pontosAntecedentes(this.f()!, this.linha()!);
  }
  protected contaVir() {
    return pontosVirtudes(this.f()!, this.linha()!);
  }
  protected contaDons() {
    return donsIniciais(this.f()!);
  }

  protected setSoma(prefixo: 'dis:' | 'ant:', id: string, n: number, total: number, gasto: number, nome: string): void {
    const atual = this.base(prefixo + id);
    if (gasto + (n - atual) > total) {
      this.aviso.set(`Sem pontos sobrando em ${nome}.`);
      return;
    }
    this.aviso.set('');
    this.mut((f) => {
      if (n === 0) delete f.base[prefixo + id];
      else f.base[prefixo + id] = n;
    });
  }

  protected readonly virtudes = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? virtudesDe(l, f) : [];
  });

  protected virKey(nome: string): string {
    return 'vir:' + slug(nome);
  }

  protected readonly custosTexto = computed(() => {
    const c = this.linha()?.criacao.custosBonus ?? {};
    const nomes: Record<string, string> = { atributo: 'Atributo', habilidade: 'Habilidade', disciplina: 'Disciplina', antecedente: 'Antecedente', virtude: 'Virtude', humanidade: 'Humanidade', forcaVontade: 'Força de Vontade', dom: 'Dom', furia: 'Fúria', gnose: 'Gnose' };
    return Object.entries(c).map(([k, v]) => `${nomes[k] ?? k} ${v}`).join(' · ');
  });

  protected setVirtude(nome: string, n: number): void {
    const conta = this.contaVir();
    const k = 'vir:' + slug(nome);
    const atual = this.base(k) || 1;
    if (conta.gasto + (n - atual) > conta.total) {
      this.aviso.set('Sem pontos sobrando em Virtudes.');
      return;
    }
    this.aviso.set('');
    this.mut((f) => (f.base[k] = Math.max(1, n)));
  }

  protected escolherTrilha(id: string): void {
    const l = this.linha()!;
    this.mut((f) => {
      const antigas = virtudesDe(l, f).map((v) => 'vir:' + slug(v));
      const valores = antigas.map((k) => f.base[k] ?? 1);
      for (const k of antigas) delete f.base[k];
      f.trilha = id;
      virtudesDe(l, f).forEach((v, i) => (f.base['vir:' + slug(v)] = valores[i] ?? 1));
    });
  }

  protected derivado(chave: string): number {
    const f = this.f();
    const l = this.linha();
    return f && l ? derivadoBase(f, chave, l) : 0;
  }

  protected readonly nomeTrilha = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? nomeTrilha(l, f) : 'Humanidade';
  });

  // ---------- numina ----------

  protected readonly numinas = computed(() => {
    const filtro = this.filtroNumina();
    return (this.linha()?.numina ?? []).filter((n) => filtro === 'todas' || n.fonte === filtro);
  });

  protected readonly classesMesa = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [] as string[];
    const s = new Set<string>();
    for (const n of l.numina ?? []) if (n.fonte === 'mesa' && (f.bonus['num:' + n.id] ?? 0) > 0) s.add(n.classe);
    return [...s];
  });

  protected custoNumina(n: Numina): number {
    return custoBonusChave('num:' + n.id, this.linha()!, this.config.custosExtras());
  }

  protected setNumina(n: Numina, nivel: number): void {
    const f = this.f()!;
    if (n.fonte === 'mesa' && nivel > 0 && !this.classesMesa().includes(n.classe) && this.classesMesa().length >= 2) {
      this.aviso.set('Pelo documento da mesa, um personagem tem no máximo 2 Classes de Numina.');
      return;
    }
    this.aviso.set('');
    this.mut((x) => {
      if (nivel === 0) delete x.bonus['num:' + n.id];
      else x.bonus['num:' + n.id] = nivel;
    });
    void f;
  }

  // ---------- qualidades ----------

  protected readonly qualidades = computed(() => {
    const filtro = this.filtroQualidade();
    return (this.linha()?.qualidades ?? []).filter((q) => filtro === 'todas' || (filtro === 'defeitos' ? q.defeito : !q.defeito));
  });

  protected temQualidade(q: Qualidade): boolean {
    return !!this.f()?.qualidades.includes(q.id);
  }

  protected alternarQualidade(q: Qualidade): void {
    this.mut((f) => {
      f.qualidades = f.qualidades.includes(q.id) ? f.qualidades.filter((x) => x !== q.id) : [...f.qualidades, q.id];
    });
  }

  protected readonly somaQualidades = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? custoQualidades(f, l) : { qualidades: 0, defeitos: 0 };
  });

  protected custoTexto(q: Qualidade): string {
    return q.custo.length > 1 ? `${q.custo[0]}–${q.custo[q.custo.length - 1]}` : `${q.custo[0] ?? 0}`;
  }

  // ---------- bônus ----------

  protected readonly bonus = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? bonusGasto(f, l, this.config.custosExtras()) : { gasto: 0, total: 0 };
  });

  protected custoBonus(chave: string): number {
    return custoBonusChave(chave, this.linha()!, this.config.custosExtras());
  }

  protected maxTraco(chave: string): number {
    const l = this.linha()!;
    if (chave === 'trilha' || chave === 'fv' || chave === 'furia' || chave === 'gnose') return 10;
    if (l.tipo === 'vampiro' && (chave.startsWith('atr:') || chave.startsWith('dis:'))) {
      const max = l.geracoes?.find((g) => g.geracao === (l.geracaoPadrao ?? 13) - this.v('ant:geracao'))?.maxTraco;
      return Math.max(5, max ?? 5);
    }
    return 5;
  }

  protected maisBonus(chave: string): void {
    const custo = this.custoBonus(chave);
    const b = this.bonus();
    if (b.gasto + custo > b.total) {
      this.aviso.set(`Faltam pontos de bônus: isso custa ${custo} e restam ${b.total - b.gasto}.`);
      return;
    }
    if (this.v(chave) >= this.maxTraco(chave)) {
      this.aviso.set('Esse traço já está no máximo.');
      return;
    }
    this.aviso.set('');
    this.mut((f) => (f.bonus[chave] = (f.bonus[chave] ?? 0) + 1));
  }

  protected menosBonus(chave: string): void {
    this.aviso.set('');
    this.mut((f) => {
      const n = (f.bonus[chave] ?? 0) - 1;
      if (n <= 0) delete f.bonus[chave];
      else f.bonus[chave] = n;
    });
  }

  /** Linhas da tela de bônus, agrupadas. */
  protected readonly gruposBonus = computed(() => {
    const l = this.linha();
    const f = this.f();
    if (!l || !f) return [];
    const item = (chave: string, nome: string) => ({ chave, nome });
    const grupos: { nome: string; itens: { chave: string; nome: string }[] }[] = [
      { nome: 'Atributos', itens: [...l.atributos.fisicos, ...l.atributos.sociais, ...l.atributos.mentais].filter((a) => !(a.id === 'aparencia' && aparenciaZero(f, l))).map((a) => item('atr:' + a.id, a.nome)) },
      { nome: 'Habilidades', itens: [...l.habilidades.talentos, ...l.habilidades.pericias, ...l.habilidades.conhecimentos].map((h) => item('hab:' + h.id, h.nome)) },
    ];
    if (l.tipo === 'vampiro') grupos.push({ nome: 'Disciplinas', itens: this.disciplinasPermitidas().map((d) => item('dis:' + d.id, d.nome)) });
    grupos.push({ nome: 'Antecedentes', itens: l.antecedentes.map((a) => item('ant:' + a.id, a.nome)) });
    if (l.tipo !== 'lobisomem') {
      grupos.push({ nome: 'Virtudes', itens: this.virtudes().map((v) => item('vir:' + slug(v), v)) });
      grupos.push({ nome: 'Moral e vontade', itens: [item('trilha', this.nomeTrilha()), item('fv', 'Força de Vontade')] });
    } else {
      grupos.push({ nome: 'Fúria, Gnose e Vontade', itens: [item('furia', 'Fúria'), item('gnose', 'Gnose'), item('fv', 'Força de Vontade')] });
    }
    return grupos;
  });

  /** Dons extras comprados com bônus (Garou): nível 1 dos próprios grupos. */
  protected readonly donsExtras = computed(() => {
    const l = this.linha();
    const f = this.f();
    if (!l || !f || l.tipo !== 'lobisomem') return [];
    const grupos = [f.raca, f.auspicio, f.tribo].filter(Boolean) as string[];
    return (l.dons ?? []).filter((d) => d.nivel === 1 && d.grupos.some((g) => grupos.includes(g)) && !f.base['dom:' + d.id]);
  });

  protected alternarDomBonus(d: Dom): void {
    const chave = 'dom:' + d.id;
    if (this.bonusDe(chave)) this.menosBonus(chave);
    else this.maisBonus(chave);
  }

  // ---------- revisão ----------

  protected readonly checks = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? checagens(f, l, this.config.custosExtras()) : [];
  });
  protected readonly tudoOk = computed(() => this.checks().every((c) => c.ok));

  protected concluir(): void {
    const l = this.linha()!;
    this.mut((f) => {
      f.criacaoConcluida = true;
      f.estado.fv = valorCriacao(f, 'fv', l);
      f.estado.furia = valorCriacao(f, 'furia', l);
      f.estado.gnose = valorCriacao(f, 'gnose', l);
      f.estado.forma = l.formas?.find((x) => x.id === (f.raca === 'lupino' ? 'lupino' : 'hominideo'))?.id ?? 'hominideo';
      if (l.tipo === 'vampiro') {
        const { max } = reservaSangue(f, l);
        f.estado.sangue = Math.min(rolarD10(1)[0], max);
      }
    });
    this.router.navigate(['/ficha', this.id()]);
  }

  // utilidades de template
  protected trackItem(_: number, i: Item) {
    return i.id;
  }
  protected readonly Math = Math;
}
