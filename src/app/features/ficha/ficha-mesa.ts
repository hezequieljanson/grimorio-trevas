import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../core/config.service';
import { Resultado, rolar } from '../../core/dados';
import { DataService } from '../../core/data.service';
import {
  Ficha,
  TipoDano,
  atributoNaForma,
  geracaoDe,
  nivelVitalidade,
  nomeTraco,
  nomeTrilha,
  penalidadeAtual,
  reservaSangue,
  slug,
  todasHabilidades,
  todosAtributos,
  valor,
  valorParaRolagem,
  virtudesDe,
} from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { enviarFicha } from '../../core/grupo.service';
import { Linha } from '../../core/models';
import { novoId } from '../../core/storage';
import { custoEvolucao, xpGasto } from '../../core/xp';
import { Dots } from '../../shared/dots';
import { Icon } from '../../shared/icon';
import { ResultadoView } from '../../shared/resultado';
import { legivel } from '../fichas/fichas';

type Aba = 'mesa' | 'ficha' | 'poderes' | 'evoluir' | 'notas';

interface RolagemPronta {
  id: string;
  nome: string;
  tracos: string[];
  dificuldade: number;
  salva: boolean;
}

const ORDEM_DANO: Record<TipoDano, number> = { a: 0, l: 1, c: 2 };

