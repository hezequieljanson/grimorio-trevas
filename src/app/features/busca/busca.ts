import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { norm, pontuar, termosDe } from '../../core/busca';
import { ConfigService } from '../../core/config.service';
import { DataService, IndicePaginas, nomeLinha } from '../../core/data.service';
import { Criatura, Linha, LinhaId, Regra, Termo } from '../../core/models';
import { Icon } from '../../shared/icon';

interface Achado {
  chave: string;
  titulo: string;
  sub: string;
  detalhe?: string;
  linha: LinhaId;
  pagina?: number | null;
  link?: unknown[];
  query?: Record<string, string>;
  pontos: number;
}

interface Grupo {
  nome: string;
  itens: Achado[];
}

const ORDEM = ['Regras', 'Glossário', 'Poderes', 'Rituais', 'Qualidades e Defeitos', 'Bestiário', 'Clãs', 'Raças, augúrios e tribos', 'Organizações de caçadores', 'Humanidade, Trilhas e Estradas', 'Antecedentes', 'Arquétipos', 'Habilidades'];

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'um', 'uma', 'que', 'com', 'para', 'por', 'os', 'as', 'ao']);

@Component({
  selector: 'app-busca',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './busca.html',
  styles: `
    .grupo { display: flex; flex-direction: column; gap: 0; }
    .achado { display: flex; align-items: flex-start; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--line); color: var(--text); text-decoration: none; background: transparent; border-left: 0; border-right: 0; border-top: 0; text-align: left; width: 100%; }
    .achado:hover { background: rgba(255, 255, 255, 0.02); color: var(--text); }
    .paginas { display: flex; flex-wrap: wrap; gap: 5px; }
    .pg { min-width: 34px; padding: 3px 7px; border-radius: 8px; background: var(--surface-2); font-size: 13px; font-weight: 600; text-align: center; }
    .chip { text-decoration: none; }
    mark { background: rgba(228, 203, 145, 0.25); color: inherit; border-radius: 3px; padding: 0 1px; }
  `,
})
export class Busca {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  protected readonly config = inject(ConfigService);
  protected readonly nomeLinha = nomeLinha;

  private readonly regras = signal<Regra[]>([]);
  private readonly termos = signal<Termo[]>([]);
  private readonly criaturas = signal<Criatura[]>([]);
  private readonly linhas = signal<Linha[]>([]);
  protected readonly indice = signal<IndicePaginas | null>(null);
  protected readonly carregando = signal(true);
  protected readonly abertos = signal<Record<string, boolean>>({});
  protected readonly todosGrupo = signal<Record<string, boolean>>({});

