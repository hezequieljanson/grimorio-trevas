import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';

interface Gerador {
  id: string;
  nome: string;
  uso: string;
  url: string;
}

/** Geradores de mapa do Watabou (gratuitos, rodam no site dele dentro de um iframe). */
const GERADORES: Gerador[] = [
  { id: 'cidade', nome: 'Cidade', uso: 'Cidade murada com bairros, castelo e mercado', url: 'https://watabou.github.io/city-generator/' },
  { id: 'vila', nome: 'Vila', uso: 'Aldeia rural, boa para a Idade das Trevas', url: 'https://watabou.github.io/village-generator/' },
  { id: 'bairro', nome: 'Bairro', uso: 'Quarteirões de uma cidade, rua por rua', url: 'https://watabou.github.io/neighbourhood/' },
  { id: 'casa', nome: 'Casa', uso: 'Planta de casa ou refúgio, andar por andar', url: 'https://watabou.github.io/dwellings/' },
  { id: 'masmorra', nome: 'Masmorra', uso: 'Cripta ou subterrâneo de uma página', url: 'https://watabou.github.io/one-page-dungeon/' },
  { id: 'caverna', nome: 'Caverna', uso: 'Caverna ou covil de lobisomem', url: 'https://watabou.github.io/cave-generator/' },
  { id: 'regiao', nome: 'Região', uso: 'Mapa da região com costa, vilas e estradas', url: 'https://watabou.github.io/perilous-shores/' },
];

@Component({
  selector: 'app-mapas',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .moldura { position: relative; width: 100%; height: min(70dvh, 720px); border-radius: 16px; overflow: hidden; border: 1px solid var(--line-2); background: #e9e2d0; }
    .moldura iframe { width: 100%; height: 100%; border: 0; display: block; }
    @media (min-width: 900px) { .moldura { height: calc(100dvh - 230px); min-height: 520px; } }
  `,
  template: `
    <div class="page">
      <div class="spread" style="align-items: center; flex-wrap: wrap">
        <h1>Mapas</h1>
        <span class="row-wrap">
          <a routerLink="/geradores" class="btn btn-sm">Geradores</a>
          <a routerLink="/npc" class="btn btn-sm">NPC rápido</a>
        </span>
      </div>
      <p class="small muted">Mapas gerados na hora pelos geradores gratuitos do Watabou. Precisa de internet. Clique ou toque no mapa para ver as opções dele (estilo, tamanho, exportar PNG ou SVG).</p>

      <div class="chips-scroll" role="group" aria-label="Tipo de mapa">
        @for (g of geradores; track g.id) {
          <button type="button" class="chip" [attr.aria-pressed]="atual().id === g.id" (click)="escolher(g)">{{ g.nome }}</button>
        }
      </div>

      <div class="spread" style="align-items: center; flex-wrap: wrap; gap: 8px">
        <span class="small">{{ atual().uso }}</span>
        <span class="row-wrap">
          <button type="button" class="btn btn-sm btn-primary" (click)="novo()"><app-icon name="dados" [size]="16" />Novo mapa</button>
          <a class="btn btn-sm" [href]="endereco()" target="_blank" rel="noopener">Abrir em tela cheia</a>
        </span>
      </div>

      <div class="moldura">
        <iframe [src]="seguro()" [title]="'Gerador de ' + atual().nome + ' do Watabou'"></iframe>
      </div>
      <p class="tiny muted">Geradores criados por Oleg Dolya (watabou.itch.io). O site só mostra a página dele aqui dentro.</p>
    </div>
  `,
})
export class Mapas {
  private readonly san = inject(DomSanitizer);
  protected readonly geradores = GERADORES;
  protected readonly atual = signal<Gerador>(GERADORES[0]);
  private readonly semente = signal(semente());

  protected readonly endereco = computed(() => `${this.atual().url}?seed=${this.semente()}`);
  protected readonly seguro = computed(() => this.san.bypassSecurityTrustResourceUrl(this.endereco()));

  protected escolher(g: Gerador): void {
    this.atual.set(g);
    this.semente.set(semente());
  }

  protected novo(): void {
    this.semente.set(semente());
  }
}

function semente(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
