import {
  Component, ChangeDetectionStrategy, inject, signal,
  computed, OnInit, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MusicService } from '../../core/services/music.service';
import { AgentService, MusicResult } from '../../core/services/agent.service';
import { setCurrentMusic, stopMusic } from '../../core/store/app.actions';
import { selectCurrentMusic } from '../../core/store/app.selectors';
import { Playlist } from '../../core/store/app.state';
import { musicCardFlip, thinkingAnim } from '../../shared/animations/route.animations';

@Component({
  selector: 'app-focus-music',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // FormsModule removed — no ngModel used anymore
  imports: [CommonModule],
  animations: [musicCardFlip, thinkingAnim],
  template: `
    <div class="flex flex-col h-full overflow-y-auto px-6 py-6" style="color: var(--text-primary)">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎵</span>
          <div>
            <h1 class="font-semibold text-base">Focus Music</h1>
            <p class="text-xs" style="color: var(--text-muted)">Curated playlists for deep work</p>
          </div>
        </div>

        <!-- Mood filter -->
        <div class="flex gap-2">
          <button *ngFor="let mood of moods"
                  (click)="setMoodFilter(mood)"
                  class="text-xs px-3 py-1.5 rounded-full transition-all"
                  [style.background]="activeMood() === mood ? 'var(--primary)' : 'var(--bg-card)'"
                  [style.color]="activeMood() === mood ? 'white' : 'var(--text-muted)'"
                  [style.border]="'1px solid ' + (activeMood() === mood ? 'var(--primary)' : 'var(--border)')">
            {{ mood }}
          </button>
        </div>
      </div>

      <!-- Playlist grid -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div
          *ngFor="let playlist of filteredPlaylists(); let i = index"
          @cardFlip
          [style.animation-delay]="(i * 80) + 'ms'"
          (click)="playPlaylist(playlist)"
          class="music-card"
          [class.active]="activePlaylistId() === playlist.id">

          <div class="text-3xl mb-3">{{ playlist.emoji }}</div>
          <div class="font-medium text-sm mb-1" style="color: var(--text-primary)">{{ playlist.name }}</div>
          <div class="inline-block text-xs px-2 py-0.5 rounded-full"
               style="background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted)">
            {{ playlist.mood }}
          </div>

          <!-- Playing indicator -->
          <div *ngIf="activePlaylistId() === playlist.id" class="flex justify-center gap-0.5 mt-3 h-4 items-end">
            <div *ngFor="let h of [3,5,4,6,3]" class="w-1 rounded-full"
                 [style.height.px]="h"
                 style="background: var(--primary-light); animation: dotPulse 0.8s ease-in-out infinite;"></div>
          </div>
        </div>
      </div>

      <!-- Search section -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold mb-3" style="color: var(--text-muted)">🔎 Search for more music</h2>
        <div class="flex gap-3">
          <!--
            Uncontrolled input — no [(ngModel)].
            Eliminates per-keypress change detection on this component.
          -->
          <input
            #searchRef
            (keydown.enter)="searchMusic()"
            placeholder="Search focus music… (uses AI research agent)"
            class="folio-input flex-1">

          <button (click)="searchMusic()"
                  [disabled]="isSearching()"
                  class="folio-btn-primary flex-shrink-0 flex items-center gap-2">
            <div *ngIf="isSearching()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <svg *ngIf="!isSearching()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>Search</span>
          </button>
        </div>
      </div>

      <!-- Search results -->
      <div *ngIf="searchResults().length > 0">
        <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: var(--text-dim)">
          Search Results
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div *ngFor="let result of searchResults(); let i = index"
               @cardFlip
               (click)="playSearchResult(result)"
               class="music-card"
               [class.active]="activeSearchId() === i">
            <div class="text-3xl mb-3">🎶</div>
            <div class="font-medium text-sm mb-1 line-clamp-2" style="color: var(--text-primary)">{{ result.title }}</div>
            <div class="inline-block text-xs px-2 py-0.5 rounded-full"
                 style="background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted)">
              Custom
            </div>
          </div>
        </div>
      </div>

      <!-- Searching state -->
      <div *ngIf="isSearching()" @thinkingFade class="flex items-center gap-3 mt-4">
        <div class="flex gap-1">
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
        </div>
        <span class="text-xs" style="color: var(--text-muted)">Searching for focus music…</span>
      </div>

    </div>
  `,
})
export class FocusMusicComponent implements OnInit {
  private store = inject(Store);
  private musicSvc = inject(MusicService);
  private agentSvc = inject(AgentService);

  @ViewChild('searchRef') searchRef!: ElementRef<HTMLInputElement>;

  playlists = signal(this.musicSvc.getDefaultPlaylists());
  activeMood = signal<string>('All');
  searchResults = signal<MusicResult[]>([]);
  isSearching = signal(false);
  activeSearchId = signal<number | null>(null);

  currentMusic = this.store.selectSignal(selectCurrentMusic);
  activePlaylistId = computed(() => this.currentMusic().playlist?.id ?? null);

  moods = ['All', 'Chill', 'Intense', 'Creative', 'Calm', 'Energetic', 'Peaceful', 'Focused', 'Epic', 'Deep Work', 'Gentle'];

  filteredPlaylists = computed(() => {
    const mood = this.activeMood();
    if (mood === 'All') return this.playlists();
    return this.playlists().filter((p) => p.mood === mood);
  });

  ngOnInit(): void {}

  setMoodFilter(mood: string): void {
    this.activeMood.set(mood);
  }

  playPlaylist(playlist: Playlist): void {
    this.activeSearchId.set(null);
    if (this.currentMusic().playlist?.id === playlist.id) {
      this.store.dispatch(stopMusic());
    } else {
      this.store.dispatch(setCurrentMusic({ playlist }));
    }
  }

  playSearchResult(result: MusicResult): void {
    const idx = this.searchResults().indexOf(result);
    this.activeSearchId.set(idx);
    const playlist: Playlist = {
      id: 999 + idx,
      name: result.title,
      emoji: '🎶',
      embedUrl: result.embedUrl,
      mood: 'Custom',
    };
    this.store.dispatch(setCurrentMusic({ playlist }));
  }

  searchMusic(): void {
    const query = this.searchRef?.nativeElement?.value?.trim();
    if (!query || this.isSearching()) return;

    this.isSearching.set(true);
    this.searchResults.set([]);

    this.agentSvc.searchMusic(query).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
      },
    });
  }
}