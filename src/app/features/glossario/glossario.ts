import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { norm, pontuar, termosDe } from '../../core/busca';
import { ConfigService } from '../../core/config.service';
import { DataService, LINHAS, nomeLinha } from '../../core/data.service';
import { LinhaId, Termo } from '../../core/models';
import { Icon } from '../../shared/icon';
import { TextoGlossario } from '../../shared/texto-glossario';

@Component({
  selector: 'app-glossario',
  imports: [FormsModule, RouterLink, Icon, TextoGlossario],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="spread" style="align-items: center"><h1>Glossário</h1><a routerLink="/regras" class="btn btn-sm">Regras</a></div>
      <p class="small muted">Nas regras, os termos sublinhados abrem a explicação. Aqui está a lista completa.</p>
      <form class="search" role="search" (submit)="$event.preventDefault()">
        <app-icon name="busca" />
        <input type="search" name="q" aria-label="Buscar termo" placeholder="Buscar termo: Elísio, Caern, Vitae…" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </form>
      <div class="chips-scroll" role="group" aria-label="Filtrar por livro">
        <button type="button" class="chip" [attr.aria-pressed]="filtro() === 'todos'" (click)="filtro.set('todos')">Todos</button>
        @for (l of linhas; track l.id) {
          @if (config.ativo(l.id)) { <button type="button" class="chip" [attr.aria-pressed]="filtro() === l.id" (click)="filtro.set(l.id)">{{ l.curto }}</button> }
        }
      </div>
      @if (aberto(); as t) {
        <div class="card card-gold" role="note" aria-live="polite">
          <div class="spread"><strong class="serif gold" style="font-size: 22px">{{ t.termo }}</strong><span class="tiny muted">{{ nomeLinha(t.linha, true) }}{{ t.pagina ? ' · p. ' + t.pagina : '' }}</span></div>
          <span class="small">{{ t.def }}</span>
        </div>
      }
      <div class="col" style="gap: 0">
        @for (t of lista(); track t.linha + t.termo) {
          <div class="item">
            <div class="spread"><strong>{{ t.termo }}</strong><span class="tiny muted">{{ nomeLinha(t.linha, true) }}</span></div>
            <span class="small" style="color: var(--text-3)"><app-texto-glossario [texto]="t.def" [termos]="outros(t)" (escolher)="aberto.set($event)" /></span>
          </div>
        } @empty {
          <div class="empty">Nenhum termo encontrado.</div>
        }
      </div>
    </div>
  `,
  styles: `.item { display: flex; flex-direction: column; gap: 3px; padding: 12px 0; border-bottom: 1px solid var(--line); }`,
})
export class Glossario {
  private readonly data = inject(DataService);
  protected readonly config = inject(ConfigService);
  protected readonly linhas = LINHAS;
  protected readonly nomeLinha = nomeLinha;
  protected readonly termos = signal<Termo[]>([]);
  protected readonly q = signal('');
  protected readonly filtro = signal<LinhaId | 'todos'>('todos');
  protected readonly aberto = signal<Termo | null>(null);

  constructor() {
    this.data.glossario().then((g) => this.termos.set([...g].sort((a, b) => norm(a.termo).localeCompare(norm(b.termo)))));
  }

  private readonly ativos = computed(() => this.termos().filter((t) => this.config.ativo(t.linha)));

  protected readonly lista = computed(() => {
    const f = this.filtro();
    const termos = termosDe(this.q());
    return this.ativos().filter(
      (t) => (f === 'todos' || t.linha === f) && (!termos.length || pontuar(termos, [{ texto: t.termo, peso: 3 }, { texto: t.def, peso: 1 }]) > 0),
    );
  });

  protected outros(t: Termo): Termo[] {
    return this.ativos().filter((x) => x !== t);
  }
}
