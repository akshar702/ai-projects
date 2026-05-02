import {
  Component, ChangeDetectionStrategy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { toggleSidebar, setActiveSection } from '../../core/store/app.actions';
import { selectSidebarCollapsed, selectActiveSection } from '../../core/store/app.selectors';
import { ActiveSection } from '../../core/store/app.state';
import { sidebarAnimation } from '../../shared/animations/route.animations';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  section: ActiveSection;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  animations: [sidebarAnimation],
  styles: [`
    .label {
      transition: opacity 150ms ease, max-width 300ms ease;
      overflow: hidden;
      white-space: nowrap;
    }
    .label.hidden-label {
      opacity: 0;
      max-width: 0;
      pointer-events: none;
    }
    .label.visible-label {
      opacity: 1;
      max-width: 160px;
    }
  `],
  template: `
    <nav
      [@sidebarWidth]="collapsed() ? 'collapsed' : 'expanded'"
      class="flex flex-col h-full flex-shrink-0 relative z-10"
      style="background: var(--bg-surface); border-right: 1px solid var(--border); overflow: hidden">

      <!-- Logo -->
      <div class="flex items-center px-3 py-4 border-b flex-shrink-0"
           style="border-color: var(--border); min-height: 60px">

        <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center
                    text-white font-bold text-sm"
             style="background: linear-gradient(135deg, var(--primary), var(--accent))">
          F
        </div>

        <span class="label ml-3 font-semibold text-base"
              [class.hidden-label]="collapsed()"
              [class.visible-label]="!collapsed()"
              style="color: var(--text-primary)">
          Folio
        </span>

        <div class="flex-1"></div>

        <button (click)="onToggle()"
                class="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center"
                style="background: var(--bg-card); border: 1px solid var(--border);
                       color: var(--text-muted); cursor: pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Section header -->
      <div class="px-4 pt-4 pb-2 flex-shrink-0">
        <span class="label text-xs font-semibold uppercase tracking-widest"
              [class.hidden-label]="collapsed()"
              [class.visible-label]="!collapsed()"
              style="color: var(--text-dim)">
          Workspace
        </span>
      </div>

      <!-- Nav items -->
      <div class="flex-1 px-2 space-y-0.5 overflow-y-auto">
        <div *ngFor="let item of navItems"
             (click)="navigate(item)"
             class="nav-item"
             [class.active]="activeSection() === item.section"
             [title]="collapsed() ? item.label : ''">

          <span class="text-lg leading-none flex-shrink-0">{{ item.icon }}</span>

          <span class="label text-sm"
                [class.hidden-label]="collapsed()"
                [class.visible-label]="!collapsed()"
                style="color: inherit">
            {{ item.label }}
          </span>
        </div>
      </div>

      <!-- Settings -->
      <div class="px-2 py-3 flex-shrink-0 border-t" style="border-color: var(--border)">
        <div (click)="navigate(settingsItem)"
             class="nav-item"
             [class.active]="activeSection() === 'settings'"
             [title]="collapsed() ? 'Settings' : ''">

          <span class="text-lg leading-none flex-shrink-0">⚙️</span>

          <span class="label text-sm"
                [class.hidden-label]="collapsed()"
                [class.visible-label]="!collapsed()"
                style="color: inherit">
            Settings
          </span>
        </div>
      </div>

    </nav>
  `,
})
export class SidebarComponent {
  private store = inject(Store);
  private router = inject(Router);

  collapsed    = this.store.selectSignal(selectSidebarCollapsed);
  activeSection = this.store.selectSignal(selectActiveSection);

  navItems: NavItem[] = [
    { icon: '🤖', label: 'Code Intel',  route: '/code-intel',  section: 'code-intel'  },
    { icon: '🔍', label: 'Research',    route: '/research',    section: 'research'    },
    { icon: '🎵', label: 'Focus Music', route: '/focus-music', section: 'focus-music' },
  ];

  settingsItem: NavItem = {
    icon: '⚙️', label: 'Settings', route: '/settings', section: 'settings'
  };

  onToggle(): void { this.store.dispatch(toggleSidebar()); }

  navigate(item: NavItem): void {
    this.store.dispatch(setActiveSection({ section: item.section }));
    this.router.navigate([item.route]);
  }
}
