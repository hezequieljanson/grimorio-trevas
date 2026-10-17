import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Resultado, classeDado } from '../core/dados';

@Component({
  selector: 'app-resultado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (r(); as res) {
      <div class="card card-red" aria-live="polite">
        <div class="spread">
          <span class="small" style="color: var(--text-3)">{{ rotulo() }}</span>
          <strong [style.color]="cor()" style="font-size: 18px">{{ res.texto }}</strong>
        </div>
        <div class="dice">
          @for (d of res.dados; track $index) {
            <span [class]="classe(d)">{{ d }}</span>
          }
        </div>
        @if (res.usouFv) {
          <span class="tiny gold">+1 sucesso automático da Força de Vontade</span>
        }
      </div>
    } @else {
      <div class="empty small">Toque numa rolagem para ver os dados aqui.</div>
    }
  `,
})
export class ResultadoView {
  readonly r = input<Resultado | null>(null);
  readonly rotulo = input('');
  protected readonly cor = computed(() => {
    const r = this.r();
    if (!r) return '';
    if (r.critica) return 'var(--gold)';
    return r.sucessos > 0 ? 'var(--red-soft)' : 'var(--muted)';
  });
  protected classe(d: number): string {
    return classeDado(d, this.r()?.dificuldade ?? 6);
  }
}
