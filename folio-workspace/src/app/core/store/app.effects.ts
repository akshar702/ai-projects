import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, switchMap, of } from 'rxjs';
import {
  loadSettings,
  settingsLoaded,
  updateSettings,
} from './app.actions';
import { AppSettings } from './app.state';

const STORAGE_KEY = 'folio_settings';

const DEFAULT_SETTINGS: AppSettings = {
  p1BackendUrl: 'http://localhost:8000',
  p2BackendUrl: 'http://localhost:8001',
  projectPath: '/Users/username/my-angular-project',
};

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);

  loadSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSettings),
      switchMap(() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const settings: AppSettings = raw
            ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
            : DEFAULT_SETTINGS;
          return of(settingsLoaded({ settings }));
        } catch {
          return of(settingsLoaded({ settings: DEFAULT_SETTINGS }));
        }
      })
    )
  );

  saveSettings$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateSettings),
        tap(({ settings }) => {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
          } catch {
            console.warn('Folio: could not persist settings to localStorage');
          }
        })
      ),
    { dispatch: false }
  );
}