@Component({
  selector: 'app-ficha-mesa',
  imports: [RouterLink, FormsModule, Dots, Icon, ResultadoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ficha-mesa.html',
  styleUrl: './ficha-mesa.css',
})
export class FichaMesa {
  readonly id = input.required<string>();

  private readonly data = inject(DataService);
  private readonly fichas = inject(FichasService);
  private readonly config = inject(ConfigService);

  protected readonly linha = signal<Linha | null>(null);
  protected readonly f = computed(() => this.fichas.fichas().find((x) => x.id === this.id()));
  protected readonly aba = signal<Aba>('mesa');
  protected readonly resultado = signal<Resultado | null>(null);
  protected readonly rotulo = signal('');
  protected readonly historico = signal<{ rotulo: string; texto: string }[]>([]);
  protected readonly dificuldade = signal(6);
  protected readonly usarFv = signal(false);
  protected readonly montando = signal(false);
  protected readonly novoA = signal('');
  protected readonly novoB = signal('');
  protected readonly novoNome = signal('');
  protected readonly xpNovo = signal(0);
  protected readonly aviso = signal('');
  protected readonly legivel = legivel;

  constructor() {
    effect(() => {
      const f = this.f();
      if (f && this.linha()?.id !== f.linha) this.data.linha(f.linha).then((l) => this.linha.set(l));
    });
  }

  private mut(fn: (f: Ficha) => void): void {
    this.fichas.alterar(this.id(), fn);
  }

  protected v(chave: string): number {
    const f = this.f();
    const l = this.linha();
    return f && l ? valor(f, chave, l) : 0;
  }

  // ---------- cabeçalho ----------

  protected readonly subtitulo = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return '';
    const p: string[] = [];
    if (l.tipo === 'vampiro') {
      p.push(l.clas?.find((c) => c.id === f.cla)?.nome ?? '');
      p.push(`${geracaoDe(f, l)}ª geração`);
    } else if (l.tipo === 'lobisomem') {
      p.push(l.racas?.find((x) => x.id === f.raca)?.nome ?? '', l.auspicios?.find((x) => x.id === f.auspicio)?.nome ?? '', l.tribos?.find((x) => x.id === f.tribo)?.nome ?? '');
    } else {
      p.push(l.organizacoes?.find((x) => x.id === f.organizacao)?.nome ?? 'Caçador independente');
    }
    const nat = l.arquetipos.find((a) => a.id === f.natureza)?.nome;
    const com = l.arquetipos.find((a) => a.id === f.comportamento)?.nome;
    if (nat || com) p.push([nat, com].filter(Boolean).join(' / '));
    return p.filter(Boolean).join(' · ');
  });

  // ---------- vitalidade ----------

  protected readonly caixas = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    return l.vitalidade.map((nv, i) => ({ nome: nv.nome, pen: nv.penalidade, dano: f.estado.dano[i] as TipoDano | undefined }));
  });
  protected readonly penalidade = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? penalidadeAtual(f, l) : 0;
  });
  protected readonly nivel = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? nivelVitalidade(f, l) : '';
  });

  protected ferir(t: TipoDano): void {
    this.mut((f) => {
      f.estado.dano = [...f.estado.dano, t].sort((a, b) => ORDEM_DANO[a] - ORDEM_DANO[b]);
      const max = this.linha()?.vitalidade.length ?? 7;
      if (f.estado.dano.length > max) f.estado.dano = f.estado.dano.slice(0, max);
    });
  }

  /** Cura o dano menos grave primeiro. */
  protected curar(): void {
    this.mut((f) => (f.estado.dano = f.estado.dano.slice(0, -1)));
  }

  protected simbolo(t?: TipoDano): string {
    return t === 'a' ? '✱' : t === 'l' ? '✕' : t === 'c' ? '╱' : '';
  }

  // ---------- recursos ----------

  protected readonly sangueMax = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l && l.tipo === 'vampiro' ? reservaSangue(f, l) : { max: 0, porTurno: 0 };
  });

  protected ajustar(campo: 'sangue' | 'fv' | 'furia' | 'gnose', delta: number): void {
    const max = campo === 'sangue' ? this.sangueMax().max : this.v(campo);
    this.mut((f) => (f.estado[campo] = Math.max(0, Math.min(max || 99, f.estado[campo] + delta))));
  }

  // ---------- formas e lua ----------

  protected readonly formaAtual = computed(() => this.linha()?.formas?.find((x) => x.id === this.f()?.estado.forma));

  protected mudarForma(id: string): void {
    this.mut((f) => (f.estado.forma = id));
  }
  protected mudarLua(i: number): void {
    this.mut((f) => (f.estado.lua = i));
  }

  protected readonly atributosForma = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    return todosAtributos(l).map((a) => {
      const r = l.tipo === 'lobisomem' ? atributoNaForma(f, l, a.id) : { valor: valor(f, 'atr:' + a.id, l), delta: 0 };
      return { nome: a.nome, curto: a.nome.slice(0, 3), ...r };
    });
  });

  protected readonly furia = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l?.luas?.length) return null;
    const lua = l.luas[Math.min(f.estado.lua, l.luas.length - 1)];
    const ausp = l.auspicios?.find((a) => a.id === f.auspicio);
    const propria = !!ausp && slug(ausp.lua).includes(slug(lua.nome).split('-')[0]);
    const crinos = f.estado.forma === 'crinos';
    const dif = lua.dificuldade - (propria || crinos ? 1 : 0);
    let nota = `Lua ${lua.nome.toLowerCase()}: dif. ${lua.dificuldade}.`;
    if (propria || crinos) nota += ` ${propria ? 'Lua do seu augúrio' : 'Em Crinos'}: −1 (não acumula).`;
    nota += ' 4+ sucessos = frenesi.';
    return { dif, nota };
  });

  // ---------- rolagens ----------

  protected readonly opcoesTraco = computed(() => {
    const l = this.linha();
    if (!l) return [];
    const out = [
      ...todosAtributos(l).map((a) => ({ chave: 'atr:' + a.id, nome: a.nome, grupo: 'Atributos' })),
      ...todasHabilidades(l).map((h) => ({ chave: 'hab:' + h.id, nome: h.nome, grupo: 'Habilidades' })),
      ...(l.disciplinas ?? []).filter((d) => this.v('dis:' + d.id) > 0).map((d) => ({ chave: 'dis:' + d.id, nome: d.nome, grupo: 'Disciplinas' })),
      ...this.virtudes().map((v) => ({ chave: 'vir:' + slug(v), nome: v, grupo: 'Virtudes' })),
      { chave: 'fv', nome: 'Força de Vontade', grupo: 'Outros' },
    ];
    if (l.tipo === 'lobisomem') out.push({ chave: 'furia', nome: 'Fúria', grupo: 'Outros' }, { chave: 'gnose', nome: 'Gnose', grupo: 'Outros' });
    return out;
  });

  protected readonly virtudes = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l && l.tipo !== 'lobisomem' ? virtudesDe(l, f) : [];
  });

  protected readonly rolagens = computed<RolagemPronta[]>(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    const salvas = f.rolagens.map((r) => ({ ...r, salva: true }));
    const padrao: RolagemPronta[] = [];
    const tem = (c: string) => this.opcoesTraco().some((o) => o.chave === c);
    const add = (nome: string, a: string, b: string, dif = 6) => {
      if (tem(a) && tem(b)) padrao.push({ id: 'p-' + nome, nome, tracos: [a, b], dificuldade: dif, salva: false });
    };
    add('Ataque desarmado', 'atr:destreza', 'hab:briga');
    add('Esquiva', 'atr:destreza', 'hab:esquiva');
    add('Perceber algo', 'atr:percepcao', 'hab:prontidao');
    if (l.tipo === 'lobisomem') {
      padrao.push({ id: 'p-mudar', nome: 'Mudar de forma', tracos: ['atr:vigor', 'hab:instinto-primitivo'], dificuldade: this.formaAtual()?.dificuldade ?? 6, salva: false });
      padrao.push({ id: 'p-furia', nome: 'Teste de Fúria', tracos: ['furia'], dificuldade: this.furia()?.dif ?? 6, salva: false });
    } else {
      const v1 = this.virtudes()[1];
      if (v1) padrao.push({ id: 'p-auto', nome: 'Resistir ao frenesi', tracos: ['vir:' + slug(v1)], dificuldade: 6, salva: false });
    }
    return [...salvas, ...padrao];
  });

  protected parada(tracos: string[]): number {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return 0;
    const soma = tracos.reduce((s, t) => s + valorParaRolagem(f, l, t), 0);
    const pen = this.penalidade();
    const somenteRecurso = tracos.length === 1 && ['furia', 'gnose', 'fv'].includes(tracos[0]) || tracos[0]?.startsWith('vir:');
    return Math.max(0, soma + (pen && !somenteRecurso ? pen : 0));
  }

  protected formula(tracos: string[]): string {
    const l = this.linha();
    return l ? tracos.map((t) => nomeTraco(l, t)).join(' + ') : '';
  }

  protected rolarPronta(r: RolagemPronta): void {
    if (this.penalidade() === null) {
      this.aviso.set('Incapacitado: o personagem não pode agir.');
      return;
    }
    this.aviso.set('');
    const dif = r.salva ? r.dificuldade : r.dificuldade;
    this.executar(`${r.nome} · dif. ${dif}`, this.parada(r.tracos), dif);
  }

  protected rolarLivre(): void {
    const tracos = [this.novoA(), this.novoB()].filter(Boolean);
    if (!tracos.length) return;
    this.executar(`${this.formula(tracos)} · dif. ${this.dificuldade()}`, this.parada(tracos), this.dificuldade());
  }

  private executar(rotulo: string, n: number, dif: number): void {
    const fv = this.usarFv();
    if (fv) {
      if ((this.f()?.estado.fv ?? 0) <= 0) {
        this.aviso.set('Sem Força de Vontade para gastar.');
        return;
      }
      this.ajustar('fv', -1);
    }
    const anterior = this.resultado();
    if (anterior) this.historico.update((h) => [{ rotulo: this.rotulo(), texto: anterior.texto }, ...h].slice(0, 8));
    this.resultado.set(rolar(n, dif, fv));
    this.rotulo.set(rotulo);
    this.usarFv.set(false);
  }

  protected salvarRolagem(): void {
    const tracos = [this.novoA(), this.novoB()].filter(Boolean);
    if (!tracos.length) return;
    const nome = this.novoNome().trim() || this.formula(tracos);
    this.mut((f) => f.rolagens.push({ id: novoId(), nome, tracos, dificuldade: this.dificuldade() }));
    this.novoNome.set('');
    this.montando.set(false);
  }

  protected apagarRolagem(id: string): void {
    this.mut((f) => (f.rolagens = f.rolagens.filter((r) => r.id !== id)));
  }

  // ---------- ficha ----------

  protected readonly habilidadesComPontos = computed(() => {
    const l = this.linha();
    if (!l) return [];
    return (['talentos', 'pericias', 'conhecimentos'] as const).map((g) => ({
      nome: g === 'talentos' ? 'Talentos' : g === 'pericias' ? 'Perícias' : 'Conhecimentos',
      itens: l.habilidades[g].map((h) => ({ nome: h.nome, valor: this.v('hab:' + h.id) })).filter((x) => x.valor > 0),
    }));
  });

  protected readonly antecedentes = computed(() => (this.linha()?.antecedentes ?? []).map((a) => ({ nome: a.nome, valor: this.v('ant:' + a.id) })).filter((x) => x.valor > 0));

  protected readonly qualidades = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    return f.qualidades.map((id) => l.qualidades.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q);
  });

  protected readonly trilhaNome = computed(() => {
    const f = this.f();
    const l = this.linha();
    return f && l ? nomeTrilha(l, f) : '';
  });

  protected readonly trilha = computed(() => this.linha()?.trilhas?.find((t) => t.id === this.f()?.trilha) ?? this.linha()?.trilhas?.[0]);

  // Renome e Posto (Garou)
  protected ajustarRenome(campo: 'gloria' | 'honra' | 'sabedoria' | 'gloriaT' | 'honraT' | 'sabedoriaT', delta: number): void {
    this.mut((f) => (f.renome[campo] = Math.max(0, Math.min(10, f.renome[campo] + delta))));
  }

  protected readonly proximoPosto = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l?.postos) return null;
    const prox = l.postos.find((p) => p.posto === f.posto + 1);
    if (!prox || !f.auspicio) return null;
    const exigido = prox.exigido[f.auspicio] ?? prox.exigido['ragabash'];
    if (!exigido) return null;
    if (exigido.total != null) {
      const atual = f.renome.gloria + f.renome.honra + f.renome.sabedoria;
      return { nome: prox.nome, texto: `Renome total ${atual} de ${exigido.total}`, pronto: atual >= exigido.total };
    }
    const faltas: string[] = [];
    if ((exigido.gloria ?? 0) > f.renome.gloria) faltas.push(`${(exigido.gloria ?? 0) - f.renome.gloria} de Glória`);
    if ((exigido.honra ?? 0) > f.renome.honra) faltas.push(`${(exigido.honra ?? 0) - f.renome.honra} de Honra`);
    if ((exigido.sabedoria ?? 0) > f.renome.sabedoria) faltas.push(`${(exigido.sabedoria ?? 0) - f.renome.sabedoria} de Sabedoria`);
    return { nome: prox.nome, texto: faltas.length ? 'Faltam ' + faltas.join(', ') : 'Renome suficiente — falta o desafio', pronto: !faltas.length };
  });

  protected readonly nomePosto = computed(() => this.linha()?.postos?.find((p) => p.posto === this.f()?.posto)?.nome ?? '');

  protected mudarPosto(delta: number): void {
    this.mut((f) => (f.posto = Math.max(0, Math.min(5, f.posto + delta))));
  }

  // ---------- poderes ----------

  protected readonly disciplinas = computed(() => (this.linha()?.disciplinas ?? []).filter((d) => this.v('dis:' + d.id) > 0));
  protected readonly dons = computed(() => {
    const f = this.f();
    if (!f) return [];
    return (this.linha()?.dons ?? []).filter((d) => this.v('dom:' + d.id) > 0 || f.base['dom:' + d.id]);
  });
  protected readonly numinas = computed(() => (this.linha()?.numina ?? []).filter((n) => this.v('num:' + n.id) > 0));
  protected readonly abertos = signal<Record<string, boolean>>({});
  protected alternar(id: string): void {
    this.abertos.update((m) => ({ ...m, [id]: !m[id] }));
  }

  // ---------- evoluir ----------

  protected readonly xpLivre = computed(() => {
    const f = this.f();
    return f ? f.xp.total - xpGasto(f) : 0;
  });

  protected ganharXp(): void {
    const n = Math.floor(this.xpNovo());
    if (!n) return;
    this.mut((f) => (f.xp.total = Math.max(0, f.xp.total + n)));
    this.xpNovo.set(0);
  }

  protected readonly evoluiveis = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return [];
    const tabela = this.config.regras().xp[l.id];
    const item = (chave: string, nome: string) => ({ chave, nome, atual: valor(f, chave, l), ...custoEvolucao(f, l, chave, tabela) });
    const grupos: { nome: string; itens: ReturnType<typeof item>[] }[] = [
      { nome: 'Atributos', itens: todosAtributos(l).map((a) => item('atr:' + a.id, a.nome)) },
      { nome: 'Habilidades', itens: todasHabilidades(l).map((h) => item('hab:' + h.id, h.nome)) },
    ];
    if (l.tipo === 'vampiro') grupos.push({ nome: 'Disciplinas', itens: (l.disciplinas ?? []).map((d) => item('dis:' + d.id, d.nome)) });
    if (l.tipo === 'cacador') grupos.push({ nome: 'Numina', itens: (l.numina ?? []).filter((n) => this.v('num:' + n.id) > 0).map((n) => item('num:' + n.id, n.nome)) });
    if (l.tipo !== 'lobisomem') {
      grupos.push({ nome: 'Virtudes', itens: this.virtudes().map((v) => item('vir:' + slug(v), v)) });
      grupos.push({ nome: 'Moral e vontade', itens: [item('trilha', this.trilhaNome()), item('fv', 'Força de Vontade')] });
    } else {
      grupos.push({ nome: 'Fúria, Gnose e Vontade', itens: [item('furia', 'Fúria'), item('gnose', 'Gnose'), item('fv', 'Força de Vontade')] });
    }
    grupos.push({ nome: 'Antecedentes', itens: l.antecedentes.map((a) => item('ant:' + a.id, a.nome)) });
    return grupos;
  });

  protected readonly donsParaAprender = computed(() => {
    const f = this.f();
    const l = this.linha();
    if (!f || !l || l.tipo !== 'lobisomem') return [];
    const tabela = this.config.regras().xp[l.id];
    const proprios = [f.raca, f.auspicio, f.tribo].filter(Boolean) as string[];
    return (l.dons ?? [])
      .filter((d) => !this.v('dom:' + d.id) && d.nivel <= Math.max(1, f.posto) && d.grupos.some((g) => proprios.includes(g)))
      .map((d) => ({ d, ...custoEvolucao(f, l, 'dom:' + d.id, tabela) }));
  });

  protected evoluir(chave: string, nome: string, custo: number | null): void {
    const l = this.linha();
    if (!l) return;
    if (custo == null) {
      this.aviso.set(`${nome}: a tabela da mesa não tem custo para isso. Combine com o narrador e ajuste em Ajustes.`);
      return;
    }
    if (custo > this.xpLivre()) {
      this.aviso.set(`Faltam ${custo - this.xpLivre()} XP para ${nome}.`);
      return;
    }
    const atual = this.v(chave);
    if (!confirm(`Gastar ${custo} XP em ${nome} (${atual} → ${atual + 1})?`)) return;
    this.aviso.set('');
    this.mut((f) => {
      f.xpComprado[chave] = (f.xpComprado[chave] ?? 0) + 1;
      f.xp.log.unshift({ data: new Date().toISOString(), item: nome, de: atual, para: atual + 1, custo });
    });
  }

  protected desfazer(i: number): void {
    const f = this.f();
    const l = this.linha();
    if (!f || !l) return;
    const reg = f.xp.log[i];
    if (!reg || !confirm(`Desfazer "${reg.item}" e devolver ${reg.custo} XP?`)) return;
    const chave = this.chavePorNome(reg.item);
    this.mut((x) => {
      x.xp.log.splice(i, 1);
      if (chave && x.xpComprado[chave]) {
        x.xpComprado[chave] -= 1;
        if (x.xpComprado[chave] <= 0) delete x.xpComprado[chave];
      }
    });
  }

  private chavePorNome(nome: string): string | undefined {
    for (const g of this.evoluiveis()) for (const it of g.itens) if (it.nome === nome) return it.chave;
    return this.linha()?.dons?.find((d) => d.nome === nome) ? 'dom:' + this.linha()!.dons!.find((d) => d.nome === nome)!.id : undefined;
  }

  protected dataCurta(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  // ---------- notas ----------

  protected salvarAnotacoes(t: string): void {
    this.mut((f) => (f.anotacoes = t));
  }

  protected async enviar(): Promise<void> {
    const f = this.f();
    if (!f) return;
    const r = await enviarFicha(f);
    if (r === 'baixada') this.aviso.set('O arquivo da ficha foi baixado. Mande para o narrador pelo WhatsApp ou e-mail; ele abre em Fichas › Receber ficha.');
  }

  protected virKey(nome: string): string {
    return 'vir:' + slug(nome);
  }

  protected readonly Math = Math;
}
