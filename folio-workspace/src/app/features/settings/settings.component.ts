import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { updateSettings } from '../../core/store/app.actions';
import { selectSettings } from '../../core/store/app.selectors';
import { AppSettings } from '../../core/store/app.state';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full overflow-y-auto px-6 py-6" style="color: var(--text-primary)">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-8">
        <span class="text-2xl">⚙️</span>
        <div>
          <h1 class="font-semibold text-base">Settings</h1>
          <p class="text-xs" style="color: var(--text-muted)">Configure backends, project paths, and preferences</p>
        </div>
      </div>

      <div class="max-w-xl space-y-6">

        <!-- Backend URLs -->
        <div class="glass rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4 flex items-center gap-2" style="color: var(--text-primary)">
            <span class="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style="background: rgba(124,58,237,0.2); color: var(--primary-light)">🔌</span>
            Backend Configuration
          </h2>

          <div class="space-y-4">
            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color: var(--text-muted)">
                P1 — RAG Backend URL
              </label>
              <input
                [(ngModel)]="form.p1BackendUrl"
                [placeholder]="defaultP1"
                class="folio-input">
              <p class="text-xs mt-1" style="color: var(--text-dim)">
                FastAPI server running the RAG document Q&A service
              </p>
            </div>

            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color: var(--text-muted)">
                P2 — Research Backend URL
              </label>
              <input
                [(ngModel)]="form.p2BackendUrl"
                [placeholder]="defaultP2"
                class="folio-input">
              <p class="text-xs mt-1" style="color: var(--text-dim)">
                FastAPI server running the Agentic Research Assistant
              </p>
            </div>
          </div>
        </div>

        <!-- Project path -->
        <div class="glass rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4 flex items-center gap-2" style="color: var(--text-primary)">
            <span class="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style="background: rgba(6,182,212,0.2); color: var(--accent-light)">📁</span>
            Project Configuration
          </h2>

          <div>
            <label class="text-xs font-medium mb-1.5 block" style="color: var(--text-muted)">
              Angular Project Path
            </label>
            <input
              [(ngModel)]="form.projectPath"
              placeholder="/path/to/your/angular-project"
              class="folio-input">
            <p class="text-xs mt-1" style="color: var(--text-dim)">
              Used by the codebase agent in Research mode
            </p>
          </div>
        </div>

        <!-- Theme -->
        <div class="glass rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4 flex items-center gap-2" style="color: var(--text-primary)">
            <span class="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style="background: rgba(16,185,129,0.2); color: var(--success)">🎨</span>
            Appearance
          </h2>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm" style="color: var(--text-primary)">Theme</div>
              <div class="text-xs mt-0.5" style="color: var(--text-muted)">Light theme coming soon</div>
            </div>
            <div class="flex gap-2">
              <button class="px-4 py-2 rounded-lg text-xs font-medium"
                      style="background: var(--primary); color: white; border: 1px solid var(--primary)">
                Dark
              </button>
              <button class="px-4 py-2 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed"
                      style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted)"
                      disabled>
                Light
              </button>
            </div>
          </div>
        </div>

        <!-- About -->
        <div class="glass rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary)">About Folio</h2>
          <div class="space-y-1.5 text-xs" style="color: var(--text-muted)">
            <div class="flex justify-between"><span>Version</span><span style="color: var(--text-primary)">1.0.0</span></div>
            <div class="flex justify-between"><span>Angular</span><span style="color: var(--text-primary)">17+</span></div>
            <div class="flex justify-between"><span>NgRx</span><span style="color: var(--text-primary)">17.2</span></div>
            <div class="flex justify-between"><span>P1 default</span><span style="color: var(--primary-light)">{{ defaultP1 }}</span></div>
            <div class="flex justify-between"><span>P2 default</span><span style="color: var(--accent-light)">{{ defaultP2 }}</span></div>
          </div>
        </div>

        <!-- Save button -->
        <div class="flex items-center gap-3 pt-2">
          <button (click)="save()" class="folio-btn-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Settings
          </button>

          <button (click)="resetToDefaults()"
                  class="text-xs px-4 py-2 rounded-lg transition-all"
                  style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer">
            Reset to Defaults
          </button>

          <div *ngIf="saved()" class="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
               style="background: rgba(16,185,129,0.1); border: 1px solid var(--success); color: var(--success)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Settings saved
          </div>
        </div>

      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private sub?: Subscription;

  // Placeholders and defaults come from the environment (swapped at build time)
  readonly defaultP1 = environment.p1BackendUrl;
  readonly defaultP2 = environment.p2BackendUrl;

  form: AppSettings = {
    p1BackendUrl: environment.p1BackendUrl,
    p2BackendUrl: environment.p2BackendUrl,
    projectPath: '',
  };

  saved = signal(false);
  private savedTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.sub = this.store.select(selectSettings).subscribe((s) => {
      this.form = { ...s };
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  save(): void {
    this.store.dispatch(updateSettings({ settings: { ...this.form } }));
    this.saved.set(true);
    clearTimeout(this.savedTimeout);
    this.savedTimeout = setTimeout(() => this.saved.set(false), 3000);
  }

  resetToDefaults(): void {
    this.form = {
      p1BackendUrl: environment.p1BackendUrl,
      p2BackendUrl: environment.p2BackendUrl,
      projectPath: '',
    };
    this.store.dispatch(updateSettings({ settings: { ...this.form } }));
    this.saved.set(true);
    clearTimeout(this.savedTimeout);
    this.savedTimeout = setTimeout(() => this.saved.set(false), 3000);
  }
}
