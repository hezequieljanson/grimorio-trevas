import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RolagemAlvo } from '../../core/alvo';
import { ConfigService } from '../../core/config.service';
import { DataService } from '../../core/data.service';
import { Resultado, avaliar } from '../../core/dados';
import { Dados3dService } from '../../core/dados3d';
import { FichasService } from '../../core/fichas.service';
import { Criatura, Geradores, Linha } from '../../core/models';
import { NotasService } from '../../core/notas.service';
import {
  ATITUDES,
  AtitudeId,
  NpcGerado,
  OPCOES_PADRAO,
  OpcoesNpc,
  PAPEIS,
  PARTES,
  PERFIS,
  ParteNpc,
  PerfilId,
  PoderNpc,
  TipoNpc,
  aplicarTravas,
  gerarDeCriatura,
  gerarNpc,
  linhaDoNpc,
  opcoesComTravas,
  paradasNpc,
  poderesDisponiveis,
  rolagensNpc,
  seitasDe,
  subirPoder,
  textoNpc,
} from '../../core/npc';
import { NpcsService, fichaDeNpc } from '../../core/npcs.service';
import { gravar, ler } from '../../core/storage';
import { Icon } from '../../shared/icon';
import { ResultadoView } from '../../shared/resultado';

const MAX_PODERES = 3;

