import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectActiveSection = createSelector(
  selectAppState, (s) => s.activeSection
);

export const selectSidebarCollapsed = createSelector(
  selectAppState, (s) => s.sidebarCollapsed
);

export const selectSettings = createSelector(
  selectAppState, (s) => s.settings
);

export const selectP1Url = createSelector(
  selectSettings, (s) => s.p1BackendUrl
);

export const selectP2Url = createSelector(
  selectSettings, (s) => s.p2BackendUrl
);

export const selectProjectPath = createSelector(
  selectSettings, (s) => s.projectPath
);

export const selectCurrentMusic = createSelector(
  selectAppState, (s) => s.currentMusic
);

export const selectMusicPlaying = createSelector(
  selectCurrentMusic, (m) => m.playing
);

export const selectActivePlaylist = createSelector(
  selectCurrentMusic, (m) => m.playlist
);
