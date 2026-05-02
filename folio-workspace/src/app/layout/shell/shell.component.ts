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
    :host { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
    .route-container {
      position: relative;
      flex: 1;
      overflow: hidden;
    }
    /* The component injected by router-outlet needs to fill its container */
    .route-container > * {
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

      <!-- Animation wrapper: state drives cross-fade, child fills full height -->
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
