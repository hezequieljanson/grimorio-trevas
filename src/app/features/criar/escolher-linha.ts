import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigService } from '../../core/config.service';
import { DataService, LINHAS } from '../../core/data.service';
import { FichasService } from '../../core/fichas.service';
import { LinhaId } from '../../core/models';

const DESCRICOES: Record<LinhaId, string> = {
  vtm: 'Vampiro nas noites modernas: clãs, Disciplinas e Humanidade.',
  vdta: 'Vampiro em 1197: clãs medievais, Estradas e habilidades da época.',
  lob: 'Lobisomem moderno: raça, augúrio, tribo, Dons e as 5 formas.',
  lidt: 'Lobisomem na Idade das Trevas: tribos e habilidades medievais.',
  cac: 'Mortal caçador: organizações, Numina do livro e do documento da mesa.',
};

@Component({
  selector: 'app-escolher-linha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Nova ficha</h1>
      <p class="lead">Escolha o livro. Cada um tem seus próprios pontos e regras de criação, e o site confere tudo para você.</p>
      @if (erro()) { <p class="card card-red">{{ erro() }}</p> }
      <div class="grid-auto">
        @for (l of linhas; track l.id) {
          <button type="button" class="card" style="text-align: left; cursor: pointer" [disabled]="carregando()" (click)="escolher(l.id)">
            <span class="spread"><strong class="serif" style="font-size: 24px">{{ l.nome }}</strong>
              @if (!config.ativo(l.id)) { <span class="tag tag-gray">inativo</span> }
            </span>
            <span class="small" style="color: var(--text-3)">{{ desc[l.id] }}</span>
          </button>
        }
      </div>
    </div>
  `,
})
export class EscolherLinha {
  private readonly data = inject(DataService);
  private readonly fichas = inject(FichasService);
  private readonly router = inject(Router);
  protected readonly config = inject(ConfigService);
  protected readonly linhas = LINHAS;
  protected readonly desc = DESCRICOES;
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');

  protected async escolher(id: LinhaId): Promise<void> {
    this.carregando.set(true);
    try {
      const linha = await this.data.linha(id);
      const f = this.fichas.criar(linha);
      this.router.navigate(['/criar', f.id]);
    } catch {
      this.erro.set('Não consegui carregar as regras desse livro. Tente de novo.');
    } finally {
      this.carregando.set(false);
    }
  }
}
