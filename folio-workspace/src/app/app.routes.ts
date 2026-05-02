import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'code-intel',
    pathMatch: 'full',
  },
  {
    path: 'code-intel',
    loadComponent: () =>
      import('./features/code-intel/code-intel.component').then(
        (m) => m.CodeIntelComponent
      ),
    data: { animation: 'code-intel' },
  },
  {
    path: 'research',
    loadComponent: () =>
      import('./features/research/research.component').then(
        (m) => m.ResearchComponent
      ),
    data: { animation: 'research' },
  },
  {
    path: 'focus-music',
    loadComponent: () =>
      import('./features/focus-music/focus-music.component').then(
        (m) => m.FocusMusicComponent
      ),
    data: { animation: 'focus-music' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
    data: { animation: 'settings' },
  },
  {
    path: '**',
    redirectTo: 'code-intel',
  },
];
