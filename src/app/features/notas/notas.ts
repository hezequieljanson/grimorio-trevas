import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { norm } from '../../core/busca';
import { FichasService } from '../../core/fichas.service';
import { Nota, NotasService, TIPOS_NOTA, TipoNota, quando } from '../../core/notas.service';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-notas',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notas.html',
  styles: `
    .layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
    .lista { flex: 1 1 300px; max-width: 380px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .editor { flex: 999 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
    .nota-link { display: flex; flex-direction: column; gap: 5px; padding: 12px 14px; border-radius: 14px; background: var(--surface); border: 1px solid #2e272b; color: var(--text); text-decoration: none; }
    .nota-link:hover { color: var(--text); border-color: var(--line-3); }
    .nota-link.atual { background: var(--red-bg); border-color: var(--red-line); }
    .titulo { font-family: var(--serif); font-size: 32px; font-weight: 700; background: transparent; border: 0; border-bottom: 1px solid var(--line-2); color: var(--text); padding: 4px 0; width: 100%; }
    .titulo:focus { outline: none; border-color: var(--red-2); }
    .fab { position: fixed; right: 20px; bottom: calc(92px + env(safe-area-inset-bottom)); width: 60px; height: 60px; border-radius: 50%; border: 0; background: var(--red); color: var(--on-red); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,.45); z-index: 15; }
    @media (max-width: 899px) { .lista { max-width: none; } .esconder-celular { display: none; } }
    @media (min-width: 900px) { .fab, .so-celular { display: none; } }
  `,
})
export class NotasPage {
  readonly id = input<string>();
  protected readonly srv = inject(NotasService);
  protected readonly fichas = inject(FichasService);
  private readonly router = inject(Router);
  protected readonly tipos = TIPOS_NOTA;
  protected readonly quando = quando;
  protected readonly filtro = signal<TipoNota | 'todas'>('todas');
  protected readonly fichaFiltro = signal<string>('');
  protected readonly q = signal('');

  protected readonly lista = computed(() => {
    const f = this.filtro();
    const fi = this.fichaFiltro();
    const q = norm(this.q().trim());
    return this.srv
      .notas()
      .filter((n) => (f === 'todas' || n.tipo === f) && (!fi || n.fichaId === fi) && (!q || norm(n.titulo + ' ' + n.texto).includes(q)))
      .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));
  });

  protected readonly atual = computed(() => (this.id() ? this.srv.porId(this.id()!) ?? null : null));

  protected tipo(id: TipoNota) {
    return TIPOS_NOTA.find((t) => t.id === id)!;
  }

  protected nova(): void {
    const n = this.srv.criar({ tipo: this.filtro() === 'todas' ? 'sessao' : (this.filtro() as TipoNota), fichaId: this.fichaFiltro() || null });
    this.router.navigate(['/notas', n.id]);
  }

  protected editar<K extends keyof Nota>(k: K, v: Nota[K]): void {
    const n = this.atual();
    if (n) this.srv.salvar({ ...n, [k]: v });
  }

  protected apagar(): void {
    const n = this.atual();
    if (n && confirm(`Apagar a anotação "${n.titulo || 'Sem título'}"?`)) {
      this.srv.remover(n.id);
      this.router.navigate(['/notas']);
    }
  }

  protected nomeFicha(id: string | null): string {
    return id ? (this.fichas.porId(id)?.nome ?? '') : '';
  }

  protected trecho(n: Nota): string {
    return n.texto.length > 120 ? n.texto.slice(0, 117) + '…' : n.texto;
  }
}
