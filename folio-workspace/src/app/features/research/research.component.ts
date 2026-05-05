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
      <!-- projectPath still uses ngModel — config field, not chat input, no INP impact -->
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
        <div *ngIf="messages().length === 0 && !streamingId()" class="flex flex-col items-center justify-center h-full gap-4 py-12">
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

        <!-- Committed messages — array only updated when message is complete -->
        <app-message-bubble
          *ngFor="let msg of messages(); trackBy: trackById"
          [message]="msg">
        </app-message-bubble>

        <!-- Streaming message — isolated signal, no array map per token -->
        <app-message-bubble
          *ngIf="streamingId()"
          [message]="streamingMessage()">
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
            #inputRef
            (keydown.enter)="onEnter($event)"
            placeholder="Ask a research question… (⏎ to send)"
            rows="2"
            class="folio-input flex-1 resize-none"
            style="min-height: 52px; max-height: 160px"
            [disabled]="isThinking()">
          </textarea>

          <button
            (click)="sendQuery()"
            [disabled]="isThinking()"
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
  @ViewChild('inputRef') inputRef!: ElementRef<HTMLTextAreaElement>;

  // Committed messages — only updated once per message (when streaming completes)
  messages = signal<ChatMessage[]>([]);

  // Isolated streaming signals — only these update per token
  streamingId = signal<string>('');
  streamingContent = signal<string>('');
  streamingSources = signal<any>(null);
  currentAgent = signal<'codebase' | 'search' | ''>('');

  // Derived message object for the streaming bubble
  streamingMessage = (): ChatMessage => ({
    id: this.streamingId(),
    role: 'agent',
    agent: this.currentAgent() || undefined,
    content: this.streamingContent(),
    streaming: true,
    sources: this.streamingSources(),
    timestamp: new Date(),
  });

  isThinking = signal(false);
  projectPath = '/Users/username/my-angular-project';

  private streamSub?: Subscription;

  suggestedQueries = [
    'How does change detection work in Angular?',
    'Best practices for NgRx in large apps',
    'Compare Angular Signals vs RxJS',
    'How to optimize Angular bundle size?',
  ];

  private readonly scrollEffect = effect(() => {
    // Track both signals so scroll triggers on new messages AND streaming tokens
    this.messages();
    this.streamingContent();
    setTimeout(() => this.scrollToBottom(), 50);
  });

  ngOnInit(): void {
    this.store.select(selectProjectPath).subscribe((p) => (this.projectPath = p));
  }

  clearConversation(): void {
    this.messages.set([]);
    this.streamSub?.unsubscribe();
    this.isThinking.set(false);
    this.currentAgent.set('');
    this.streamingId.set('');
    this.streamingContent.set('');
    this.streamingSources.set(null);
  }

  onEnter(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.sendQuery();
    }
  }

  sendQuery(text?: string): void {
    const msg = text ?? this.inputRef?.nativeElement?.value?.trim();
    if (!msg || this.isThinking()) return;

    if (!text && this.inputRef?.nativeElement) {
      this.inputRef.nativeElement.value = '';
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    this.messages.update((m) => [...m, userMsg]);
    this.isThinking.set(true);
    this.currentAgent.set('');

    const agentMsgId = crypto.randomUUID();
    const agentMsgTimestamp = new Date();

    setTimeout(() => {
      this.isThinking.set(false);

      // Initialize streaming signals
      this.streamingId.set(agentMsgId);
      this.streamingContent.set('');
      this.streamingSources.set(null);

      this.streamSub = this.agentSvc
        .streamResearch(msg, this.projectPath)
        .subscribe({
          next: (token: StreamToken) => {
            // Only small signals updated per token — no array map
            if (token.agent) {
              this.currentAgent.set(token.agent);
            }
            this.streamingContent.update(c => c + token.token);
            if (token.sources) {
              this.streamingSources.set(token.sources);
            }

            if (token.done) {
              this.commitStreamingMessage(agentMsgId, agentMsgTimestamp);
            }
          },
          error: (err: Error) => {
            const errorMsg: ChatMessage = {
              id: agentMsgId,
              role: 'agent',
              content: `⚠️ Error: ${err.message}`,
              streaming: false,
              timestamp: agentMsgTimestamp,
            };
            this.messages.update(msgs => [...msgs, errorMsg]);
            this.clearStreamingState();
            this.isThinking.set(false);
          },
          complete: () => {
            // Safety net — if done flag never arrived
            if (this.streamingId()) {
              this.commitStreamingMessage(agentMsgId, agentMsgTimestamp);
            }
          },
        });
    }, 600);
  }

  private commitStreamingMessage(id: string, timestamp: Date): void {
    const completedMsg: ChatMessage = {
      id,
      role: 'agent',
      agent: this.currentAgent() || undefined,
      content: this.streamingContent(),
      streaming: false,
      sources: this.streamingSources(),
      timestamp,
    };
    this.messages.update(msgs => [...msgs, completedMsg]);
    this.clearStreamingState();
  }

  private clearStreamingState(): void {
    this.streamingId.set('');
    this.streamingContent.set('');
    this.streamingSources.set(null);
    this.currentAgent.set('');
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}