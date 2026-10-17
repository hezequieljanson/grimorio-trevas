import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { pontuar, termosDe } from '../../core/busca';
import { ConfigService } from '../../core/config.service';
import { DataService, nomeLinha } from '../../core/data.service';
import { Criatura } from '../../core/models';
import { NotasService } from '../../core/notas.service';
import { Icon } from '../../shared/icon';
import { telaLarga } from '../../core/tela';

@Component({
  selector: 'app-bestiario',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bestiario.html',
  styles: `
    .layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
    .lista { flex: 1 1 300px; max-width: 400px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .detalhe { flex: 999 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
    .list-link.atual { background: var(--red-bg); }
    .poder { display: flex; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line-2); align-items: flex-start; }
    .poder.on { border-color: var(--red-line); background: var(--red-bg); }
    @media (max-width: 899px) { .lista { max-width: none; } .esconder-celular { display: none; } }
    @media (min-width: 900px) { .so-celular { display: none; } .lista { position: sticky; top: 16px; max-height: calc(100dvh - 32px); overflow-y: auto; } }
  `,
})
export class Bestiario {
  private readonly data = inject(DataService);
  private readonly notas = inject(NotasService);
  private readonly router = inject(Router);
  protected readonly config = inject(ConfigService);
  protected readonly nomeLinha = nomeLinha;

  protected readonly criaturas = signal<Criatura[]>([]);
  protected readonly q = signal('');
  protected readonly categoria = signal('Todos');
  protected readonly atualId = signal<string | null>(null);
  protected readonly escolhidos = signal<Set<string>>(new Set());
  protected readonly erro = signal('');

  constructor() {
    const id = inject(ActivatedRoute).snapshot.queryParamMap.get('id');
    if (id) this.atualId.set(id);
    this.data
      .bestiario()
      .then((b) => this.criaturas.set(b))
      .catch(() => this.erro.set('Não consegui carregar o bestiário.'));
  }

  private readonly ativas = computed(() => this.criaturas().filter((c) => this.config.ativo(c.linha)));
  protected readonly categorias = computed(() => ['Todos', ...new Set(this.ativas().map((c) => c.categoria))]);

  protected readonly lista = computed(() => {
    const cat = this.categoria();
    const termos = termosDe(this.q());
    return this.ativas().filter(
      (c) =>
        (cat === 'Todos' || c.categoria === cat) &&
        (!termos.length || pontuar(termos, [{ texto: c.nome, peso: 3 }, { texto: c.desc + ' ' + c.poderes.map((p) => p.nome).join(' '), peso: 1 }]) > 0),
    );
  });

  private readonly larga = telaLarga();

  /** No computador já abre a primeira criatura da lista; ao buscar, acompanha o primeiro resultado. */
  protected readonly atual = computed(() => {
    const lista = this.lista();
    const escolhida = lista.find((c) => c.id === this.atualId());
    return escolhida ?? (this.larga() ? (lista[0] ?? null) : null);
  });

  protected buscar(v: string): void {
    this.q.set(v);
    if (this.larga()) this.atualId.set(null);
  }

  protected filtrar(cat: string): void {
    this.categoria.set(cat);
    if (this.larga()) this.atualId.set(null);
  }

  protected abrir(c: Criatura): void {
    this.atualId.set(c.id);
    this.escolhidos.set(new Set());
    window.scrollTo({ top: 0 });
  }

  protected alternar(nome: string): void {
    const s = new Set(this.escolhidos());
    if (s.has(nome)) s.delete(nome);
    else s.add(nome);
    this.escolhidos.set(s);
  }

  protected chaves(o?: Record<string, string | number>): { k: string; v: string | number }[] {
    return o ? Object.entries(o).map(([k, v]) => ({ k, v })) : [];
  }

  protected salvar(): void {
    const c = this.atual();
    if (!c) return;
    const poderes = c.escolherPoderes ? c.poderes.filter((p) => this.escolhidos().has(p.nome)) : c.poderes;
    const linhas = [
      `${c.categoria} · ${nomeLinha(c.linha)}${c.pagina ? ' p. ' + c.pagina : ''}`,
      c.desc,
      c.atributos ? 'Atributos: ' + this.chaves(c.atributos).map((x) => `${x.k} ${x.v}`).join(', ') : '',
      c.habilidades ? 'Habilidades: ' + c.habilidades : '',
      c.tracos ? this.chaves(c.tracos).map((x) => `${x.k} ${x.v}`).join(' · ') : '',
      poderes.length ? 'Poderes: ' + poderes.map((p) => `${p.nome} — ${p.desc}`).join('; ') : '',
    ].filter(Boolean);
    const n = this.notas.criar({ tipo: 'npc', titulo: c.nome, texto: linhas.join('\n') });
    this.router.navigate(['/notas', n.id]);
  }
}
