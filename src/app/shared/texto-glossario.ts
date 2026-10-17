import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Termo } from '../core/models';

interface Pedaco {
  texto: string;
  termo?: Termo;
}

function escapar(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Texto em que os termos do glossário viram botões (só a primeira aparição de cada um). */
@Component({
  selector: 'app-texto-glossario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (p of pedacos(); track $index) {@if (p.termo) {<button type="button" class="termo" (click)="escolher.emit(p.termo)">{{ p.texto }}</button>} @else {{{ p.texto }}}}`,
  styles: `
    .termo { border: 0; padding: 0 1px; background: transparent; color: var(--red-soft); font: inherit; font-weight: 600; text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer; }
    .termo:hover { color: var(--gold); }
  `,
})
export class TextoGlossario {
  readonly texto = input('');
  readonly termos = input<Termo[]>([]);
  readonly escolher = output<Termo>();

  private readonly regex = computed(() => {
    const lista = this.termos()
      .map((t) => t.termo)
      .filter((t) => t.length > 3)
      .sort((a, b) => b.length - a.length)
      .map(escapar);
    if (!lista.length) return null;
    return new RegExp(`(?<![\\p{L}])(${lista.join('|')})(?![\\p{L}])`, 'giu');
  });

  protected readonly pedacos = computed<Pedaco[]>(() => {
    const t = this.texto();
    const re = this.regex();
    if (!re) return [{ texto: t }];
    const porNome = new Map(this.termos().map((x) => [x.termo.toLowerCase(), x]));
    const usados = new Set<string>();
    const out: Pedaco[] = [];
    let ultimo = 0;
    for (const m of t.matchAll(re)) {
      const chave = m[0].toLowerCase();
      const termo = porNome.get(chave);
      if (!termo || usados.has(chave)) continue;
      usados.add(chave);
      out.push({ texto: t.slice(ultimo, m.index) });
      out.push({ texto: m[0], termo });
      ultimo = (m.index ?? 0) + m[0].length;
    }
    out.push({ texto: t.slice(ultimo) });
    return out;
  });
}
