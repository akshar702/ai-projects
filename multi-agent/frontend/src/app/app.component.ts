import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChatComponent } from './chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="h-screen w-screen flex flex-col bg-ink-900">
      <header
        class="px-6 py-4 border-b border-ink-700 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center font-bold text-ink-900"
          >
            F
          </div>
          <div>
            <h1 class="text-lg font-semibold leading-tight">Folio</h1>
            <p class="text-xs text-slate-400">
              Agentic research assistant for Angular
            </p>
          </div>
        </div>
      </header>
      <div class="flex-1 min-h-0">
        <app-chat />
      </div>
    </main>
  `,
})
export class AppComponent {}
