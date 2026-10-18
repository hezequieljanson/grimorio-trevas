import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Icon } from './shared/icon';

interface ItemMenu {
  rota: string;
  nome: string;
  icone: string;
  exato?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** Na tela de impressão não mostramos menus. */
  protected readonly semMenu = computed(() => this.url().includes('/imprimir'));

  protected readonly menuCelular: ItemMenu[] = [
    { rota: '/', nome: 'Início', icone: 'inicio', exato: true },
    { rota: '/fichas', nome: 'Fichas', icone: 'fichas' },
    { rota: '/notas', nome: 'Notas', icone: 'notas' },
    { rota: '/npc', nome: 'Narrar', icone: 'npc' },
    { rota: '/regras', nome: 'Regras', icone: 'regras' },
  ];

  protected readonly menuLateral: ItemMenu[] = [
    { rota: '/', nome: 'Início', icone: 'inicio', exato: true },
    { rota: '/fichas', nome: 'Minhas fichas', icone: 'fichas' },
    { rota: '/criar', nome: 'Criar ficha', icone: 'criar' },
    { rota: '/notas', nome: 'Anotações', icone: 'notas' },
    { rota: '/rolador', nome: 'Rolador', icone: 'dados' },
    { rota: '/npc', nome: 'NPC rápido', icone: 'npc' },
    { rota: '/geradores', nome: 'Geradores', icone: 'livro' },
    { rota: '/bestiario', nome: 'Bestiário', icone: 'besta' },
    { rota: '/regras', nome: 'Regras', icone: 'regras' },
    { rota: '/biblioteca', nome: 'Biblioteca de poderes', icone: 'poder' },
    { rota: '/glossario', nome: 'Glossário', icone: 'ajuda' },
    { rota: '/ajustes', nome: 'Ajustes', icone: 'ajustes' },
  ];

  /** "Narrar" no celular fica ativo em qualquer ferramenta do narrador. */
  protected readonly narrarAtivo = computed(() => /^\/(npc|geradores|bestiario|rolador)/.test(this.url()));
  protected readonly regrasAtivo = computed(() => /^\/(regras|glossario|biblioteca)/.test(this.url()));
}
