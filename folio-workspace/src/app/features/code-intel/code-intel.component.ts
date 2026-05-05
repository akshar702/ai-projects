import {
  Component, ChangeDetectionStrategy, inject, signal,
  effect, ElementRef, ViewChild, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AgentService, StreamToken } from '../../core/services/agent.service';
import { ChatMessage } from '../../shared/components/message-bubble/message-bubble.component';
import { MessageBubbleComponent } from '../../shared/components/message-bubble/message-bubble.component';
import { thinkingAnim, userMessageAnim, agentMessageAnim } from '../../shared/animations/route.animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-code-intel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MessageBubbleComponent],
  animations: [thinkingAnim, userMessageAnim, agentMessageAnim],
  template: `
    <div class="flex flex-col h-full" style="color: var(--text-primary)">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
           style="border-color: var(--border); background: var(--bg-surface)">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🤖</span>
          <div>
            <h1 class="font-semibold text-base">Code Intel</h1>
            <p class="text-xs" style="color: var(--text-muted)">RAG-powered Angular code Q&A</p>
          </div>
        </div>

        <!-- Session + Status -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
               style="background: var(--bg-card); border: 1px solid var(--border)">
            <div class="w-2 h-2 rounded-full"
                 [style.background]="p1Connected() ? 'var(--success)' : 'var(--text-dim)'">
            </div>
            <span style="color: var(--text-muted)">{{ p1Connected() ? 'Connected' : 'Offline' }}</span>
          </div>

          <button (click)="clearSession()"
                  class="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted)"
                  [disabled]="messages().length === 0">
            Clear
          </button>
        </div>
      </div>

      <!-- Upload bar -->
      <div class="px-6 py-3 border-b flex items-center gap-3 flex-shrink-0"
           style="border-color: var(--border); background: var(--bg-surface)">
        <input
          type="file" accept=".pdf,.txt,.ts,.js,.html,.css,.scss,.md"
          class="hidden" #fileInput (change)="onFileChange($event)">

        <button (click)="fileInput.click()"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                style="background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Upload Document
        </button>

        <span *ngIf="uploadedFile()" class="text-xs px-3 py-1.5 rounded-lg flex items-center gap-2"
              style="background: rgba(124,58,237,0.1); border: 1px solid var(--primary); color: var(--primary-light)">
          📄 {{ uploadedFile() }}
          <button (click)="clearFile()" style="color: var(--text-muted)">&times;</button>
        </span>

        <div class="flex-1"></div>

        <span class="text-xs" style="color: var(--text-dim)">Session: {{ sessionId().slice(0,8) }}…</span>
      </div>

      <!-- Messages area -->
      <div class="flex-1 overflow-y-auto px-6 py-4" #messagesContainer>

        <!-- Empty state -->
        <div *ngIf="messages().length === 0 && !streamingId()" class="flex flex-col items-center justify-center h-full gap-4 py-12">
          <div class="text-4xl">🤖</div>
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Code Intel Ready</h2>
          <p class="text-sm text-center max-w-xs" style="color: var(--text-muted)">
            Upload a PDF or code file, then ask questions about your Angular codebase.
          </p>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <button *ngFor="let q of suggestedQueries"
                    (click)="sendMessage(q)"
                    class="text-xs px-3 py-2 rounded-lg text-left transition-all hover:border-purple-500"
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

        <!-- Thinking state -->
        <div *ngIf="isThinking()" @thinkingFade class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
               style="background: linear-gradient(135deg, var(--primary), var(--accent))">🤖</div>
          <div class="msg-agent flex items-center gap-3">
            <div class="flex gap-1">
              <div class="thinking-dot"></div>
              <div class="thinking-dot"></div>
              <div class="thinking-dot"></div>
            </div>
            <span class="text-xs" style="color: var(--text-muted)">Folio is thinking…</span>
          </div>
        </div>

      </div>

      <!-- Input area -->
      <div class="px-6 py-4 flex-shrink-0 border-t" style="border-color: var(--border); background: var(--bg-surface)">
        <div class="flex gap-3 items-end">
          <textarea
            #inputRef
            (keydown.enter)="onEnter($event)"
            [placeholder]="'Ask about your Angular code… (⏎ to send, Shift+⏎ for newline)'"
            rows="2"
            class="folio-input flex-1 resize-none"
            style="min-height: 52px; max-height: 160px"
            [disabled]="isThinking()">
          </textarea>

          <button
            (click)="sendMessage()"
            [disabled]="isThinking()"
            class="folio-btn-primary flex-shrink-0 flex items-center gap-2"
            style="height: 52px; padding: 0 20px">
            <svg *ngIf="!isThinking()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <div *ngIf="isThinking()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Send</span>
          </button>
        </div>
      </div>

    </div>
  `,
})
export class CodeIntelComponent implements OnInit {
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

  // Derived message object for the streaming bubble
  streamingMessage = (): ChatMessage => ({
    id: this.streamingId(),
    role: 'agent',
    agent: 'RAG',
    content: this.streamingContent(),
    streaming: true,
    sources: this.streamingSources(),
    timestamp: new Date(),
  });

  isThinking = signal(false);
  uploadedFile = signal<string | null>(null);
  sessionId = signal(this.newSessionId());
  p1Connected = signal(true);

  private streamSub?: Subscription;

  suggestedQueries = [
    'Explain standalone components in Angular 17',
    'How do I use Angular Signals?',
    'What are OnPush change detection best practices?',
    'Explain NgRx effects with an example',
  ];

  private readonly scrollEffect = effect(() => {
    // Track both signals so scroll triggers on new messages AND streaming tokens
    this.messages();
    this.streamingContent();
    setTimeout(() => this.scrollToBottom(), 50);
  });

  ngOnInit(): void {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.uploadedFile.set(input.files[0].name);
    }
  }

  clearFile(): void {
    this.uploadedFile.set(null);
  }

  clearSession(): void {
    this.messages.set([]);
    this.sessionId.set(this.newSessionId());
    this.streamSub?.unsubscribe();
    this.isThinking.set(false);
    this.streamingId.set('');
    this.streamingContent.set('');
    this.streamingSources.set(null);
  }

  onEnter(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(text?: string): void {
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

    const agentMsgId = crypto.randomUUID();
    const agentMsgTimestamp = new Date();

    setTimeout(() => {
      this.isThinking.set(false);

      // Initialize streaming signals
      this.streamingId.set(agentMsgId);
      this.streamingContent.set('');
      this.streamingSources.set(null);

      this.streamSub = this.agentSvc
        .streamChat(msg, this.sessionId(), !!this.uploadedFile())
        .subscribe({
          next: (token: StreamToken) => {
            // Only two small signals updated per token — no array map
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
              agent: 'RAG',
              content: `⚠️ Error: ${err.message || 'Could not reach P1 backend.'}`,
              streaming: false,
              timestamp: agentMsgTimestamp,
            };
            this.messages.update(msgs => [...msgs, errorMsg]);
            this.clearStreamingState();
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
      agent: 'RAG',
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
  }

  trackById(_: number, msg: ChatMessage): string {
    return msg.id;
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private newSessionId(): string {
    return crypto.randomUUID();
  }
}