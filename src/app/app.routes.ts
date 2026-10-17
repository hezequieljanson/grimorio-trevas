import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio), title: 'Grimório das Trevas' },
  { path: 'fichas', loadComponent: () => import('./features/fichas/fichas').then((m) => m.Fichas), title: 'Minhas fichas' },
  { path: 'criar', loadComponent: () => import('./features/criar/escolher-linha').then((m) => m.EscolherLinha), title: 'Nova ficha' },
  { path: 'criar/:id', loadComponent: () => import('./features/criar/criar').then((m) => m.Criar), title: 'Nova ficha' },
  { path: 'ficha/:id', loadComponent: () => import('./features/ficha/ficha-mesa').then((m) => m.FichaMesa), title: 'Ficha' },
  { path: 'ficha/:id/imprimir', loadComponent: () => import('./features/ficha/ficha-pdf').then((m) => m.FichaPdf), title: 'Ficha em PDF' },
  { path: 'rolador', loadComponent: () => import('./features/rolador/rolador').then((m) => m.Rolador), title: 'Rolador' },
  { path: 'npc', loadComponent: () => import('./features/npc/npc').then((m) => m.Npc), title: 'NPC rápido' },
  { path: 'geradores', loadComponent: () => import('./features/geradores/geradores').then((m) => m.GeradoresPage), title: 'Geradores' },
  { path: 'bestiario', loadComponent: () => import('./features/bestiario/bestiario').then((m) => m.Bestiario), title: 'Bestiário' },
  { path: 'regras', loadComponent: () => import('./features/regras/regras').then((m) => m.Regras), title: 'Regras' },
  { path: 'regras/:id', loadComponent: () => import('./features/regras/regras').then((m) => m.Regras), title: 'Regras' },
  { path: 'glossario', loadComponent: () => import('./features/glossario/glossario').then((m) => m.Glossario), title: 'Glossário' },
  { path: 'notas', loadComponent: () => import('./features/notas/notas').then((m) => m.NotasPage), title: 'Anotações' },
  { path: 'notas/:id', loadComponent: () => import('./features/notas/notas').then((m) => m.NotasPage), title: 'Anotações' },
  { path: 'ajustes', loadComponent: () => import('./features/ajustes/ajustes').then((m) => m.Ajustes), title: 'Ajustes e regras da casa' },
  { path: '**', redirectTo: '' },
];