@Component({
  selector: 'app-npc',
  imports: [RouterLink, FormsModule, Icon, ResultadoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './npc.html',
  styles: `
    details.card-plain > summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-weight: 600; min-height: 32px; }
    details.card-plain > summary::-webkit-details-marker { display: none; }
    details.card-plain[open] > summary app-icon { transform: rotate(180deg); }
    .resumo-escolha { font-weight: 400; font-size: 12px; color: var(--gold); text-align: right; }
    .perfis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .perfil { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line-2); background: transparent; color: var(--text); text-align: left; font-weight: 600; font-size: 14px; }
    .perfil span { font-weight: 400; font-size: 11.5px; color: var(--muted); }
    .perfil[aria-pressed='true'] { border-color: var(--red-2); background: var(--red-bg); }
    .atr-linha { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 40px; border-bottom: 1px solid var(--line); }
    .passos { display: flex; gap: 3px; }
    .passos button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line-2); background: transparent; color: var(--muted); font-size: 12px; font-weight: 700; padding: 0; }
    .passos button[aria-pressed='true'] { background: var(--red); border-color: var(--red); color: var(--on-red); }
    .trava { display: inline-flex; align-items: center; gap: 4px; min-height: 30px; padding: 0 9px; border-radius: 15px; border: 1px solid var(--line-2); background: transparent; color: var(--muted); font-size: 12px; font-weight: 600; }
    .trava[aria-pressed='true'] { border-color: var(--gold); color: var(--gold); background: var(--gold-bg); }
    .mini { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--line-2); background: transparent; color: var(--text); text-align: left; width: 100%; }
    .mini[aria-pressed='true'] { border-color: var(--red-2); background: var(--red-bg); }
    .rolar-npc { display: flex; flex-direction: column; gap: 1px; padding: 7px 10px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--bg); color: var(--text); text-align: left; font-size: 13px; font-weight: 600; }
    .rolar-npc span { font-size: 11px; font-weight: 400; color: var(--muted); }
    .rolagens { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .atitude-aliado { background: #16281c; color: #8fd19e; }
    .atitude-neutro { background: var(--line-2); color: var(--text-2); }
    .atitude-rival { background: var(--gold-bg); color: var(--gold); }
    .atitude-inimigo { background: var(--red-bg-2); color: var(--red-soft); }
    @media (min-width: 900px) { .rolagens { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  `,
})
export class Npc {
  private readonly data = inject(DataService);
  private readonly config = inject(ConfigService);
  private readonly notasSrv = inject(NotasService);
  private readonly fichas = inject(FichasService);
  protected readonly salvos = inject(NpcsService);
  private readonly d3 = inject(Dados3dService);
  private readonly router = inject(Router);

  protected readonly perfis = PERFIS;
  protected readonly atitudes = ATITUDES;
  protected readonly partes = PARTES;
  protected readonly tipos: { id: TipoNpc; nome: string }[] = [
    { id: 'vampiro', nome: 'Vampiro' },
    { id: 'carnical', nome: 'Carniçal' },
    { id: 'cacador', nome: 'Caçador' },
    { id: 'lobisomem', nome: 'Lobisomem' },
    { id: 'mortal', nome: 'Mortal' },
    { id: 'bestiario', nome: 'Do bestiário' },
  ];
  protected readonly niveis: { id: PoderNpc; nome: string }[] = [
    { id: 'capanga', nome: 'Capanga' },
    { id: 'neofito', nome: 'Neófito' },
    { id: 'anciao', nome: 'Ancião' },
  ];

  protected readonly opcoes = signal<OpcoesNpc>({ ...OPCOES_PADRAO, ...ler<Partial<OpcoesNpc>>('npc-opcoes', {}) });
  protected readonly linha = signal<Linha | null>(null);
  private ger: Geradores | null = null;
  protected readonly criaturas = signal<Criatura[]>([]);
  protected readonly gerados = signal<NpcGerado[]>([]);
  protected readonly atualId = signal('');
  protected readonly travas = signal<Set<ParteNpc>>(new Set());
  protected readonly avancado = signal(Object.keys(this.opcoes().atributos).length > 0);
  protected readonly erro = signal('');
  protected readonly aviso = signal('');
  protected readonly rolagem = signal<{ rotulo: string; r: Resultado } | null>(null);
  protected readonly verSalvos = signal(false);

  constructor() {
    effect(() => gravar('npc-opcoes', this.opcoes()));
    this.data.bestiario().then((b) => this.criaturas.set(b));
    this.gerar();
  }

  // ---------- leituras para a tela ----------

  protected readonly atual = computed(() => {
    const lista = this.gerados();
    return lista.find((n) => n.id === this.atualId()) ?? lista[0] ?? null;
  });
  protected readonly ehSalvo = computed(() => {
    const n = this.atual();
    return !!n && this.salvos.npcs().some((x) => x.id === n.id);
  });
  protected readonly paradas = computed(() => (this.atual() ? paradasNpc(this.atual()!) : []));
  protected readonly rolagens = computed(() => (this.atual() ? rolagensNpc(this.atual()!) : []));
  protected readonly texto = computed(() => (this.atual() ? textoNpc(this.atual()!) : ''));

  protected readonly bestiario = computed(() => this.opcoes().tipo === 'bestiario');
  protected readonly papeis = computed(() => (PAPEIS[this.opcoes().tipo] ?? []).filter((p) => !p.epoca || p.epoca === this.opcoes().epoca));
  protected readonly seitas = computed(() => (this.linha() && this.opcoes().tipo === 'vampiro' ? seitasDe(this.linha()!) : []));

  /** Clãs, tribos ou organizações para escolher. */
  protected readonly grupos = computed(() => {
    const l = this.linha();
    const o = this.opcoes();
    if (!l) return [];
    if (o.tipo === 'vampiro' || o.tipo === 'carnical') return (l.clas ?? []).filter((c) => c.disciplinas.length && (!o.seita || c.seita.includes(o.seita))).map((c) => ({ id: c.id, nome: c.nome }));
    if (o.tipo === 'lobisomem') return (l.tribos ?? []).map((t) => ({ id: t.id, nome: t.nome }));
    if (o.tipo === 'cacador') return (l.organizacoes ?? []).map((t) => ({ id: t.id, nome: t.nome }));
    return [];
  });
  protected readonly rotuloGrupo = computed(() => ({ vampiro: 'Clã', carnical: 'Clã do senhor', lobisomem: 'Tribo', cacador: 'Organização', mortal: '', bestiario: '' })[this.opcoes().tipo]);
  protected readonly auspicios = computed(() => this.linha()?.auspicios ?? []);
  protected readonly racas = computed(() => this.linha()?.racas ?? []);

  protected readonly poderesLista = computed(() => (this.linha() ? poderesDisponiveis(this.linha()!, this.opcoes()) : []));
  protected readonly rotuloPoderes = computed(() => ({ vampiro: 'Disciplinas', carnical: 'Disciplinas', lobisomem: 'Dons', cacador: 'Numina', mortal: '', bestiario: '' })[this.opcoes().tipo]);

  protected readonly gruposAtributos = computed(() => {
    const l = this.linha();
    if (!l) return [];
    return [
      { nome: 'Físicos', itens: l.atributos.fisicos },
      { nome: 'Sociais', itens: l.atributos.sociais },
      { nome: 'Mentais', itens: l.atributos.mentais },
    ];
  });

  protected readonly resumoLinhagem = computed(() => {
    const o = this.opcoes();
    const nome = this.grupos().find((g) => g.id === o.grupo)?.nome;
    const partes = [o.seita, nome, this.auspicios().find((a) => a.id === o.auspicio)?.nome, this.racas().find((r) => r.id === o.raca)?.nome].filter(Boolean);
    return partes.length ? partes.join(' · ') : 'Aleatório';
  });
  protected readonly resumoPoderes = computed(() => {
    const n = this.opcoes().poderes.length;
    return n ? `${n} fixado(s)` : 'Aleatório';
  });
  protected readonly resumoAtributos = computed(() => {
    const o = this.opcoes();
    const p = PERFIS.find((x) => x.id === o.perfil)?.nome ?? '';
    const n = Object.keys(o.atributos).length;
    return n ? `${p} · ${n} fixo(s)` : p;
  });
  protected readonly resumoHistoria = computed(() => {
    const o = this.opcoes();
    const papel = this.papeis().find((p) => p.id === o.papel)?.nome;
    const at = ATITUDES.find((a) => a.id === o.atitude)?.nome;
    return [papel, at].filter(Boolean).join(' · ') || 'Aleatório';
  });

  protected readonly avisoLivro = computed(() => {
    const o = this.opcoes();
    if (o.tipo === 'bestiario') return '';
    return this.config.ativo(linhaDoNpc(o)) ? '' : 'Esse livro está desativado no Início, mas o gerador usa mesmo assim.';
  });

  protected nomeAtitude(id: AtitudeId): string {
    return ATITUDES.find((a) => a.id === id)?.nome ?? '';
  }
  protected nomeNivel(id: PoderNpc): string {
    return this.niveis.find((n) => n.id === id)?.nome ?? '';
  }
  protected bolinhas(n: number): string {
    return '●'.repeat(Math.max(0, n));
  }
  protected poderFixado(chave: string): boolean {
    return this.opcoes().poderes.includes(chave);
  }
  protected travada(p: ParteNpc): boolean {
    return this.travas().has(p);
  }

  // ---------- mudar escolhas ----------

  private mudar(parcial: Partial<OpcoesNpc>, gerarDeNovo = true): void {
    this.opcoes.update((o) => ({ ...o, ...parcial }));
    if (gerarDeNovo) this.gerar();
  }

  protected escolherTipo(t: TipoNpc): void {
    const epoca = t === 'cacador' ? 'moderno' : this.opcoes().epoca;
    this.travas.set(new Set());
    this.mudar({ tipo: t, epoca, grupo: '', seita: '', auspicio: '', raca: '', poderes: [], papel: '' });
  }
  protected escolherEpoca(e: 'moderno' | 'medieval'): void {
    this.mudar({ epoca: e, grupo: '', seita: '', poderes: [], papel: '' });
  }
  protected escolherPoder(p: PoderNpc): void {
    this.mudar({ poder: p });
  }
  protected escolherSeita(s: string): void {
    this.mudar({ seita: s, grupo: '', poderes: [] });
  }
  protected escolherGrupo(id: string): void {
    // os Dons dependem da tribo; as Disciplinas fixadas continuam valendo
    const poderes = this.opcoes().tipo === 'lobisomem' ? [] : this.opcoes().poderes;
    this.mudar({ grupo: id, poderes });
  }
  protected escolherAuspicio(id: string): void {
    this.mudar({ auspicio: id, poderes: [] });
  }
  protected escolherRaca(id: string): void {
    this.mudar({ raca: id, poderes: [] });
  }
  protected alternarPoder(chave: string): void {
    const atual = this.opcoes().poderes;
    if (atual.includes(chave)) this.mudar({ poderes: atual.filter((x) => x !== chave) });
    else if (atual.length < MAX_PODERES) this.mudar({ poderes: [...atual, chave] });
    else this.aviso.set(`Dá para fixar até ${MAX_PODERES} poderes.`);
  }
  protected limparPoderes(): void {
    this.mudar({ poderes: [] });
  }
  protected escolherPerfil(p: PerfilId): void {
    this.mudar({ perfil: p });
  }
  protected fixarAtributo(id: string, v: number): void {
    const atual = { ...this.opcoes().atributos };
    if (atual[id] === v || v === 0) delete atual[id];
    else atual[id] = v;
    this.mudar({ atributos: atual });
  }
  protected limparAtributos(): void {
    this.mudar({ atributos: {} });
  }
  protected escolherPapel(id: string): void {
    const p = this.papeis().find((x) => x.id === id);
    if (!p || this.opcoes().papel === id) this.mudar({ papel: '' });
    else this.mudar({ papel: id, perfil: p.perfil, poder: p.poder });
  }
  protected escolherAtitude(a: AtitudeId | ''): void {
    this.mudar({ atitude: a });
  }
  protected escolherQuantidade(q: number): void {
    this.mudar({ quantidade: q });
  }
  protected escolherCriatura(id: string): void {
    this.mudar({ criatura: id });
  }
  protected alternarTrava(p: ParteNpc): void {
    this.travas.update((s) => {
      const c = new Set(s);
      if (c.has(p)) c.delete(p);
      else c.add(p);
      return c;
    });
  }
  protected limparTudo(): void {
    this.travas.set(new Set());
    this.avancado.set(false);
    this.mudar({ ...OPCOES_PADRAO, tipo: this.opcoes().tipo, epoca: this.opcoes().epoca });
  }

  // ---------- gerar ----------

  private async preparar(): Promise<{ l: Linha | null; ger: Geradores }> {
    const o = this.opcoes();
    const ger = this.ger ?? (this.ger = await this.data.geradores());
    if (o.tipo === 'bestiario') {
      if (!this.criaturas().length) this.criaturas.set(await this.data.bestiario());
      this.linha.set(null);
      return { l: null, ger };
    }
    const l = await this.data.linha(linhaDoNpc(o));
    this.linha.set(l);
    return { l, ger };
  }

  private um(l: Linha | null, ger: Geradores, o: OpcoesNpc, usados: Set<string>): NpcGerado | null {
    if (o.tipo === 'bestiario') {
      const lista = this.criaturas();
      const c = lista.find((x) => x.id === o.criatura) ?? lista[Math.floor(Math.random() * lista.length)];
      return c ? gerarDeCriatura(c, ger, o, usados) : null;
    }
    return l ? gerarNpc(l, ger, o, usados) : null;
  }

  /** Gera um NPC (ou um grupo) novo com as escolhas atuais. */
  protected async gerar(): Promise<void> {
    try {
      const { l, ger } = await this.preparar();
      const o = this.opcoes();
      const usados = new Set<string>();
      const lista: NpcGerado[] = [];
      const qtd = Math.max(1, Math.min(6, o.quantidade));
      if (qtd === 1) {
        const n = this.um(l, ger, o, usados);
        if (n) lista.push(n);
      } else {
        // o líder é um nível mais forte; o resto segue o mesmo clã, tribo ou organização
        const lider = this.um(l, ger, { ...o, poder: subirPoder(o.poder) }, usados);
        if (lider) {
          lista.push({ ...lider, lider: true });
          const mesmo: OpcoesNpc = { ...o, grupo: lider.grupoId || o.grupo, criatura: o.tipo === 'bestiario' ? lider.grupoId : o.criatura };
          for (let i = 1; i < qtd; i++) {
            const n = this.um(l, ger, mesmo, usados);
            if (n) lista.push(n);
          }
        }
      }
      this.gerados.set(lista);
      this.atualId.set(lista[0]?.id ?? '');
      this.travas.set(new Set());
      this.rolagem.set(null);
      this.erro.set('');
      this.aviso.set('');
    } catch {
      this.erro.set('Não consegui carregar os dados do gerador.');
    }
  }

  /** Rola de novo só o NPC aberto, mantendo as partes travadas. */
  protected async rolarDeNovo(): Promise<void> {
    const atual = this.atual();
    if (!atual) return;
    try {
      const { l, ger } = await this.preparar();
      const travas = this.travas();
      let o = opcoesComTravas({ ...this.opcoes(), poder: atual.poder }, atual, travas);
      if (atual.tipo === 'bestiario') o = { ...o, criatura: atual.grupoId };
      const usados = new Set(this.gerados().map((n) => n.nome));
      const novo = this.um(l, ger, o, usados);
      if (!novo) return;
      const r = aplicarTravas(novo, atual, travas);
      this.gerados.update((lista) => lista.map((n) => (n.id === atual.id ? r : n)));
      if (this.ehSalvo()) this.salvos.salvar(r);
      this.rolagem.set(null);
    } catch {
      this.erro.set('Não consegui carregar os dados do gerador.');
    }
  }

  protected abrir(n: NpcGerado): void {
    this.atualId.set(n.id);
    this.rolagem.set(null);
  }

  protected abrirSalvo(n: NpcGerado): void {
    this.gerados.set([n]);
    this.atualId.set(n.id);
    this.travas.set(new Set());
    this.rolagem.set(null);
    this.verSalvos.set(false);
    window.scrollTo({ top: 0 });
  }

  // ---------- ações do NPC ----------

  protected async rolarNpc(r: RolagemAlvo): Promise<void> {
    const n = this.atual();
    const valores = await this.d3.rolar(r.dados);
    this.rolagem.set({ rotulo: `${n?.nome ?? ''} · ${r.nome} (${r.dados} dados, dif. ${r.dificuldade})`, r: avaliar(valores, r.dificuldade) });
  }

  protected alternarSalvo(): void {
    const n = this.atual();
    if (!n) return;
    if (this.ehSalvo()) this.salvos.remover(n.id);
    else this.salvos.salvar(n);
  }

  protected salvarGrupo(): void {
    for (const n of [...this.gerados()].reverse()) this.salvos.salvar(n);
    this.aviso.set(`${this.gerados().length} NPCs guardados em NPCs da crônica.`);
  }

  protected salvarEmNotas(): void {
    const n = this.atual();
    if (!n) return;
    const nota = this.notasSrv.criar({ tipo: 'npc', titulo: n.nome, texto: this.texto() });
    this.router.navigate(['/notas', nota.id]);
  }

  protected async virarFicha(): Promise<void> {
    const n = this.atual();
    if (!n?.linhaId) return;
    const l = await this.data.linha(n.linhaId);
    const f = fichaDeNpc(n, l);
    this.fichas.adicionar(f);
    this.router.navigate(['/ficha', f.id]);
  }

  protected removerSalvo(n: NpcGerado): void {
    this.salvos.remover(n.id);
  }

  protected listaHab(n: NpcGerado): string {
    return n.habilidades.map((h) => `${h.nome} ${h.valor}`).join(', ');
  }
}
