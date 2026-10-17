import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { geracaoDe, nomeTrilha, reservaSangue, slug, valor, virtudesDe } from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { Item, Linha } from '../../core/models';
import { Icon } from '../../shared/icon';

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
  private readonly data = inject(DataService);
  private readonly fichas = inject(FichasService);
  protected readonly linha = signal<Linha | null>(null);
  protected readonly f = computed(() => this.fichas.fichas().find((x) => x.id === this.id()));

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
    } else if (l.tipo === 'lobisomem') {
      base.push(['Raça', l.racas?.find((x) => x.id === f.raca)?.nome ?? ''], ['Augúrio', l.auspicios?.find((x) => x.id === f.auspicio)?.nome ?? ''], ['Tribo', l.tribos?.find((x) => x.id === f.tribo)?.nome ?? ''], ['Posto', String(f.posto)]);
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

  protected readonly hoje = new Date().toLocaleDateString('pt-BR');

  protected imprimir(): void {
    window.print();
  }
}
