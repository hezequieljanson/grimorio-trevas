import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

const PATHS: Record<string, string> = {
  inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  fichas: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  criar: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  notas: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  npc: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  regras: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  dados: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M3 7l9 5 9-5"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  voltar: '<path d="M15 6l-6 6 6 6"/>',
  seguir: '<path d="M9 6l6 6-6 6"/>',
  baixo: '<path d="M6 9l6 6 6-6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  ok: '<path d="M5 12l5 5 9-10"/>',
  baixar: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  subir: '<path d="M12 20V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/>',
  salvar: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  aberto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  lixo: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  besta: '<path d="M4 18c2-6 5-9 8-9s6 3 8 9"/><path d="M8 9L6 4l4 3M16 9l2-5-4 3"/><circle cx="10" cy="13" r="0.6"/><circle cx="14" cy="13" r="0.6"/>',
  lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  livro: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  aviso: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5v.01"/>',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg aria-hidden="true" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" [innerHTML]="svg()"></svg>`,
  styles: `:host { display: inline-flex; flex-shrink: 0; }`,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly stroke = input(2);
  private readonly san = inject(DomSanitizer);
  // Os caminhos são constantes deste arquivo, nunca texto vindo de fora.
  protected readonly svg = computed(() => this.san.bypassSecurityTrustHtml(PATHS[this.name()] ?? ''));
}
