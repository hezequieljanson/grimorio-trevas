import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Ficha, atributoNaForma, geracaoDe, nomeTrilha, reservaSangue, slug, valor, virtudesDe } from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { GrupoService } from '../../core/grupo.service';
import { Item, Linha } from '../../core/models';
import { Icon } from '../../shared/icon';

const CURTO: Record<string, string> = { forca: 'For', destreza: 'Des', vigor: 'Vig', manipulacao: 'Man', aparencia: 'Apa' };

/** Ficha no visual impresso, em A4. "Salvar PDF" usa a impressão do navegador. */
@Component({
  selector: 'app-ficha-pdf',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ficha-pdf.html',
  styleUrl: './ficha-pdf.css',
})
export class FichaPdf {
  readonly id = input.required<string>();
  /** Vem da rota /grupo/:id: ficha de outro jogador, só para ler. */
  readonly grupo = input(false);
  private readonly grupoSrv = inject(GrupoService);
  private readonly data = inject(DataService);
  private readonly fichas = inject(FichasService);
  protected readonly linha = signal<Linha | null>(null);
  protected readonly f = computed(() => (this.grupo() ? this.grupoSrv.lista().find((r) => r.ficha.id === this.id())?.ficha : this.fichas.fichas().find((x) => x.id === this.id())));

  constructor() {
    effect(() => {
      const f = this.f();
      if (f && this.linha()?.id !== f.linha) this.data.linha(f.linha).then((l) => this.linha.set(l));
    });
  }

  protected v(chave: string): number {
    const f = this.f();
    const l = this.linha();
    return f && l ? valor(f, chave, l) : 0;
  }

  protected bolas(n: number, max = 5): boolean[] {
    return Array.from({ length: max }, (_, i) => i < n);
  }

