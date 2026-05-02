import {
  Component, OnInit, inject, ChangeDetectionStrategy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ShellComponent } from './layout/shell/shell.component';
import { loadSettings } from './core/store/app.actions';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ShellComponent],
  template: `
    <!-- Animated gradient mesh background -->
    <div class="gradient-mesh-bg" aria-hidden="true" style="pointer-events: none;"></div>

    <!-- App shell (sidebar + main content) -->
    <app-shell></app-shell>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      position: relative;
      z-index: 1;
    }
  `],
})
export class AppComponent implements OnInit {
  private store = inject(Store);

  ngOnInit(): void {
    // Rehydrate settings from localStorage on app start
    this.store.dispatch(loadSettings());
  }
}
