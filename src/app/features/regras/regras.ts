import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { pontuar, termosDe } from '../../core/busca';
import { ConfigService } from '../../core/config.service';
import { DataService, LINHAS, nomeLinha } from '../../core/data.service';
import { LinhaId, Regra, Termo } from '../../core/models';
import { Icon } from '../../shared/icon';
import { TextoGlossario } from '../../shared/texto-glossario';
import { telaLarga } from '../../core/tela';

@Component({
  selector: 'app-regras',
  imports: [FormsModule, RouterLink, Icon, TextoGlossario],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regras.html',
  styleUrl: './regras.css',
})
export class Regras {
  readonly id = input<string>();
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  protected readonly config = inject(ConfigService);
  protected readonly linhas = LINHAS;
  protected readonly nomeLinha = nomeLinha;

  protected readonly regras = signal<Regra[]>([]);
  protected readonly termos = signal<Termo[]>([]);
  protected readonly erro = signal('');
  protected readonly filtro = signal<LinhaId | 'todos'>('todos');
  protected readonly termoAberto = signal<Termo | null>(null);
  private readonly qParam = toSignal(this.rota.queryParamMap.pipe(map((p) => p.get('q') ?? '')), { initialValue: '' });
  protected readonly q = signal('');

  constructor() {
    Promise.all([this.data.regras(), this.data.glossario()])
      .then(([r, g]) => {
        this.regras.set(r);
        this.termos.set(g);
      })
      .catch(() => this.erro.set('Não consegui carregar as regras.'));
    effect(() => this.q.set(this.qParam()));
  }

  protected readonly ativas = computed(() => this.regras().filter((r) => this.config.ativo(r.linha)));

  protected readonly resultados = computed(() => {
    const f = this.filtro();
    const base = this.ativas().filter((r) => f === 'todos' || r.linha === f);
    const termos = termosDe(this.q());
    if (!termos.length) return base;
    return base
      .map((r) => ({
        r,
        p: pontuar(termos, [
          { texto: r.titulo, peso: 10 },
          { texto: r.tags.join(' '), peso: 6 },
          { texto: r.capitulo, peso: 2 },
          { texto: r.resumo.join(' '), peso: 1 },
        ]),
      }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .map((x) => x.r);
  });

  protected readonly contagem = computed(() => {
    const termos = termosDe(this.q());
    const c: Partial<Record<LinhaId | 'todos', number>> = {};
    for (const r of this.ativas()) {
      if (termos.length && !pontuar(termos, [{ texto: r.titulo + ' ' + r.tags.join(' ') + ' ' + r.capitulo + ' ' + r.resumo.join(' '), peso: 1 }])) continue;
      c[r.linha] = (c[r.linha] ?? 0) + 1;
      c.todos = (c.todos ?? 0) + 1;
    }
    return c;
  });

  private readonly larga = telaLarga();

  /** No computador, sem regra escolhida, mostra o primeiro resultado da busca. */
  protected readonly atual = computed(() => {
    const escolhida = this.regras().find((r) => r.id === this.id());
    return escolhida ?? (this.larga() ? (this.resultados()[0] ?? null) : null);
  });

  /** Termos do glossário das linhas ativas, para marcar no texto. */
  protected readonly termosAtivos = computed(() => this.termos().filter((t) => this.config.ativo(t.linha)));

  protected readonly relacionadas = computed(() => {
    const a = this.atual();
    if (!a) return [];
    const tags = new Set(a.tags);
    return this.regras()
      .filter((r) => r.id !== a.id && this.config.ativo(r.linha) && r.tags.some((t) => tags.has(t)))
      .slice(0, 6);
  });

  protected buscar(v: string): void {
    this.q.set(v);
    this.router.navigate([], { queryParams: v ? { q: v } : {}, replaceUrl: true, queryParamsHandling: 'replace' });
  }

  protected abrir(r: Regra): void {
    this.termoAberto.set(null);
    this.router.navigate(['/regras', r.id], { queryParams: this.q() ? { q: this.q() } : {} });
  }

  protected voltar(): void {
    this.router.navigate(['/regras'], { queryParams: this.q() ? { q: this.q() } : {} });
  }

  protected trecho(r: Regra): string {
    const t = r.resumo[0] ?? '';
    return t.length > 140 ? t.slice(0, 137) + '…' : t;
  }
}
