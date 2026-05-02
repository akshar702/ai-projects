import { createAction, props } from '@ngrx/store';
import { ActiveSection, AppSettings, Playlist } from './app.state';

export const setActiveSection = createAction(
  '[Nav] Set Active Section',
  props<{ section: ActiveSection }>()
);

export const toggleSidebar = createAction('[Sidebar] Toggle');

export const updateSettings = createAction(
  '[Settings] Update',
  props<{ settings: AppSettings }>()
);

export const loadSettings = createAction('[Settings] Load From Storage');

export const settingsLoaded = createAction(
  '[Settings] Loaded',
  props<{ settings: AppSettings }>()
);

export const setCurrentMusic = createAction(
  '[Music] Set Current',
  props<{ playlist: Playlist }>()
);

export const stopMusic = createAction('[Music] Stop');
