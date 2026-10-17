import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfigService } from '../../core/config.service';
import { DataService } from '../../core/data.service';
import { Geradores, Linha, LinhaId } from '../../core/models';
import { NotasService } from '../../core/notas.service';
import { Icon } from '../../shared/icon';

type Tipo = 'vampiro' | 'carnical' | 'cacador' | 'lobisomem' | 'mortal';
type Poder = 'capanga' | 'neofito' | 'anciao';

interface NpcGerado {
  nome: string;
  linha: string;
  grupo: string;
  natureza: string;
  comportamento: string;
  atributos: { nome: string; valor: number }[];
  paradas: { k: string; v: number }[];
  poderes: string[];
  jeito: string;
  segredo: string;
  gancho: string;
}

const PONTOS: Record<Poder, [number, number, number]> = { capanga: [5, 3, 2], neofito: [7, 5, 3], anciao: [10, 8, 6] };
const NIVEIS_DIS: Record<Poder, number[]> = { capanga: [1, 1, 0], neofito: [2, 1, 1], anciao: [4, 3, 3] };
const HAB: Record<Poder, [number, number]> = { capanga: [1, 2], neofito: [2, 3], anciao: [3, 5] };

function sorteio<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}
function entre(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

@Component({
  selector: 'app-npc',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './npc.html',
})
export class Npc {
  private readonly data = inject(DataService);
  private readonly config = inject(ConfigService);
  private readonly notas = inject(NotasService);
  private readonly router = inject(Router);

  protected readonly tipo = signal<Tipo>('vampiro');
  protected readonly poder = signal<Poder>('neofito');
  protected readonly epoca = signal<'moderno' | 'medieval'>('moderno');
  protected readonly travado = signal(false);
  protected readonly npc = signal<NpcGerado | null>(null);
  protected readonly erro = signal('');
  private grupoTravado = '';

  protected readonly tipos: { id: Tipo; nome: string }[] = [
    { id: 'vampiro', nome: 'Vampiro' },
    { id: 'carnical', nome: 'Carniçal' },
    { id: 'cacador', nome: 'Caçador' },
    { id: 'lobisomem', nome: 'Lobisomem' },
    { id: 'mortal', nome: 'Mortal' },
  ];
  protected readonly poderes: { id: Poder; nome: string }[] = [
    { id: 'capanga', nome: 'Capanga' },
    { id: 'neofito', nome: 'Neófito' },
    { id: 'anciao', nome: 'Ancião' },
  ];

  protected readonly avisoLivro = computed(() => {
    const id = this.linhaId();
    return this.config.ativo(id) ? '' : 'Esse livro está desativado no Início, mas o gerador usa mesmo assim.';
  });

  private linhaId(): LinhaId {
    const t = this.tipo();
    const med = this.epoca() === 'medieval';
    if (t === 'lobisomem') return med ? 'lidt' : 'lob';
    if (t === 'cacador') return 'cac';
    return med ? 'vdta' : 'vtm';
  }

  constructor() {
    this.gerar();
  }

  protected escolherTipo(t: Tipo): void {
    this.tipo.set(t);
    if (t === 'cacador') this.epoca.set('moderno');
    this.travado.set(false);
    this.gerar();
  }

  protected async gerar(): Promise<void> {
    try {
      const [linha, ger] = await Promise.all([this.data.linha(this.linhaId()), this.data.geradores()]);
      this.npc.set(this.montar(linha, ger));
      this.erro.set('');
    } catch {
      this.erro.set('Não consegui carregar os dados do gerador.');
    }
  }

  private montar(l: Linha, ger: Geradores): NpcGerado {
    const t = this.tipo();
    const p = this.poder();
    const nomes = this.epoca() === 'medieval' ? ger.npc.nomesMedievais : ger.npc.nomesModernos;

    // grupo (clã, tribo, organização)
    let grupo = '';
    let poderes: string[] = [];
    const escolherGrupo = <T extends { id: string; nome: string }>(lista: T[]): T | undefined => {
      if (this.travado() && this.grupoTravado) {
        const achado = lista.find((x) => x.id === this.grupoTravado);
        if (achado) return achado;
      }
      const g = lista.length ? sorteio(lista) : undefined;
      this.grupoTravado = g?.id ?? '';
      return g;
    };
    const nomeDis = (id: string) => l.disciplinas?.find((d) => d.id === id)?.nome ?? id;

    if (t === 'vampiro' || t === 'carnical') {
      const clas = (l.clas ?? []).filter((c) => c.disciplinas.length);
      const c = escolherGrupo(clas);
      if (c) {
        if (t === 'vampiro') {
          grupo = c.nome;
          poderes = c.disciplinas.map((d, i) => ({ d, n: NIVEIS_DIS[p][i] ?? 0 })).filter((x) => x.n > 0).map((x) => `${nomeDis(x.d)} ${'●'.repeat(x.n)}`);
        } else {
          grupo = `Carniçal de ${c.nome}`;
          poderes = [`${nomeDis(sorteio(c.disciplinas))} ●`];
        }
      }
    } else if (t === 'lobisomem') {
      const tribo = escolherGrupo(l.tribos ?? []);
      const ausp = l.auspicios?.length ? sorteio(l.auspicios) : undefined;
      const raca = l.racas?.length ? sorteio(l.racas) : undefined;
      grupo = [tribo?.nome, ausp?.nome, raca?.nome].filter(Boolean).join(' · ');
      const nivelMax = p === 'capanga' ? 1 : p === 'neofito' ? 2 : 4;
      const dons = (l.dons ?? []).filter((d) => d.nivel <= nivelMax && d.grupos.some((g) => g === tribo?.id || g === ausp?.id || g === raca?.id));
      const qtd = p === 'capanga' ? 2 : p === 'neofito' ? 3 : 5;
      poderes = [...dons].sort(() => Math.random() - 0.5).slice(0, qtd).map((d) => `${d.nome} (${d.nivel})`);
      poderes.unshift(`Fúria ${Math.min(10, (ausp?.furia ?? 3) + (p === 'anciao' ? 3 : 0))}`, `Gnose ${Math.min(10, (raca?.gnose ?? 3) + (p === 'anciao' ? 3 : 0))}`);
    } else if (t === 'cacador') {
      const org = escolherGrupo(l.organizacoes ?? []);
      grupo = org?.nome ?? 'Caçador independente';
      if (p !== 'capanga' && l.numina?.length) {
        const n = sorteio(l.numina);
        poderes = [`${n.nome} ${'●'.repeat(p === 'anciao' ? 3 : 1)}`];
      }
    } else {
      const ocupacoes = this.epoca() === 'medieval' ? ger.medieval.nome.b.opcoes : ger.moderno.nome.b.opcoes;
      grupo = sorteio(ocupacoes.length ? ocupacoes : ['Mortal']);
    }

    // atributos
    const grupos = [l.atributos.fisicos, l.atributos.sociais, l.atributos.mentais].sort(() => Math.random() - 0.5);
    const max = p === 'anciao' && t === 'vampiro' ? 6 : 5;
    const valores = new Map<string, number>();
    grupos.forEach((g, i) => {
      for (const a of g) valores.set(a.id, 1);
      let resto = PONTOS[p][i];
      let guarda = 0;
      while (resto > 0 && guarda++ < 100) {
        const a = sorteio(g);
        const v = valores.get(a.id)!;
        if (v < max) {
          valores.set(a.id, v + 1);
          resto--;
        }
      }
    });
    const va = (id: string) => valores.get(id) ?? 2;
    const [h1, h2] = HAB[p];
    const briga = entre(h1, h2);
    const esquiva = entre(h1, h2);
    const prontidao = entre(h1, h2);
    const fv = p === 'capanga' ? entre(2, 4) : p === 'neofito' ? entre(4, 6) : entre(7, 9);

    const atributos = [...l.atributos.fisicos, ...l.atributos.sociais, ...l.atributos.mentais].map((a) => ({ nome: a.nome.slice(0, 3), valor: va(a.id) }));
    const arq = l.arquetipos.length ? l.arquetipos : [{ nome: '—' }];
    return {
      nome: sorteio(nomes.length ? nomes : ['Sem nome']),
      linha: l.nome,
      grupo,
      natureza: sorteio(arq).nome,
      comportamento: sorteio(arq).nome,
      atributos,
      paradas: [
        { k: 'Ataque', v: va('destreza') + briga },
        { k: 'Esquiva', v: va('destreza') + esquiva },
        { k: 'Percepção', v: va('percepcao') + prontidao },
        { k: 'F. Vont.', v: fv },
      ],
      poderes: poderes.length ? poderes : ['Sem poderes sobrenaturais'],
      jeito: sorteio(ger.npc.jeitos),
      segredo: sorteio(ger.npc.segredos),
      gancho: sorteio(ger.npc.ganchos),
    };
  }

  protected salvarEmNotas(): void {
    const n = this.npc();
    if (!n) return;
    const texto = [
      `${n.grupo} · ${n.linha}`,
      `Natureza: ${n.natureza} · Comportamento: ${n.comportamento}`,
      `Atributos: ${n.atributos.map((a) => `${a.nome} ${a.valor}`).join(', ')}`,
      `Paradas: ${n.paradas.map((p) => `${p.k} ${p.v}`).join(' · ')}`,
      `Poderes: ${n.poderes.join(', ')}`,
      `Jeito: ${n.jeito}`,
      `Segredo: ${n.segredo}`,
      `Gancho: ${n.gancho}`,
    ].join('\n');
    const nota = this.notas.criar({ tipo: 'npc', titulo: n.nome, texto });
    this.router.navigate(['/notas', nota.id]);
  }
}
