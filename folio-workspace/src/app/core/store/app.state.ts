export interface Playlist {
  id: number;
  name: string;
  emoji: string;
  embedUrl: string;
  mood: string;
}

export interface AppSettings {
  p1BackendUrl: string;
  p2BackendUrl: string;
  projectPath: string;
}

export type ActiveSection = 'code-intel' | 'research' | 'focus-music' | 'settings';

export interface CurrentMusic {
  playing: boolean;
  playlist: Playlist | null;
}

export interface AppState {
  activeSection: ActiveSection;
  sidebarCollapsed: boolean;
  settings: AppSettings;
  currentMusic: CurrentMusic;
}

import { environment } from '../../../environments/environment';

export const initialState: AppState = {
  activeSection: 'code-intel',
  sidebarCollapsed: false,
  settings: {
    p1BackendUrl: environment.p1BackendUrl,
    p2BackendUrl: environment.p2BackendUrl,
    projectPath: '',
  },
  currentMusic: {
    playing: false,
    playlist: null,
  },
};
