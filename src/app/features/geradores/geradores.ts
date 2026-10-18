import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Geradores } from '../../core/models';
import { NotasService } from '../../core/notas.service';
import { Icon } from '../../shared/icon';

type Tipo = 'nome' | 'refugio' | 'local' | 'cena' | 'gancho';

const TIPOS: { id: Tipo; nome: string; desc: string }[] = [
  { id: 'nome', nome: 'Nome', desc: 'pessoa' },
  { id: 'refugio', nome: 'Refúgio', desc: 'onde dormir' },
  { id: 'local', nome: 'Local', desc: 'para cena' },
  { id: 'cena', nome: 'Cena', desc: 'conflito' },
  { id: 'gancho', nome: 'Gancho', desc: 'aventura' },
];

function sorteio(n: number): number {
  return Math.floor(Math.random() * Math.max(n, 1));
}

@Component({
  selector: 'app-geradores',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="spread" style="align-items: center"><h1>Geradores</h1><span class="row-wrap"><a routerLink="/mapas" class="btn btn-sm">Mapas</a><a routerLink="/npc" class="btn btn-sm">NPC completo</a></span></div>
      <div class="panels">
        <div class="col">
          <div class="seg" role="group" aria-label="Época">
            <button type="button" [attr.aria-pressed]="epoca() === 'moderno'" (click)="epoca.set('moderno'); gerar()">Noites modernas</button>
            <button type="button" [attr.aria-pressed]="epoca() === 'medieval'" (click)="epoca.set('medieval'); gerar()">Idade das Trevas (1197)</button>
          </div>
          <div class="grid-3" role="group" aria-label="O que gerar">
            @for (t of tipos; track t.id) {
              <button type="button" class="tipo" [class.on]="tipo() === t.id" [attr.aria-pressed]="tipo() === t.id" (click)="tipo.set(t.id); gerar()">{{ t.nome }}<span class="tiny">{{ t.desc }}</span></button>
            }
            <a routerLink="/npc" class="tipo">NPC<span class="tiny">ficha completa</span></a>
            <a routerLink="/mapas" class="tipo">Mapa<span class="tiny">Watabou</span></a>
          </div>
        </div>
        <div class="col">
          @if (resultado(); as r) {
            <article class="card" style="min-height: 220px">
              <span class="eyebrow gold">{{ rotulo() }}</span>
              <h2 style="font-size: 32px">{{ r.titulo }}</h2>
              <p class="small" style="color: var(--text-2)"><strong style="color: var(--text)">{{ r.a.k }}:</strong> {{ r.a.v }}</p>
              <p class="small" style="color: var(--text-2)"><strong style="color: var(--text)">{{ r.b.k }}:</strong> {{ r.b.v }}</p>
            </article>
          } @else if (erro()) {
            <p class="card card-red">{{ erro() }}</p>
          }
          <div class="row">
            <button type="button" class="btn btn-primary btn-big grow" (click)="gerar()"><app-icon name="npc" />Gerar</button>
            <button type="button" class="btn btn-big" (click)="salvar()" [disabled]="!resultado()"><app-icon name="notas" />Salvar em notas</button>
          </div>
          @if (sessao().length) {
            <section class="col" style="gap: 2px">
              <span class="eyebrow">Gerados agora</span>
              @for (s of sessao(); track $index) { <span class="small" style="padding: 6px 0; border-bottom: 1px solid var(--line)">{{ s }}</span> }
            </section>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .tipo { min-height: 64px; border-radius: 14px; border: 1px solid var(--line-2); background: var(--surface); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-weight: 600; font-size: 14px; text-decoration: none; }
    .tipo .tiny { color: var(--muted); font-weight: 400; }
    .tipo.on { border: 2px solid var(--red-2); background: var(--red-bg); color: var(--red-soft); }
  `,
})
export class GeradoresPage {
  private readonly data = inject(DataService);
  private readonly notas = inject(NotasService);
  private readonly router = inject(Router);
  protected readonly tipos = TIPOS;
  protected readonly epoca = signal<'moderno' | 'medieval'>('moderno');
  protected readonly tipo = signal<Tipo>('gancho');
  protected readonly erro = signal('');
  private readonly tabelas = signal<Geradores | null>(null);
  private readonly sorteados = signal<[number, number, number]>([0, 0, 0]);
  protected readonly sessao = signal<string[]>([]);

  protected readonly rotulo = computed(() => `${TIPOS.find((t) => t.id === this.tipo())!.nome} · ${this.epoca() === 'medieval' ? '1197' : 'moderno'}`);

  protected readonly resultado = computed(() => {
    const g = this.tabelas();
    if (!g) return null;
    const t = g[this.epoca()][this.tipo()];
    const [i, j, k] = this.sorteados();
    return {
      titulo: t.titulos[i % t.titulos.length],
      a: { k: t.a.rotulo, v: t.a.opcoes[j % t.a.opcoes.length] },
      b: { k: t.b.rotulo, v: t.b.opcoes[k % t.b.opcoes.length] },
    };
  });

  constructor() {
    this.data
      .geradores()
      .then((g) => {
        this.tabelas.set(g);
        this.gerar();
      })
      .catch(() => this.erro.set('Não consegui carregar as tabelas dos geradores.'));
  }

  protected gerar(): void {
    const g = this.tabelas();
    if (!g) return;
    const t = g[this.epoca()][this.tipo()];
    const anterior = this.resultado();
    if (anterior) this.sessao.update((s) => [`${this.rotulo()} · ${anterior.titulo}`, ...s].slice(0, 8));
    this.sorteados.set([sorteio(t.titulos.length), sorteio(t.a.opcoes.length), sorteio(t.b.opcoes.length)]);
  }

  protected salvar(): void {
    const r = this.resultado();
    if (!r) return;
    const tipoNota = this.tipo() === 'nome' ? 'npc' : this.tipo() === 'gancho' || this.tipo() === 'cena' ? 'pista' : 'lugar';
    const n = this.notas.criar({ tipo: tipoNota, titulo: r.titulo, texto: `${r.a.k}: ${r.a.v}\n${r.b.k}: ${r.b.v}\n(${this.rotulo()})` });
    this.router.navigate(['/notas', n.id]);
  }
}