  private readonly qParam = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((p) => p.get('q') ?? '')), { initialValue: '' });
  protected readonly q = signal('');

  constructor() {
    Promise.all([this.data.regras(), this.data.glossario(), this.data.bestiario(), this.data.todasLinhas()])
      .then(([r, g, b, l]) => {
        this.regras.set(r);
        this.termos.set(g);
        this.criaturas.set(b);
        this.linhas.set(l);
      })
      .finally(() => this.carregando.set(false));
    effect(() => this.q.set(this.qParam()));
    // O índice de páginas é grande: só baixa quando a pessoa busca algo.
    effect(() => {
      if (this.q().trim().length >= 3 && !this.indice()) this.data.indice().then((i) => this.indice.set(i)).catch(() => undefined);
    });
  }

  protected buscar(v: string): void {
    this.q.set(v);
    this.todosGrupo.set({});
    this.router.navigate([], { queryParams: v ? { q: v } : {}, replaceUrl: true });
  }

  private readonly palavras = computed(() => termosDe(this.q()));

  protected readonly grupos = computed<Grupo[]>(() => {
    const t = this.palavras();
    if (!t.length) return [];
    const ativo = (l: LinhaId) => this.config.ativo(l);
    const achados: (Achado & { grupo: string })[] = [];
    const add = (grupo: string, a: Omit<Achado, 'pontos'>, campos: { texto: string; peso: number }[]) => {
      if (!ativo(a.linha)) return;
      const pontos = pontuar(t, campos);
      if (pontos > 0) achados.push({ ...a, grupo, pontos });
    };

    for (const r of this.regras()) {
      add('Regras', { chave: 'r:' + r.id, titulo: r.titulo, sub: r.capitulo, detalhe: r.resumo[0], linha: r.linha, pagina: r.pagina, link: ['/regras', r.id] }, [
        { texto: r.titulo, peso: 10 },
        { texto: r.tags.join(' '), peso: 6 },
        { texto: r.resumo.join(' '), peso: 1 },
      ]);
    }
    for (const g of this.termos()) {
      add('Glossário', { chave: 'g:' + g.linha + g.termo, titulo: g.termo, sub: 'Termo do glossário', detalhe: g.def, linha: g.linha, pagina: g.pagina, link: ['/glossario'] }, [
        { texto: g.termo, peso: 10 },
        { texto: g.def, peso: 1 },
      ]);
    }
    for (const c of this.criaturas()) {
      add('Bestiário', { chave: 'c:' + c.id, titulo: c.nome, sub: c.categoria, detalhe: c.desc, linha: c.linha, pagina: c.pagina, link: ['/bestiario'], query: { id: c.id } }, [
        { texto: c.nome, peso: 10 },
        { texto: c.categoria, peso: 3 },
        { texto: c.desc + ' ' + c.poderes.map((p) => p.nome).join(' '), peso: 1 },
      ]);
    }
    for (const l of this.linhas()) {
      for (const d of l.disciplinas ?? []) {
        add('Poderes', { chave: `${l.id}:d:${d.id}`, titulo: d.nome, sub: 'Disciplina', detalhe: d.desc, linha: l.id, pagina: d.pagina, link: ['/biblioteca'], query: { aba: 'disciplinas', q: d.nome } }, [
          { texto: d.nome, peso: 10 },
          { texto: d.niveis.map((n) => n.nome).join(' '), peso: 5 },
          { texto: d.desc + ' ' + d.niveis.map((n) => n.sistema).join(' '), peso: 1 },
        ]);
        for (const r of d.rituais ?? []) {
          add('Rituais', { chave: `${l.id}:dr:${d.id}:${r.nome}`, titulo: r.nome, sub: `Ritual de ${d.nome} · nível ${r.nivel}`, detalhe: r.sistema, linha: l.id, pagina: d.pagina, link: ['/biblioteca'], query: { aba: 'rituais', q: r.nome } }, [
            { texto: r.nome, peso: 10 },
            { texto: r.sistema, peso: 1 },
          ]);
        }
      }
      for (const d of l.dons ?? []) {
        add('Poderes', { chave: `${l.id}:g:${d.id}`, titulo: d.nome, sub: `Dom nível ${d.nivel}`, detalhe: d.sistema, linha: l.id, pagina: d.pagina, link: ['/biblioteca'], query: { aba: 'dons', q: d.nome } }, [
          { texto: d.nome, peso: 10 },
          { texto: d.sistema + ' ' + d.desc, peso: 1 },
        ]);
      }
      for (const r of l.rituais ?? []) {
        add('Rituais', { chave: `${l.id}:r:${r.id}`, titulo: r.nome, sub: `${r.tipo} · nível ${r.nivel}`, detalhe: r.sistema, linha: l.id, pagina: r.pagina, link: ['/biblioteca'], query: { aba: 'rituais', q: r.nome } }, [
          { texto: r.nome, peso: 10 },
          { texto: r.sistema + ' ' + r.desc, peso: 1 },
        ]);
      }
      for (const n of l.numina ?? []) {
        add('Poderes', { chave: `${l.id}:n:${n.id}`, titulo: n.nome, sub: `Numina · ${n.fonte === 'mesa' ? 'documento da mesa' : 'livro'}`, detalhe: n.desc, linha: l.id, pagina: n.pagina, link: ['/biblioteca'], query: { aba: 'numina', q: n.nome } }, [
          { texto: n.nome, peso: 10 },
          { texto: n.classe, peso: 4 },
          { texto: n.desc + ' ' + n.niveis.map((x) => x.nome + ' ' + x.sistema).join(' '), peso: 1 },
        ]);
      }
      for (const q of l.qualidades) {
        add('Qualidades e Defeitos', { chave: `${l.id}:q:${q.id}`, titulo: q.nome, sub: `${q.defeito ? 'Defeito' : 'Qualidade'} · ${q.categoria}`, detalhe: q.desc, linha: l.id, pagina: q.pagina, link: ['/biblioteca'], query: { aba: 'qualidades', q: q.nome } }, [
          { texto: q.nome, peso: 10 },
          { texto: q.desc, peso: 1 },
        ]);
      }
      for (const c of l.clas ?? []) {
        add('Clãs', { chave: `${l.id}:cla:${c.id}`, titulo: c.nome, sub: [c.apelido, c.seita].filter(Boolean).join(' · '), detalhe: `${c.desc} Fraqueza: ${c.fraqueza}`, linha: l.id, pagina: c.pagina }, [
          { texto: c.nome + ' ' + c.apelido, peso: 10 },
          { texto: c.desc + ' ' + c.fraqueza + ' ' + c.dica, peso: 1 },
        ]);
      }
      const grupoGarou = [...(l.racas ?? []).map((x) => ({ ...x, tipo: 'Raça' })), ...(l.auspicios ?? []).map((x) => ({ ...x, tipo: 'Augúrio' })), ...(l.tribos ?? []).map((x) => ({ ...x, tipo: 'Tribo' }))];
      for (const x of grupoGarou) {
        add('Raças, augúrios e tribos', { chave: `${l.id}:gr:${x.id}`, titulo: x.nome, sub: x.tipo, detalhe: x.desc, linha: l.id, pagina: x.pagina }, [
          { texto: x.nome, peso: 10 },
          { texto: x.desc, peso: 1 },
        ]);
      }
      for (const o of l.organizacoes ?? []) {
        add('Organizações de caçadores', { chave: `${l.id}:o:${o.id}`, titulo: o.nome, sub: 'Organização', detalhe: o.desc, linha: l.id, pagina: o.pagina }, [
          { texto: o.nome, peso: 10 },
          { texto: o.desc, peso: 1 },
        ]);
      }
      for (const tr of l.trilhas ?? []) {
        add('Humanidade, Trilhas e Estradas', { chave: `${l.id}:t:${tr.id}`, titulo: tr.nome, sub: tr.virtudes.join(', '), detalhe: tr.desc, linha: l.id, pagina: tr.pagina }, [
          { texto: tr.nome + ' ' + (tr.apelido ?? ''), peso: 10 },
          { texto: tr.desc + ' ' + tr.pecados.join(' '), peso: 1 },
        ]);
      }
      for (const a of l.antecedentes) {
        add('Antecedentes', { chave: `${l.id}:a:${a.id}`, titulo: a.nome, sub: 'Antecedente', detalhe: a.desc, linha: l.id, pagina: a.pagina }, [
          { texto: a.nome, peso: 10 },
          { texto: a.desc, peso: 1 },
        ]);
      }
      for (const a of l.arquetipos) {
        add('Arquétipos', { chave: `${l.id}:ar:${a.id}`, titulo: a.nome, sub: 'Natureza / Comportamento', detalhe: `${a.desc} Recupera FV: ${a.recuperarFV}`, linha: l.id, pagina: a.pagina }, [
          { texto: a.nome, peso: 10 },
          { texto: a.desc, peso: 1 },
        ]);
      }
      for (const h of [...l.habilidades.talentos, ...l.habilidades.pericias, ...l.habilidades.conhecimentos]) {
        add('Habilidades', { chave: `${l.id}:h:${h.id}`, titulo: h.nome, sub: 'Habilidade', detalhe: h.desc, linha: l.id, pagina: h.pagina }, [
          { texto: h.nome, peso: 10 },
          { texto: h.desc, peso: 1 },
        ]);
      }
    }

    const porGrupo = new Map<string, Achado[]>();
    for (const a of achados.sort((x, y) => y.pontos - x.pontos)) porGrupo.set(a.grupo, [...(porGrupo.get(a.grupo) ?? []), a]);
    return ORDEM.filter((g) => porGrupo.has(g)).map((nome) => ({ nome, itens: porGrupo.get(nome)! }));
  });

  protected readonly total = computed(() => this.grupos().reduce((s, g) => s + g.itens.length, 0));

  /** Páginas de cada livro em que todas as palavras aparecem (prefixos também valem: "adivinh"). */
  protected readonly paginas = computed(() => {
    const ind = this.indice();
    const palavras = this.palavras().filter((p) => !STOP.has(p) && p.length >= 3);
    if (!ind || !palavras.length) return [];
    const chaves = Object.keys(ind.termos);
    const porPalavra = palavras.map((p) => {
      const exatas = ind.termos[p] ? [p] : [];
      const casam = exatas.length ? exatas.concat(chaves.filter((k) => k !== p && k.startsWith(p) && k.length - p.length <= 3)) : chaves.filter((k) => k.startsWith(p));
      const r: Record<string, Set<number>> = {};
      for (const k of casam.slice(0, 40)) for (const [livro, pgs] of Object.entries(ind.termos[k])) for (const n of pgs) (r[livro] ??= new Set()).add(n);
      return r;
    });
    return Object.entries(ind.livros)
      .map(([id, info]) => {
        let pgs: number[] | null = null;
        for (const r of porPalavra) {
          const s = r[id] ?? new Set<number>();
          pgs = pgs === null ? [...s] : pgs.filter((n) => s.has(n));
        }
        return { id, nome: info.nome, paginas: (pgs ?? []).sort((a, b) => a - b) };
      })
      .filter((x) => x.paginas.length && (x.id === 'numina' ? this.config.ativo('cac') : this.config.ativo(x.id as LinhaId)));
  });

  protected irPara(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected alternar(chave: string): void {
    this.abertos.update((m) => ({ ...m, [chave]: !m[chave] }));
  }

  protected verTodos(grupo: string): void {
    this.todosGrupo.update((m) => ({ ...m, [grupo]: true }));
  }

  protected limitar(g: Grupo): Achado[] {
    return this.todosGrupo()[g.nome] ? g.itens : g.itens.slice(0, 5);
  }

  /** Destaca as palavras buscadas num texto curto. */
  protected partes(texto: string | undefined): { t: string; m: boolean }[] {
    if (!texto) return [];
    const curto = texto.length > 220 ? texto.slice(0, 217) + '…' : texto;
    const ps = this.palavras().filter((p) => !STOP.has(p) && p.length >= 3);
    if (!ps.length) return [{ t: curto, m: false }];
    const n = norm(curto);
    const marcas = new Array(curto.length).fill(false);
    for (const p of ps) {
      let i = n.indexOf(p);
      while (i >= 0) {
        for (let j = i; j < i + p.length; j++) marcas[j] = true;
        i = n.indexOf(p, i + p.length);
      }
    }
    const out: { t: string; m: boolean }[] = [];
    for (let i = 0; i < curto.length; i++) {
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.m === marcas[i]) ultimo.t += curto[i];
      else out.push({ t: curto[i], m: marcas[i] });
    }
    return out;
  }
}
