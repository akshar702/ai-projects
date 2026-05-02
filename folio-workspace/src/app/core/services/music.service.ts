import { Injectable, signal } from '@angular/core';
import { Playlist } from '../store/app.state';

export const FOCUS_PLAYLISTS: Playlist[] = [
  { id: 1,  name: 'Lo-fi Beats',     emoji: '🎵', embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk', mood: 'Chill'     },
  { id: 2,  name: 'Deep Focus',      emoji: '🧠', embedUrl: 'https://www.youtube.com/embed/WPni755-Krg',  mood: 'Intense'   },
  { id: 3,  name: 'Jazz & Code',     emoji: '🎷', embedUrl: 'https://www.youtube.com/embed/Dx5qFachd3A',  mood: 'Creative'  },
  { id: 4,  name: 'Ambient Flow',    emoji: '🌊', embedUrl: 'https://www.youtube.com/embed/qYnA9wWFHLI',  mood: 'Calm'      },
  { id: 5,  name: 'Synthwave',       emoji: '🌆', embedUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY',  mood: 'Energetic' },
  { id: 6,  name: 'Nature Sounds',   emoji: '🌿', embedUrl: 'https://www.youtube.com/embed/eKFTSSKCzWA',  mood: 'Peaceful'  },
  { id: 7,  name: 'Classical',       emoji: '🎻', embedUrl: 'https://www.youtube.com/embed/jgpJVI3tDbY',  mood: 'Focused'   },
  { id: 8,  name: 'Post Rock',       emoji: '🎸', embedUrl: 'https://www.youtube.com/embed/PLAzaFJ4VkY',  mood: 'Epic'      },
  { id: 9,  name: 'Binaural Beats',  emoji: '🔊', embedUrl: 'https://www.youtube.com/embed/F5o_GpBFngs',  mood: 'Deep Work' },
  { id: 10, name: 'Piano Focus',     emoji: '🎹', embedUrl: 'https://www.youtube.com/embed/s_XXDoEtDMM',  mood: 'Gentle'    },
];

@Injectable({ providedIn: 'root' })
export class MusicService {
  readonly activePlaylist = signal<Playlist | null>(null);
  readonly isPlaying = signal(false);

  getDefaultPlaylists(): Playlist[] {
    return FOCUS_PLAYLISTS;
  }

  setActivePlaylist(playlist: Playlist): void {
    this.activePlaylist.set(playlist);
    this.isPlaying.set(true);
  }

  stopPlayback(): void {
    this.activePlaylist.set(null);
    this.isPlaying.set(false);
  }

  togglePlayback(): void {
    this.isPlaying.update((v) => !v);
  }
}
