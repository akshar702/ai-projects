import { createReducer, on } from '@ngrx/store';
import { initialState } from './app.state';
import {
  setActiveSection,
  toggleSidebar,
  setSidebarCollapsed,
  updateSettings,
  settingsLoaded,
  setCurrentMusic,
  stopMusic,
} from './app.actions';

export const appReducer = createReducer(
  initialState,

  on(setActiveSection, (state, { section }) => ({
    ...state,
    activeSection: section,
  })),

  on(toggleSidebar, (state) => ({
    ...state,
    sidebarCollapsed: !state.sidebarCollapsed,
  })),

  on(setSidebarCollapsed, (state, { collapsed }) => ({
    ...state,
    sidebarCollapsed: collapsed,
  })),

  on(updateSettings, (state, { settings }) => ({
    ...state,
    settings,
  })),

  on(settingsLoaded, (state, { settings }) => ({
    ...state,
    settings,
  })),

  on(setCurrentMusic, (state, { playlist }) => ({
    ...state,
    currentMusic: { playing: true, playlist },
  })),

  on(stopMusic, (state) => ({
    ...state,
    currentMusic: { playing: false, playlist: null },
  }))
);
