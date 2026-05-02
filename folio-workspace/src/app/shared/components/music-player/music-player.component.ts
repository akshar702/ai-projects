import {
  Component, ChangeDetectionStrategy, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { selectCurrentMusic } from '../../../core/store/app.selectors';
import { stopMusic } from '../../../core/store/app.actions';
import { playerSlideUp } from '../../animations/route.animations';

@Component({
  selector: 'app-music-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  animations: [playerSlideUp],
  template: `
    @if (music().playing && music().playlist) {
      <div @playerSlide
           class="fixed bottom-0 left-0 right-0 z-50 glass"
           style="border-top: 1px solid var(--border); border-radius: 12px 12px 0 0;">
        <div class="flex items-center gap-4 px-6 py-3">

          <!-- Emoji thumbnail -->
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
               style="background: var(--bg-card); border: 1px solid var(--primary)">
            {{ music().playlist!.emoji }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate" style="color: var(--text-primary)">
              {{ music().playlist!.name }}
            </div>
            <div class="text-xs" style="color: var(--text-muted)">
              {{ music().playlist!.mood }} · Now Playing
            </div>
          </div>

          <!-- Visualizer dots -->
          <div class="flex items-end gap-1 h-6 mr-2">
            <div *ngFor="let h of [4,7,5,8,3,6,5]"
                 class="w-1 rounded-full"
                 [style.height.px]="h + 2"
                 style="background: var(--primary-light); animation: dotPulse 0.8s ease-in-out infinite">
            </div>
          </div>

          <!-- Iframe (FIX 5: width/height 0 keeps it in DOM so YouTube audio plays) -->
          <iframe
            [src]="safeUrl()"
            allow="autoplay; encrypted-media"
            width="0"
            height="0"
            style="position:absolute; opacity:0; pointer-events:none;"
            title="Folio Music Player">
          </iframe>

          <!-- Controls -->
          <button
            (click)="onStop()"
            class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted)"
            aria-label="Stop music">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>

        </div>

        <!-- Subtle progress bar (cosmetic) -->
        <div class="h-0.5 w-full overflow-hidden" style="background: var(--border)">
          <div class="h-full" style="background: linear-gradient(90deg, var(--primary), var(--accent)); animation: shimmer 3s linear infinite; background-size: 200% 100%"></div>
        </div>
      </div>
    }
  `,
})
export class MusicPlayerComponent {
  private store = inject(Store);
  private sanitizer = inject(DomSanitizer);

  music = this.store.selectSignal(selectCurrentMusic);

  safeUrl(): SafeResourceUrl {
    const url = this.music().playlist?.embedUrl ?? '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url + '?autoplay=1');
  }

  onStop(): void {
    this.store.dispatch(stopMusic());
  }
}
