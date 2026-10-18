import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { nomeLinha } from '../../core/data.service';
import { Ficha } from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { GrupoService, copiaEditavel, ehArquivoFicha, enviarFicha } from '../../core/grupo.service';
import { abrirJson } from '../../core/storage';
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
      @if (msg()) { <p class="card card-gold small" role="status">{{ msg() }}</p> }
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
                <button type="button" class="btn btn-sm" (click)="enviar(f)"><app-icon name="subir" [size]="16" />Enviar</button>
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

      <section class="col" style="margin-top: 12px">
        <div class="spread" style="align-items: center; flex-wrap: wrap">
          <h2>Fichas do grupo</h2>
          <button type="button" class="btn" (click)="receber()"><app-icon name="baixar" [size]="18" />Receber ficha</button>
        </div>
        <p class="small muted">Fichas que outros jogadores mandaram com o botão “Enviar”. Ficam separadas das suas e servem só para consulta. Receber de novo a mesma ficha atualiza a versão.</p>
        <div class="grid-auto">
          @for (r of grupo.lista(); track r.ficha.id) {
            <article class="card">
              <div class="spread">
                <h2 style="font-size: 22px">{{ r.ficha.nome || 'Sem nome' }}</h2>
                <span class="tag tag-gray">Grupo</span>
              </div>
              <span class="small muted">{{ resumo(r.ficha) }}{{ r.ficha.jogador ? ' · ' + r.ficha.jogador : '' }}</span>
              <span class="tiny muted">Recebida {{ quando(r.recebidaEm) }}</span>
              <div class="row-wrap">
                <a class="btn btn-primary btn-sm" [routerLink]="['/grupo', r.ficha.id]"><app-icon name="olho" [size]="16" />Ver ficha</a>
                <button type="button" class="btn btn-sm" (click)="copiar(r.ficha)">Fazer cópia editável</button>
                <button type="button" class="btn btn-sm" (click)="tirar(r.ficha)" [attr.aria-label]="'Remover ' + (r.ficha.nome || 'ficha') + ' do grupo'"><app-icon name="lixo" [size]="16" />Remover</button>
              </div>
            </article>
          } @empty {
            <div class="empty">Nenhuma ficha recebida. Peça para o jogador tocar em “Enviar” na ficha dele e mandar o arquivo para você.</div>
          }
        </div>
      </section>
    </div>
  `,
})
export class Fichas {
  protected readonly srv = inject(FichasService);
  protected readonly grupo = inject(GrupoService);
  protected readonly resumo = resumoFicha;
  protected readonly quando = quando;
  protected readonly msg = signal('');

  protected remover(f: Ficha): void {
    if (confirm(`Apagar a ficha "${f.nome || 'Sem nome'}"? Isso não pode ser desfeito.`)) this.srv.remover(f.id);
  }

  protected async enviar(f: Ficha): Promise<void> {
    const r = await enviarFicha(f);
    if (r === 'baixada') this.msg.set(`O arquivo da ficha de ${f.nome || 'Sem nome'} foi baixado. Mande para o narrador pelo WhatsApp ou e-mail.`);
    else if (r === 'compartilhada') this.msg.set('Ficha enviada.');
  }

  protected async receber(): Promise<void> {
    try {
      const arq = await abrirJson<unknown>();
      if (!ehArquivoFicha(arq)) throw new Error();
      const r = this.grupo.receber(arq);
      this.msg.set(r.atualizada ? `Ficha de ${r.nome} atualizada.` : `Ficha de ${r.nome} recebida.`);
    } catch {
      this.msg.set('Esse arquivo não é uma ficha do Grimório. Ele precisa vir do botão “Enviar” de uma ficha.');
    }
  }

  protected copiar(f: Ficha): void {
    const c = copiaEditavel(f);
    this.srv.importar([c]);
    this.msg.set(`Cópia de ${f.nome || 'Sem nome'} criada em Minhas fichas.`);
  }

  protected tirar(f: Ficha): void {
    if (confirm(`Remover a ficha de ${f.nome || 'Sem nome'} do grupo?`)) this.grupo.remover(f.id);
  }
}
