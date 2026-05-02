import {
  Component, ChangeDetectionStrategy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MusicPlayerComponent } from '../../shared/components/music-player/music-player.component';
import { routeAnimations, contentLoadAnim } from '../../shared/animations/route.animations';
import { Store } from '@ngrx/store';
import { selectCurrentMusic } from '../../core/store/app.selectors';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MusicPlayerComponent],
  animations: [routeAnimations, contentLoadAnim],
  styles: [`
    :host {
      display: flex;
      height: 100dvh;
      width: 100vw;
      overflow: hidden;
    }
    .route-container {
      position: relative;
      flex: 1;
      overflow: hidden;
    }
    /* Exclude router-outlet element itself — it must NOT get position:absolute
       or it becomes a full-screen transparent click-blocker overlay */
    .route-container > *:not(router-outlet) {
      position: absolute;
      inset: 0;
      overflow-y: auto;
    }
  `],
  template: `
    <app-sidebar></app-sidebar>

    <main @contentLoad
          class="flex-1 flex flex-col overflow-hidden"
          [style.padding-bottom]="music().playing ? '68px' : '0'">

      <div class="route-container flex-1"
           [@routeAnimation]="getAnimState(outlet)">
        <router-outlet #outlet="outlet"></router-outlet>
      </div>

    </main>

    <app-music-player></app-music-player>
  `,
})
export class ShellComponent {
  private store = inject(Store);
  music = this.store.selectSignal(selectCurrentMusic);

  getAnimState(outlet: RouterOutlet): string {
    return outlet.isActivated
      ? ((outlet.activatedRoute.snapshot.data['animation'] as string) ?? 'page')
      : 'void';
  }
}
