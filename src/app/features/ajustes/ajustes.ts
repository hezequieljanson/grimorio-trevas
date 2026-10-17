import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfigService, LinhaXp, RegrasCasa } from '../../core/config.service';
import { LINHAS } from '../../core/data.service';
import { Ficha } from '../../core/ficha';
import { FichasService } from '../../core/fichas.service';
import { LinhaId } from '../../core/models';
import { Nota, NotasService } from '../../core/notas.service';
import { abrirJson, baixarJson } from '../../core/storage';
import { Icon } from '../../shared/icon';

interface Backup {
  tipo: 'grimorio-backup';
  versao: 1;
  fichas: Ficha[];
  notas: Nota[];
  regras: RegrasCasa;
}

@Component({
  selector: 'app-ajustes',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ajustes.html',
})
export class Ajustes {
  protected readonly config = inject(ConfigService);
  private readonly fichas = inject(FichasService);
  private readonly notas = inject(NotasService);
  protected readonly linhas = LINHAS;
  protected readonly linhaXp = signal<LinhaId>('vtm');
  protected readonly msg = signal('');

  protected tabela(): LinhaXp[] {
    return this.config.regras().xp[this.linhaXp()];
  }

  protected mudar(i: number, campo: 'valor' | 'modo' | 'nome', v: string | number): void {
    const r = structuredClone(this.config.regras());
    const linha = r.xp[this.linhaXp()][i];
    if (campo === 'valor') linha.valor = Math.max(0, Number(v) || 0);
    else if (campo === 'modo') linha.modo = v === 'fixo' ? 'fixo' : 'x';
    else linha.nome = String(v);
    r.origem = 'Tabela da mesa (editada)';
    this.config.salvarRegras(r);
  }

  protected adicionar(): void {
    const r = structuredClone(this.config.regras());
    r.xp[this.linhaXp()].push({ chave: 'casa-' + Date.now().toString(36), nome: 'Regra da casa', modo: 'x', valor: 1 });
    this.config.salvarRegras(r);
  }

  protected remover(i: number): void {
    const r = structuredClone(this.config.regras());
    const item = r.xp[this.linhaXp()][i];
    if (!item.chave.startsWith('casa-')) return;
    r.xp[this.linhaXp()].splice(i, 1);
    this.config.salvarRegras(r);
  }

  protected mudarNumina(v: number): void {
    this.config.salvarRegras({ ...this.config.regras(), numinaMesaBonus: Math.max(0, Number(v) || 0) });
  }

  protected restaurar(): void {
    if (confirm('Voltar para as tabelas dos livros? A tabela da mesa será substituída.')) this.config.restaurarPadrao();
  }

  protected exportarRegras(): void {
    baixarJson('regras-da-casa.json', { tipo: 'grimorio-regras', ...this.config.regras() });
  }

  protected async importarRegras(): Promise<void> {
    try {
      const r = await abrirJson<Partial<RegrasCasa>>();
      if (!r || typeof r !== 'object' || !('xp' in r)) throw new Error();
      this.config.importarRegras(r);
      this.msg.set('Regras da casa importadas.');
    } catch {
      this.msg.set('Esse arquivo não parece ser de regras da casa.');
    }
  }

  protected exportarTudo(): void {
    const b: Backup = { tipo: 'grimorio-backup', versao: 1, fichas: this.fichas.fichas(), notas: this.notas.notas(), regras: this.config.regras() };
    baixarJson(`grimorio-backup-${new Date().toISOString().slice(0, 10)}.json`, b);
  }

  protected async importarTudo(): Promise<void> {
    try {
      const b = await abrirJson<Backup>();
      if (b?.tipo !== 'grimorio-backup') throw new Error();
      if (!confirm(`Importar ${b.fichas.length} fichas e ${b.notas.length} anotações? Itens com o mesmo id serão substituídos.`)) return;
      this.fichas.importar(b.fichas ?? []);
      this.notas.importar(b.notas ?? []);
      if (b.regras) this.config.importarRegras(b.regras);
      this.msg.set('Backup importado.');
    } catch {
      this.msg.set('Esse arquivo não parece ser um backup do Grimório.');
    }
  }
}
