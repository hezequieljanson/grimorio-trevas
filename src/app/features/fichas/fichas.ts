import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { nomeLinha } from '../../core/data.service';
import { Ficha } from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { quando } from '../../core/notas.service';
import { xpGasto } from '../../core/xp';
import { Icon } from '../../shared/icon';

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** Transforma um id ("crias-de-fenris") num nome legível ("Crias de Fenris"). */
export function legivel(id?: string): string {
  if (!id) return '';
  return id
    .split('-')
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

export function resumoFicha(f: Ficha): string {
  const partes = [nomeLinha(f.linha, true)];
  if (f.cla) partes.push(legivel(f.cla));
  if (f.auspicio) partes.push(legivel(f.auspicio));
  if (f.tribo) partes.push(legivel(f.tribo));
  if (f.organizacao) partes.push(legivel(f.organizacao));
  const livre = f.xp.total - xpGasto(f);
  if (f.criacaoConcluida && livre > 0) partes.push(`${livre} XP`);
  return partes.join(' · ');
}

@Component({
  selector: 'app-fichas',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="spread" style="align-items: center">
        <h1>Minhas fichas</h1>
        <a routerLink="/criar" class="btn btn-primary"><app-icon name="mais" [size]="18" />Nova ficha</a>
      </div>
      <p class="small muted">As fichas ficam salvas neste aparelho. Para levar para outro, use <a routerLink="/ajustes">Ajustes › Backup</a>.</p>
      <div class="grid-auto">
        @for (f of srv.fichas(); track f.id) {
          <article class="card">
            <div class="spread">
              <h2 style="font-size: 22px">{{ f.nome || 'Sem nome' }}</h2>
              @if (!f.criacaoConcluida) { <span class="tag tag-gold">Rascunho</span> }
            </div>
            <span class="small muted">{{ resumo(f) }}</span>
            <span class="tiny muted">Atualizada {{ quando(f.atualizadaEm) }}</span>
            <div class="row-wrap">
              @if (f.criacaoConcluida) {
                <a class="btn btn-primary btn-sm" [routerLink]="['/ficha', f.id]">Abrir</a>
                <a class="btn btn-sm" [routerLink]="['/ficha', f.id, 'imprimir']"><app-icon name="baixar" [size]="16" />PDF</a>
              } @else {
                <a class="btn btn-primary btn-sm" [routerLink]="['/criar', f.id]">Continuar criação</a>
              }
              <button type="button" class="btn btn-sm" (click)="remover(f)" [attr.aria-label]="'Apagar ' + (f.nome || 'ficha')"><app-icon name="lixo" [size]="16" />Apagar</button>
            </div>
          </article>
        } @empty {
          <div class="empty">Nenhuma ficha ainda. <a routerLink="/criar">Criar a primeira</a></div>
        }
      </div>
    </div>
  `,
})
export class Fichas {
  protected readonly srv = inject(FichasService);
  protected readonly resumo = resumoFicha;
  protected readonly quando = quando;

  protected remover(f: Ficha): void {
    if (confirm(`Apagar a ficha "${f.nome || 'Sem nome'}"? Isso não pode ser desfeito.`)) this.srv.remover(f.id);
  }
}
