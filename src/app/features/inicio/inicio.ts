import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfigService } from '../../core/config.service';
import { LINHAS, nomeLinha } from '../../core/data.service';
import { FichasService } from '../../core/fichas.service';
import { NotasService, quando } from '../../core/notas.service';
import { Icon } from '../../shared/icon';
import { resumoFicha } from '../fichas/fichas';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
  styles: `
    .acoes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .acao { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 18px; background: var(--surface); border: 1px solid var(--line-2); color: var(--text); text-decoration: none; min-height: 112px; }
    .acao:hover { color: var(--text); border-color: var(--line-3); }
    .acao.principal { background: var(--red); border-color: var(--red); color: var(--on-red); }
    .acao app-icon { color: var(--gold-2); }
    .acao.principal app-icon { color: var(--on-red); }
    .acao strong { font-size: 17px; }
    .ficha-link { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 14px; background: var(--surface); color: var(--text); text-decoration: none; }
    .ficha-link:hover { color: var(--text); background: var(--surface-2); }
    .sigla { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font: 700 20px var(--serif); background: var(--red-bg-2); color: var(--red-soft); flex-shrink: 0; }
    .sigla.lob { background: var(--gold-bg); color: var(--gold); }
    .sigla.cac { background: #1a2633; color: var(--blue); }
    @media (min-width: 900px) { .acoes { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  `,
})
export class Inicio {
  private readonly router = inject(Router);
  protected readonly fichasSrv = inject(FichasService);
  protected readonly notasSrv = inject(NotasService);
  protected readonly config = inject(ConfigService);
  protected readonly linhas = LINHAS;
  protected readonly busca = signal('');
  protected readonly nomeLinha = nomeLinha;
  protected readonly quando = quando;
  protected readonly resumo = resumoFicha;

  protected readonly fichas = computed(() => this.fichasSrv.fichas().slice(0, 6));
  protected readonly notas = computed(() => this.notasSrv.notas().slice(0, 3));

  protected buscar(): void {
    const q = this.busca().trim();
    this.router.navigate(['/regras'], { queryParams: q ? { q } : {} });
  }
}