  protected readonly info = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    const arq = (id: string) => l.arquetipos.find((a) => a.id === id)?.nome ?? '';
    if (l.tipo === 'lobisomem') {
      const tribo = l.tribos?.find((x) => x.id === f.tribo);
      return [
        ['Nome', f.nome],
        ['Raça', l.racas?.find((x) => x.id === f.raca)?.nome ?? ''],
        ['Natureza', arq(f.natureza)],
        ['Jogador', f.jogador],
        ['Augúrio', l.auspicios?.find((x) => x.id === f.auspicio)?.nome ?? ''],
        ['Comportamento', arq(f.comportamento)],
        ['Crônica', f.cronica],
        ['Tribo', tribo?.nome ?? ''],
        ['Conceito', f.conceito],
        ['Totem', tribo?.totem ?? ''],
      ].map(([k, v]) => ({ k, v }));
    }
    const base = [
      ['Nome', f.nome],
      ['Natureza', arq(f.natureza)],
      ['Jogador', f.jogador],
      ['Comportamento', arq(f.comportamento)],
      ['Crônica', f.cronica],
      ['Conceito', f.conceito],
    ];
    if (l.tipo === 'vampiro') {
      base.push(['Clã', l.clas?.find((c) => c.id === f.cla)?.nome ?? ''], ['Geração', `${geracaoDe(f, l)}ª`], ['Senhor', f.senhor ?? ''], ['Refúgio', f.refugio ?? '']);
    } else {
      base.push(['Organização', l.organizacoes?.find((x) => x.id === f.organizacao)?.nome ?? 'Independente'], ['Motivo', f.motivo ?? ''], ['Método', f.metodo ?? '']);
    }
    return base.map(([k, v]) => ({ k, v }));
  });

  private col(nome: string, itens: Item[], prefixo: string) {
    return { nome, itens: itens.map((i) => ({ nome: i.nome, n: this.v(prefixo + i.id) })) };
  }

  protected readonly atributos = computed(() => {
    const l = this.linha();
    if (!l) return [];
    return [this.col('Físicos', l.atributos.fisicos, 'atr:'), this.col('Sociais', l.atributos.sociais, 'atr:'), this.col('Mentais', l.atributos.mentais, 'atr:')];
  });

  protected readonly habilidades = computed(() => {
    const l = this.linha();
    if (!l) return [];
    return [this.col('Talentos', l.habilidades.talentos, 'hab:'), this.col('Perícias', l.habilidades.pericias, 'hab:'), this.col('Conhecimentos', l.habilidades.conhecimentos, 'hab:')];
  });

  protected readonly vantagens = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    const antecedentes = l.antecedentes.filter((a) => this.v('ant:' + a.id) > 0);
    const cols = [];
    if (l.tipo === 'vampiro') cols.push(this.col('Disciplinas', (l.disciplinas ?? []).filter((d) => this.v('dis:' + d.id) > 0), 'dis:'));
    if (l.tipo === 'lobisomem') cols.push({ nome: 'Dons', itens: (l.dons ?? []).filter((d) => this.v('dom:' + d.id) > 0).map((d) => ({ nome: `${d.nome} (${d.nivel})`, n: -1 })) });
    if (l.tipo === 'cacador') cols.push(this.col('Numina', (l.numina ?? []).filter((n) => this.v('num:' + n.id) > 0), 'num:'));
    cols.push(this.col('Antecedentes', antecedentes, 'ant:'));
    if (l.tipo !== 'lobisomem') {
      cols.push({ nome: 'Virtudes', itens: virtudesDe(l, f).map((v) => ({ nome: v, n: this.v('vir:' + slug(v)) })) });
    } else {
      cols.push({ nome: 'Renome', itens: [{ nome: 'Glória', n: f.renome.gloria }, { nome: 'Honra', n: f.renome.honra }, { nome: 'Sabedoria', n: f.renome.sabedoria }] });
    }
    return cols;
  });

  protected readonly trilha = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? nomeTrilha(l, f) : '';
  });

  protected readonly sangue = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l && l.tipo === 'vampiro' ? reservaSangue(f, l) : null;
  });

  protected readonly qualidades = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return '';
    return f.qualidades.map((id) => l.qualidades.find((q) => q.id === id)?.nome).filter(Boolean).join(', ');
  });

  protected readonly fraqueza = computed(() => {
    const f = this.f();
    const l = this.linha();
    return l?.clas?.find((c) => c.id === f?.cla)?.fraqueza ?? l?.tribos?.find((t) => t.id === f?.tribo)?.fraqueza ?? '';
  });

  /** Partes que só existem na ficha de Garou. */
  protected readonly garou = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l || l.tipo !== 'lobisomem') return null;
    const grupos: { id?: string; nome?: string }[] = [
      { id: f.raca, nome: l.racas?.find((x) => x.id === f.raca)?.nome },
      { id: f.auspicio, nome: l.auspicios?.find((x) => x.id === f.auspicio)?.nome },
      { id: f.tribo, nome: l.tribos?.find((x) => x.id === f.tribo)?.nome },
    ];
    const dons = (l.dons ?? [])
      .filter((d) => this.v('dom:' + d.id) > 0)
      .map((d) => ({ nome: `${d.nome} (${d.nivel})`, origem: grupos.find((g) => g.id && d.grupos.includes(g.id))?.nome ?? '' }));
    while (dons.length < 6) dons.push({ nome: '', origem: '' });
    const antecedentes = l.antecedentes.filter((a) => this.v('ant:' + a.id) > 0).map((a) => ({ nome: a.nome, n: this.v('ant:' + a.id) }));
    while (antecedentes.length < 5) antecedentes.push({ nome: '', n: 0 });
    const r = f.renome;
    const formas = (l.formas ?? []).map((fo) => {
      const copia: Ficha = { ...f, estado: { ...f.estado, forma: fo.id } };
      const attrs = ['forca', 'destreza', 'vigor', 'manipulacao', 'aparencia'].map((id) => {
        const x = atributoNaForma(copia, l, id);
        return { k: CURTO[id], v: x.valor, d: x.delta };
      });
      return { nome: fo.nome, dif: fo.dificuldade, attrs, nota: fo.notas[0] ?? '' };
    });
    return {
      posto: { n: f.posto, nome: l.postos?.find((p) => p.posto === f.posto)?.nome ?? '' },
      dons,
      antecedentes,
      renome: [
        { nome: 'Glória', perm: r.gloria, temp: r.gloriaT },
        { nome: 'Honra', perm: r.honra, temp: r.honraT },
        { nome: 'Sabedoria', perm: r.sabedoria, temp: r.sabedoriaT },
      ],
      recursos: [
        { nome: 'Fúria', perm: this.v('furia'), atual: f.estado.furia },
        { nome: 'Gnose', perm: this.v('gnose'), atual: f.estado.gnose },
        { nome: 'Força de Vontade', perm: this.v('fv'), atual: f.estado.fv },
      ],
      formas,
      lua: l.luas?.[f.estado.lua],
    };
  });

  /** Partes que só existem na ficha de Caçador. */
  protected readonly cacador = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l || l.tipo !== 'cacador') return null;
    const numina = (l.numina ?? [])
      .filter((n) => this.v('num:' + n.id) > 0)
      .map((n) => ({ nome: n.nome, n: this.v('num:' + n.id), fonte: n.fonte === 'mesa' ? 'mesa' : 'livro', classe: n.classe }));
    while (numina.length < 5) numina.push({ nome: '', n: 0, fonte: '', classe: '' });
    const antecedentes = l.antecedentes.filter((a) => this.v('ant:' + a.id) > 0).map((a) => ({ nome: a.nome, n: this.v('ant:' + a.id) }));
    while (antecedentes.length < 5) antecedentes.push({ nome: '', n: 0 });
    return {
      organizacao: l.organizacoes?.find((o) => o.id === f.organizacao)?.nome ?? 'Independente',
      numina,
      antecedentes,
      virtudes: virtudesDe(l, f).map((v) => ({ nome: v, n: this.v('vir:' + slug(v)) })),
    };
  });

  protected readonly hoje = new Date().toLocaleDateString('pt-BR');

  protected imprimir(): void {
    window.print();
  }
}
