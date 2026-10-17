import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Bolinhas de 0 a N. Tocar na bolinha atual tira um ponto. */
@Component({
  selector: 'app-dots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dots" role="group" [attr.aria-label]="label()">
      @for (i of indices(); track i) {
        <button
          type="button"
          class="dot-btn"
          [disabled]="readonly()"
          [attr.aria-label]="label() + ' ' + i"
          [attr.aria-pressed]="i <= value()"
          (click)="clicar(i)"
        >
          <span class="dot" [class.on]="i <= value()" [class.bonus]="i > value() - extra() && i <= value()" [class.fixo]="i <= min()"></span>
        </button>
      }
    </span>
  `,
  styles: `
    .dots { display: inline-flex; }
    .dot-btn { width: 30px; height: 40px; border: 0; background: transparent; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
    .dot-btn:disabled { opacity: 1; cursor: default; }
    .dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #5a4d53; }
    .dot.on { background: var(--red-2); border-color: var(--red-2); }
    .dot.on.bonus { background: var(--gold); border-color: var(--gold); }
    :host(.compact) .dot-btn { width: 22px; height: 30px; }
    :host(.compact) .dot { width: 14px; height: 14px; }
  `,
})
export class Dots {
  readonly value = input(0);
  readonly max = input(5);
  readonly min = input(0);
  /** Pontos do topo mostrados em dourado (comprados com bônus ou XP). */
  readonly extra = input(0);
  readonly label = input('');
  readonly readonly = input(false);
  readonly change = output<number>();

  protected readonly indices = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));

  protected clicar(i: number): void {
    if (this.readonly()) return;
    const next = i === this.value() ? i - 1 : i;
    this.change.emit(Math.max(this.min(), next));
  }
}
