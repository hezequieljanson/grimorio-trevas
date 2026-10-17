// Tudo fica no navegador de cada pessoa. O acesso pode falhar (aba anônima, dados bloqueados),
// então toda leitura e escrita fica protegida e o app continua funcionando só em memória.

const PREFIXO = 'grimorio:';

export function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

export function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: segue só em memória
  }
}

export function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

/** Baixa um arquivo JSON (backup, regras da casa). */
export function baixarJson(nomeArquivo: string, dados: unknown): void {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre o seletor de arquivo e devolve o JSON lido. */
export function abrirJson<T>(): Promise<T> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const arquivo = input.files?.[0];
      if (!arquivo) return reject(new Error('Nenhum arquivo escolhido'));
      arquivo
        .text()
        .then((t) => resolve(JSON.parse(t) as T))
        .catch(() => reject(new Error('Arquivo inválido')));
    };
    input.click();
  });
}
