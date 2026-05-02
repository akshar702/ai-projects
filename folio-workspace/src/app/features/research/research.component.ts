import {
  Component, ChangeDetectionStrategy, inject, signal, effect,
  ViewChild, ElementRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AgentService, StreamToken } from '../../core/services/agent.service';
import { selectProjectPath } from '../../core/store/app.selectors';
import { ChatMessage } from '../../shared/components/message-bubble/message-bubble.component';
import { MessageBubbleComponent } from '../../shared/components/message-bubble/message-bubble.component';
import { thinkingAnim } from '../../shared/animations/route.animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-research',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MessageBubbleComponent],
  animations: [thinkingAnim],
  template: `
    <div class="flex flex-col h-full" style="color: var(--text-primary)">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
           style="border-color: var(--border); background: var(--bg-surface)">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔍</span>
          <div>
            <h1 class="font-semibold text-base">Research Assistant</h1>
            <p class="text-xs" style="color: var(--text-muted)">Agentic deep research with live search</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Agent legend -->
          <span class="badge badge-codebase text-xs">codebase</span>
          <span class="badge badge-search text-xs">search</span>

          <button (click)="clearConversation()"
                  class="text-xs px-3 py-1.5 rounded-lg ml-2 transition-all"
                  style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted)"
                  [disabled]="messages().length === 0">
            Clear
          </button>
        </div>
      </div>

      <!-- Project path config -->
      <div class="px-6 py-3 border-b flex items-center gap-3 flex-shrink-0"
           style="border-color: var(--border); background: var(--bg-surface)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             style="color: var(--text-muted); flex-shrink: 0">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <input
          [(ngModel)]="projectPath"
          placeholder="Project path for codebase agent…"
          class="folio-input"
          style="max-width: 400px; padding: 6px 12px; font-size: 12px">
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto px-6 py-4" #messagesContainer>

        <!-- Empty state -->
        <div *ngIf="messages().length === 0" class="flex flex-col items-center justify-center h-full gap-4 py-12">
          <div class="text-4xl">🔍</div>
          <h2 class="text-lg font-semibold">Research Assistant</h2>
          <p class="text-sm text-center max-w-xs" style="color: var(--text-muted)">
            Ask complex questions. The agent will search your codebase and the web to build a comprehensive answer.
          </p>
          <div class="flex flex-wrap gap-2 mt-2 justify-center max-w-md">
            <button *ngFor="let q of suggestedQueries"
                    (click)="sendQuery(q)"
                    class="text-xs px-3 py-2 rounded-lg transition-all"
                    style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted)">
              {{ q }}
            </button>
          </div>
        </div>

        <app-message-bubble
          *ngFor="let msg of messages(); trackBy: trackById"
          [message]="msg">
        </app-message-bubble>

        <!-- Thinking -->
        <div *ngIf="isThinking()" @thinkingFade class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
               style="background: linear-gradient(135deg, var(--primary), var(--accent))">🔍</div>
          <div class="msg-agent flex items-center gap-3">
            <div class="flex gap-1">
              <div class="thinking-dot"></div>
              <div class="thinking-dot"></div>
              <div class="thinking-dot"></div>
            </div>
            <span class="text-xs" style="color: var(--text-muted)">
              Researching with <span class="badge badge-{{ currentAgent() }} ml-1">{{ currentAgent() || 'agent' }}</span>…
            </span>
          </div>
        </div>

      </div>

      <!-- Input -->
      <div class="px-6 py-4 flex-shrink-0 border-t" style="border-color: var(--border); background: var(--bg-surface)">
        <div class="flex gap-3 items-end">
          <textarea
            [(ngModel)]="inputText"
            (keydown.enter)="onEnter($event)"
            placeholder="Ask a research question… (⏎ to send)"
            rows="2"
            class="folio-input flex-1 resize-none"
            style="min-height: 52px; max-height: 160px"
            [disabled]="isThinking()">
          </textarea>

          <button
            (click)="sendQuery()"
            [disabled]="!inputText.trim() || isThinking()"
            class="folio-btn-primary flex-shrink-0 flex items-center gap-2"
            style="height: 52px; padding: 0 20px">
            <svg *ngIf="!isThinking()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <div *ngIf="isThinking()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Research</span>
          </button>
        </div>
      </div>

    </div>
  `,
})
export class ResearchComponent implements OnInit {
  private store = inject(Store);
  private agentSvc = inject(AgentService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  messages = signal<ChatMessage[]>([]);
  inputText = '';
  isThinking = signal(false);
  currentAgent = signal<'codebase' | 'search' | ''>('');
  projectPath = '/Users/username/my-angular-project';

  private streamSub?: Subscription;

  suggestedQueries = [
    'How does change detection work in Angular?',
    'Best practices for NgRx in large apps',
    'Compare Angular Signals vs RxJS',
    'How to optimize Angular bundle size?',
  ];

  private readonly scrollEffect = effect(() => {
    const msgs = this.messages();
    if (msgs.length > 0) setTimeout(() => this.scrollToBottom(), 50);
  });

  ngOnInit(): void {
    this.store.select(selectProjectPath).subscribe((p) => (this.projectPath = p));
  }

  clearConversation(): void {
    this.messages.set([]);
    this.streamSub?.unsubscribe();
    this.isThinking.set(false);
    this.currentAgent.set('');
  }

  onEnter(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) { event.preventDefault(); this.sendQuery(); }
  }

  sendQuery(text?: string): void {
    const q = (text ?? this.inputText).trim();
    if (!q || this.isThinking()) return;
    if (!text) this.inputText = '';

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: q, timestamp: new Date(),
    };
    this.messages.update((m) => [...m, userMsg]);
    this.isThinking.set(true);
    this.currentAgent.set('');

    const agentMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'agent', content: '',
      streaming: true, timestamp: new Date(),
    };

    setTimeout(() => {
      this.isThinking.set(false);
      this.messages.update((m) => [...m, agentMsg]);

      this.streamSub = this.agentSvc
        .streamResearch(q, this.projectPath)
        .subscribe({
          next: (token: StreamToken) => {
            if (token.agent) {
              this.currentAgent.set(token.agent);
            }
            this.messages.update((msgs) =>
              msgs.map((m) =>
                m.id === agentMsg.id
                  ? {
                      ...m,
                      content: m.content + token.token,
                      agent: (token.agent as any) ?? m.agent,
                      streaming: !token.done,
                      sources: token.sources ?? m.sources,
                    }
                  : m
              )
            );
          },
          error: (err: Error) => {
            this.messages.update((msgs) =>
              msgs.map((m) =>
                m.id === agentMsg.id
                  ? { ...m, content: `⚠️ Error: ${err.message}`, streaming: false }
                  : m
              )
            );
            this.isThinking.set(false);
          },
          complete: () => {
            this.messages.update((msgs) =>
              msgs.map((m) => (m.id === agentMsg.id ? { ...m, streaming: false } : m))
            );
            this.currentAgent.set('');
          },
        });
    }, 600);
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
