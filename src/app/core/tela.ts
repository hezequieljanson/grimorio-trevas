import { signal } from '@angular/core';

/** true quando a tela é larga o bastante para mostrar lista e detalhe lado a lado. */
export function telaLarga() {
  const mq = typeof matchMedia === 'function' ? matchMedia('(min-width: 900px)') : null;
  const s = signal(mq?.matches ?? true);
  mq?.addEventListener('change', (e) => s.set(e.matches));
  return s.asReadonly();
}
