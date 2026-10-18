import { Injectable, signal } from '@angular/core';
import { rolarD10 } from './dados';
import { gravar, ler } from './storage';

interface CaixaDados {
  init(): Promise<unknown>;
  roll(notacao: string): Promise<{ rolls?: { value: number }[] }[]>;
  clear(): void;
}

/**
 * Dados 3D com física (biblioteca @3d-dice/dice-box, MIT).
 * Os valores que caem na tela são os valores da rolagem. Se algo falhar
 * (sem WebGL, sem internet na primeira vez), volta para a rolagem comum.
 */
@Injectable({ providedIn: 'root' })
export class Dados3dService {
  private readonly _ativo = signal<boolean>(ler<boolean>('dados3d', false));
  readonly ativo = this._ativo.asReadonly();

  private caixa: Promise<CaixaDados | null> | null = null;
  private limpar: ReturnType<typeof setTimeout> | null = null;

  alternar(): void {
    const v = !this._ativo();
    this._ativo.set(v);
    gravar('dados3d', v);
  }

  /** Rola N d10: na tela em 3D se estiver ligado, senão do jeito comum. */
  async rolar(n: number): Promise<number[]> {
    const qtd = Math.max(0, Math.min(n, 30));
    if (!this._ativo() || qtd === 0) return rolarD10(qtd);
    const caixa = await this.preparar();
    if (!caixa) return rolarD10(qtd);
    try {
      if (this.limpar) clearTimeout(this.limpar);
      this.mostrar(true);
      // Se a física travar (worker não carregou), não deixa o rolador preso.
      const grupos = await Promise.race([
        caixa.roll(`${qtd}d10`),
        new Promise<never>((_, falha) => setTimeout(() => falha(new Error('tempo')), 8000)),
      ]);
      const valores = grupos.flatMap((g) => (g.rolls ?? []).map((r) => (r.value === 0 ? 10 : r.value)));
      this.limpar = setTimeout(() => {
        caixa.clear();
        this.mostrar(false);
      }, 2500);
      return valores.length === qtd ? valores : rolarD10(qtd);
    } catch {
      this.mostrar(false);
      // Deu errado uma vez: segue com a rolagem comum até recarregar a página.
      this.caixa = Promise.resolve(null);
      return rolarD10(qtd);
    }
  }

  private preparar(): Promise<CaixaDados | null> {
    if (!this.caixa) {
      this.caixa = (async () => {
        try {
          let el = document.getElementById('dados-3d');
          if (!el) {
            el = document.createElement('div');
            el.id = 'dados-3d';
            el.setAttribute('aria-hidden', 'true');
            document.body.appendChild(el);
          }
          const mod = await import('@3d-dice/dice-box');
          const DiceBox = (mod as unknown as { default: new (c: object) => CaixaDados }).default;
          const caixa = new DiceBox({
            container: '#dados-3d',
            assetPath: '/assets/dice-box/',
            theme: 'default',
            themeColor: '#9e1f2c',
            scale: 6,
          });
          await caixa.init();
          return caixa;
        } catch {
          this.caixa = null;
          return null;
        }
      })();
    }
    return this.caixa;
  }

  private mostrar(v: boolean): void {
    document.getElementById('dados-3d')?.classList.toggle('visivel', v);
  }
}
