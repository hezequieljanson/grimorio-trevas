import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Alvo, RolagemAlvo, alvoDeCriatura, alvoDeFicha } from '../../core/alvo';
import { Resultado, avaliar, classeDado } from '../../core/dados';
import { Dados3dService } from '../../core/dados3d';
import { DataService } from '../../core/data.service';
import { FichasService } from '../../core/fichas.service';
import { Criatura } from '../../core/models';
import { gravar, ler, novoId } from '../../core/storage';
import { Icon } from '../../shared/icon';
import { ResultadoView } from '../../shared/resultado';

interface Salva {
  id: string;
  nome: string;
  dados: number;
  dificuldade: number;
}

@Component({
  selector: 'app-rolador',
  imports: [FormsModule, RouterLink, Icon, ResultadoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Rolador</h1>
      <div class="panels">
        <div class="col">
          <section class="card-plain">
            <div class="spread"><h2 style="font-size: 20px">Rolar para</h2>
              @if (alvo(); as a) {
                @if (a.tipo === 'ficha') { <a class="small" style="font-weight: 600; text-decoration: none" [routerLink]="['/ficha', a.id]">Abrir ficha</a> }
                @else { <a class="small" style="font-weight: 600; text-decoration: none" routerLink="/bestiario" [queryParams]="{ id: a.id }">Abrir no bestiário</a> }
              }
            </div>
            <div class="seg" role="group" aria-label="Associar a">
              <button type="button" [attr.aria-pressed]="tipoAlvo() === 'nada'" (click)="associar('nada', '')">Ninguém</button>
              <button type="button" [attr.aria-pressed]="tipoAlvo() === 'ficha'" (click)="associar('ficha', fichaId() || (fichas.prontas()[0]?.id ?? ''))">Ficha</button>
              <button type="button" [attr.aria-pressed]="tipoAlvo() === 'criatura'" (click)="associar('criatura', criaturaId() || (criaturas()[0]?.id ?? ''))">Bestiário</button>
            </div>
            @if (tipoAlvo() === 'ficha') {
              @if (fichas.prontas().length) {
                <select class="select" aria-label="Ficha" [ngModel]="fichaId()" (ngModelChange)="associar('ficha', $event)">
                  @for (f of fichas.prontas(); track f.id) { <option [value]="f.id">{{ f.nome || 'Sem nome' }}</option> }
                </select>
              } @else { <span class="small muted">Nenhuma ficha concluída ainda.</span> }
            }
            @if (tipoAlvo() === 'criatura') {
              <select class="select" aria-label="Criatura do bestiário" [ngModel]="criaturaId()" (ngModelChange)="associar('criatura', $event)">
                @for (g of gruposCriaturas(); track g.nome) {
                  <optgroup [label]="g.nome">
                    @for (c of g.itens; track c.id) { <option [value]="c.id">{{ c.nome }}</option> }
                  </optgroup>
                }
              </select>
            }
            @if (alvo(); as a) {
              <div class="spread"><strong class="serif" style="font-size: 22px">{{ a.nome }}</strong><span class="tiny muted">{{ a.subtitulo }}</span></div>
              @for (av of a.avisos; track av) { <span class="tiny gold">{{ av }}</span> }
              @for (r of a.rolagens; track $index) {
                <button type="button" class="rolagem" (click)="rolarAlvo(r)">
                  <span class="col grow" style="gap: 1px; text-align: left"><strong>{{ r.nome }}</strong><span class="tiny muted">{{ r.formula }} · dif. {{ r.dificuldade }}{{ r.nota ? ' · ' + r.nota : '' }}</span></span>
                  <span class="red" style="font-weight: 700">{{ r.dados }}d</span>
                </button>
              }
              @if (a.tracos.length) {
                <details class="small">
                  <summary style="cursor: pointer; font-weight: 600">Rolagem livre com os traços de {{ a.nome }}</summary>
                  <div class="grid-2" style="margin-top: 8px">
                    <select class="select" aria-label="Primeiro traço" [ngModel]="livreA()" (ngModelChange)="livreA.set($event)">
                      <option value="">—</option>
                      @for (t of a.tracos; track t.nome) { <option [value]="t.nome">{{ t.nome }} ({{ t.valor }})</option> }
                    </select>
                    <select class="select" aria-label="Segundo traço" [ngModel]="livreB()" (ngModelChange)="livreB.set($event)">
                      <option value="">—</option>
                      @for (t of a.tracos; track t.nome) { <option [value]="t.nome">{{ t.nome }} ({{ t.valor }})</option> }
                    </select>
                  </div>
                  <button type="button" class="btn btn-sm" style="margin-top: 8px" (click)="usarLivre()">Usar {{ paradaLivre() }} dados</button>
                </details>
              }
              @if (a.poderes.length) {
                <details class="small">
                  <summary style="cursor: pointer; font-weight: 600">O que {{ a.nome }} pode fazer ({{ a.poderes.length }})</summary>
                  @for (p of a.poderes; track p.nome) {
                    <p style="margin-top: 8px"><strong>{{ p.nome }}:</strong> <span style="color: var(--text-3)">{{ p.desc }}</span></p>
                  }
                </details>
              }
            }
          </section>

          @if (salvas().length) {
            <div class="chips-scroll">
              @for (s of salvas(); track s.id) {
                <span class="row" style="gap: 2px">
                  <button type="button" class="chip" (click)="usar(s)">{{ s.nome }} · {{ s.dados }}</button>
                  <button type="button" class="btn btn-icon btn-sm" [attr.aria-label]="'Apagar ' + s.nome" (click)="apagar(s.id)"><app-icon name="fechar" [size]="14" /></button>
                </span>
              }
            </div>
          }
          <div class="grid-2">
            <div class="card-plain">
              <span class="tiny muted">Dados</span>
              <div class="spread" style="align-items: center">
                <button type="button" class="btn btn-icon" aria-label="Menos dados" (click)="dados.set(Math.max(1, dados() - 1))"><app-icon name="menos" /></button>
                <strong style="font-size: 28px">{{ dados() }}</strong>
                <button type="button" class="btn btn-icon" aria-label="Mais dados" (click)="dados.set(Math.min(30, dados() + 1))"><app-icon name="mais" /></button>
              </div>
            </div>
            <div class="card-plain">
              <span class="tiny muted">Dificuldade</span>
              <div class="spread" style="align-items: center">
                <button type="button" class="btn btn-icon" aria-label="Diminuir dificuldade" (click)="dif.set(Math.max(2, dif() - 1))"><app-icon name="menos" /></button>
                <strong style="font-size: 28px">{{ dif() }}</strong>
                <button type="button" class="btn btn-icon" aria-label="Aumentar dificuldade" (click)="dif.set(Math.min(10, dif() + 1))"><app-icon name="mais" /></button>
              </div>
            </div>
          </div>
          <div class="card-plain" style="gap: 2px">
            <label class="check"><input type="checkbox" [checked]="fv()" (change)="fv.set(!fv())" /><span class="col" style="gap: 0">Gastar Força de Vontade<span class="tiny muted">+1 sucesso automático, 1 vez por turno</span></span></label>
            <label class="check"><input type="checkbox" [checked]="prolongada()" (change)="alternarProlongada()" /><span class="col" style="gap: 0">Ação prolongada<span class="tiny muted">Soma os sucessos de vários turnos até a meta</span></span></label>
            <label class="check"><input type="checkbox" [checked]="d3.ativo()" (change)="d3.alternar()" /><span class="col" style="gap: 0">Dados 3D na tela<span class="tiny muted">Os dados caem na tela com física; o resultado é o que cair</span></span></label>
            <label class="check"><input type="checkbox" [checked]="secreta()" (change)="secreta.set(!secreta())" /><span class="col" style="gap: 0">Rolagem secreta<span class="tiny muted">O resultado fica escondido até você tocar</span></span></label>
          </div>
          @if (prolongada()) {
            <div class="card card-gold">
              <div class="spread small"><strong class="gold">Ação prolongada</strong>
                <span class="row">Meta <input type="number" class="num" aria-label="Meta de sucessos" [ngModel]="meta()" (ngModelChange)="meta.set(+$event || 1)" /></span>
              </div>
              <div class="spread small"><span>{{ acumulado() }} de {{ meta() }} sucessos</span>@if (acumulado() >= meta()) { <strong class="green">Concluída!</strong> }</div>
              <div class="progress" aria-hidden="true"><span style="background: var(--gold)" [style.width.%]="Math.min(100, (acumulado() / meta()) * 100)"></span></div>
              <button type="button" class="btn btn-sm" style="align-self: flex-start" (click)="acumulado.set(0)">Recomeçar</button>
            </div>
          }
          <button type="button" class="btn btn-primary btn-big" (click)="rolarAgora()">Rolar {{ dados() }} dados</button>
          <section class="card-plain">
            <div class="spread"><h2 style="font-size: 20px">Rolei dados de verdade</h2>
              @if (fisicos().length) { <button type="button" class="btn btn-sm" (click)="fisicos.set([])">Limpar</button> }
            </div>
            <span class="tiny muted">Toque no número que saiu em cada dado. O site conta os sucessos com a dificuldade {{ dif() }}.</span>
            <div class="teclado" role="group" aria-label="Resultado de cada dado">
              @for (n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track n) {
                <button type="button" class="tecla-dado" [attr.aria-label]="'Saiu ' + n" (click)="addFisico(n)">{{ n }}</button>
              }
            </div>
            @if (fisicos().length) {
              <div class="dice" aria-label="Dados lançados">
                @for (d of fisicos(); track $index) {
                  <button type="button" [class]="classe(d)" style="border-style: solid; cursor: pointer" [attr.aria-label]="'Tirar o dado ' + d" (click)="tirarFisico($index)">{{ d }}</button>
                }
              </div>
              <div class="spread"><span class="small">{{ fisicos().length }} dados · dif. {{ dif() }}{{ fv() ? ' · com Força de Vontade' : '' }}</span>
                <strong [style.color]="corFisico()" style="font-size: 18px">{{ resultadoFisico()?.texto }}</strong></div>
              <button type="button" class="btn btn-sm" style="align-self: flex-start" (click)="registrarFisico()">Guardar no histórico</button>
            }
          </section>
          <div class="row">
            <input class="input grow" aria-label="Nome da rolagem para salvar" placeholder="Nome para salvar (ex.: Ataque com faca)" [ngModel]="nome()" (ngModelChange)="nome.set($event)" />
            <button type="button" class="btn" (click)="salvar()"><app-icon name="salvar" [size]="18" />Salvar</button>
          </div>
        </div>

        <div class="col">
          <span id="resultado-rolagem"></span>
          @if (escondido()) {
            <button type="button" class="btn btn-big" style="border-style: dashed; color: var(--red-soft)" (click)="escondido.set(false)">Rolagem secreta feita · toque para ver</button>
          } @else {
            <app-resultado [r]="resultado()" [rotulo]="rotulo()" />
          }
          @if (historico().length) {
            <section class="col" style="gap: 2px">
              <span class="eyebrow">Histórico</span>
              @for (h of historico(); track $index) {
                <div class="spread small" style="padding: 6px 0; border-bottom: 1px solid var(--line)"><span style="color: var(--text-3)">{{ h.rotulo }}</span><strong>{{ h.texto }}</strong></div>
              }
            </section>
          }
          <p class="tiny muted">Regra: cada dado igual ou acima da dificuldade é um sucesso; cada 1 cancela um sucesso; nenhum sucesso com algum 1 é falha crítica.</p>
        </div>
      </div>
    </div>
  `,
  styles: `.teclado { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; } .tecla-dado { min-height: 46px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--bg); color: var(--text); font-weight: 700; font-size: 17px; } .tecla-dado:active { background: var(--red-bg); } .rolagem { display: flex; align-items: center; gap: 10px; min-height: 50px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--bg); color: var(--text); width: 100%; } .rolagem:hover { border-color: var(--line-3); }`,
})
export class Rolador {
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(DataService);
  protected readonly fichas = inject(FichasService);
  private readonly params = toSignal(
    this.rota.queryParamMap.pipe(map((p) => ({ ficha: p.get('ficha') ?? '', criatura: p.get('criatura') ?? '' }))),
    { initialValue: { ficha: '', criatura: '' } },
  );
  protected readonly tipoAlvo = signal<'nada' | 'ficha' | 'criatura'>('nada');
  protected readonly fichaId = signal('');
  protected readonly criaturaId = signal('');
  protected readonly criaturas = signal<Criatura[]>([]);
  protected readonly livreA = signal('');
  protected readonly livreB = signal('');

  constructor() {
    this.data.bestiario().then((b) => this.criaturas.set(b));
    // ?ficha=id ou ?criatura=id vindos do bestiário ou da ficha
    effect(() => {
      const p = this.params();
      if (p.ficha) {
        this.tipoAlvo.set('ficha');
        this.fichaId.set(p.ficha);
      } else if (p.criatura) {
        this.tipoAlvo.set('criatura');
        this.criaturaId.set(p.criatura);
      }
    });
    effect(() => {
      const f = this.fichas.porId(this.fichaId());
      if (this.tipoAlvo() === 'ficha' && f) this.data.linha(f.linha);
    });
  }

  protected readonly gruposCriaturas = computed(() => {
    const m = new Map<string, Criatura[]>();
    for (const c of this.criaturas()) m.set(c.categoria, [...(m.get(c.categoria) ?? []), c]);
    return [...m].map(([nome, itens]) => ({ nome, itens }));
  });

  protected readonly alvo = computed<Alvo | null>(() => {
    if (this.tipoAlvo() === 'criatura') {
      const c = this.criaturas().find((x) => x.id === this.criaturaId());
      return c ? alvoDeCriatura(c) : null;
    }
    if (this.tipoAlvo() === 'ficha') {
      const f = this.fichas.fichas().find((x) => x.id === this.fichaId());
      const l = f ? this.data.linhas()[f.linha] : undefined;
      return f && l ? alvoDeFicha(f, l) : null;
    }
    return null;
  });

  protected associar(tipo: 'nada' | 'ficha' | 'criatura', id: string): void {
    this.tipoAlvo.set(tipo);
    if (tipo === 'ficha') this.fichaId.set(id);
    if (tipo === 'criatura') this.criaturaId.set(id);
    this.livreA.set('');
    this.livreB.set('');
    const qp = tipo === 'ficha' && id ? { ficha: id } : tipo === 'criatura' && id ? { criatura: id } : {};
    this.router.navigate([], { queryParams: qp, replaceUrl: true });
  }

  protected rolarAlvo(r: RolagemAlvo): void {
    this.dados.set(Math.max(1, r.dados));
    this.dif.set(r.dificuldade);
    this.rotuloBase = `${this.alvo()?.nome} · ${r.nome}`;
    this.rolarAgora();
  }

  protected readonly paradaLivre = computed(() => {
    const t = this.alvo()?.tracos ?? [];
    const val = (n: string) => t.find((x) => x.nome === n)?.valor ?? 0;
    return val(this.livreA()) + val(this.livreB());
  });

  protected usarLivre(): void {
    if (!this.paradaLivre()) return;
    this.dados.set(this.paradaLivre());
    this.rotuloBase = `${this.alvo()?.nome} · ${[this.livreA(), this.livreB()].filter(Boolean).join(' + ')}`;
  }


  protected readonly dados = signal(6);
  protected readonly dif = signal(6);
  protected readonly fv = signal(false);
  protected readonly prolongada = signal(false);
  protected readonly secreta = signal(false);
  protected readonly escondido = signal(false);
  protected readonly meta = signal(10);
  protected readonly acumulado = signal(0);
  protected readonly nome = signal('');
  protected readonly resultado = signal<Resultado | null>(null);
  protected readonly rotulo = signal('');
  protected readonly historico = signal<{ rotulo: string; texto: string }[]>([]);
  protected readonly salvas = signal<Salva[]>(ler<Salva[]>('rolagens-livres', []));
  protected readonly Math = Math;
  protected rotuloBase = '';

  protected readonly temResultado = computed(() => !!this.resultado());
  protected readonly d3 = inject(Dados3dService);

  // Dados físicos: a pessoa digita o que saiu e o site conta os sucessos
  protected readonly fisicos = signal<number[]>([]);
  protected readonly resultadoFisico = computed(() => (this.fisicos().length ? avaliar(this.fisicos(), this.dif(), this.fv()) : null));
  protected readonly corFisico = computed(() => {
    const r = this.resultadoFisico();
    if (!r) return '';
    return r.critica ? 'var(--gold)' : r.sucessos > 0 ? 'var(--red-soft)' : 'var(--muted)';
  });

  protected addFisico(n: number): void {
    if (this.fisicos().length < 30) this.fisicos.update((l) => [...l, n]);
  }

  protected tirarFisico(i: number): void {
    this.fisicos.update((l) => l.filter((_, j) => j !== i));
  }

  protected classe(d: number): string {
    return classeDado(d, this.dif());
  }

  protected registrarFisico(): void {
    const r = this.resultadoFisico();
    if (!r) return;
    this.historico.update((h) => [{ rotulo: `Dados físicos · ${r.dados.length} dados · dif. ${this.dif()}`, texto: r.texto }, ...h].slice(0, 10));
    this.fisicos.set([]);
    this.fv.set(false);
  }

  protected alternarProlongada(): void {
    this.prolongada.set(!this.prolongada());
    this.acumulado.set(0);
  }

  protected usar(s: Salva): void {
    this.dados.set(s.dados);
    this.dif.set(s.dificuldade);
    this.rotuloBase = s.nome;
  }

  protected async rolarAgora(): Promise<void> {
    const anterior = this.resultado();
    if (anterior) this.historico.update((h) => [{ rotulo: this.rotulo(), texto: anterior.texto }, ...h].slice(0, 10));
    const r = avaliar(await this.d3.rolar(this.dados()), this.dif(), this.fv());
    this.resultado.set(r);
    this.rotulo.set(`${this.rotuloBase || 'Rolagem'} · ${this.dados()} dados · dif. ${this.dif()}`);
    if (this.prolongada()) this.acumulado.set(r.critica ? 0 : Math.min(this.meta(), this.acumulado() + r.sucessos));
    this.escondido.set(this.secreta());
    this.fv.set(false);
    if (window.innerWidth < 900) setTimeout(() => document.getElementById('resultado-rolagem')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  protected salvar(): void {
    const nome = this.nome().trim() || `${this.dados()} dados, dif. ${this.dif()}`;
    const lista = [...this.salvas(), { id: novoId(), nome, dados: this.dados(), dificuldade: this.dif() }];
    this.salvas.set(lista);
    gravar('rolagens-livres', lista);
    this.rotuloBase = nome;
    this.nome.set('');
  }

  protected apagar(id: string): void {
    const lista = this.salvas().filter((s) => s.id !== id);
    this.salvas.set(lista);
    gravar('rolagens-livres', lista);
  }
}
