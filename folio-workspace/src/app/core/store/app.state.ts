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

export const initialState: AppState = {
  activeSection: 'code-intel',
  sidebarCollapsed: false,
  settings: {
    p1BackendUrl: 'http://localhost:8000',
    p2BackendUrl: 'http://localhost:8001',
    projectPath: '/Users/username/my-angular-project',
  },
  currentMusic: {
    playing: false,
    playlist: null,
  },
};
