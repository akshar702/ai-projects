import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AgentService } from '../services/agent.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agent?: 'codebase_agent' | 'search_agent';
  pending?: boolean;
  error?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewInit {
  private readonly agent = inject(AgentService);

  @ViewChild('scrollEnd') private scrollEnd?: ElementRef<HTMLDivElement>;
  @ViewChild('input') private input?: ElementRef<HTMLTextAreaElement>;

  // ---- state -------------------------------------------------------------
  readonly messages = signal<ChatMessage[]>([]);
  readonly draft = signal<string>('');
  readonly projectPath = signal<string>('');
  readonly isStreaming = signal<boolean>(false);

  readonly canSend = computed(
    () => this.draft().trim().length > 0 && !this.isStreaming(),
  );

  // Stable thread id so the backend's MemorySaver keeps history per session.
  private readonly threadId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `t-${Date.now()}`;

  private streamSub?: Subscription;

  // SSE backpressure: buffer incoming tokens and flush via rAF so we don't
  // call `signal.update` 200 times per second.
  private tokenBuffer = '';
  private flushScheduled = false;
  private currentAssistantId: string | null = null;

  constructor() {
    // Auto-scroll to bottom whenever the message list changes.
    effect(() => {
      // Read so the effect re-runs on every messages() update.
      this.messages();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  ngAfterViewInit(): void {
    this.input?.nativeElement.focus();
  }

  // ---- send / stream ----------------------------------------------------

  send(): void {
    if (!this.canSend()) return;
    const text = this.draft().trim();
    this.draft.set('');

    const userMsg: ChatMessage = {
      id: this.id(),
      role: 'user',
      text,
    };
    const assistantMsg: ChatMessage = {
      id: this.id(),
      role: 'assistant',
      text: '',
      pending: true,
    };
    this.currentAssistantId = assistantMsg.id;
    this.messages.update((m) => [...m, userMsg, assistantMsg]);
    this.isStreaming.set(true);

    this.streamSub?.unsubscribe();
    this.streamSub = this.agent
      .sendQuery(text, this.projectPath().trim(), this.threadId)
      .subscribe({
        next: (evt) => {
          switch (evt.kind) {
            case 'token':
              this.bufferToken(evt.token);
              break;
            case 'agent':
              this.tagAgent(evt.agent);
              break;
            case 'error':
              this.markError(evt.message);
              break;
            case 'done':
              this.flushTokens();
              this.markDone();
              break;
          }
        },
        error: (err) => {
          this.markError(err?.message ?? 'Unknown error');
        },
        complete: () => {
          this.flushTokens();
          this.isStreaming.set(false);
        },
      });
  }

  cancel(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = undefined;
    this.isStreaming.set(false);
    this.markDone();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(e: KeyboardEvent): void {
    // Enter sends, Shift+Enter inserts newline. Cmd/Ctrl+K focuses input.
    const target = e.target as HTMLElement | null;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.input?.nativeElement.focus();
      return;
    }
    if (
      target?.tagName === 'TEXTAREA' &&
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.isComposing
    ) {
      e.preventDefault();
      this.send();
    }
  }

  agentLabel(a?: 'codebase_agent' | 'search_agent'): string {
    return a === 'codebase_agent' ? 'codebase' : a === 'search_agent' ? 'search' : '';
  }

  trackById(_i: number, m: ChatMessage): string {
    return m.id;
  }

  // ---- internals --------------------------------------------------------

  private bufferToken(token: string): void {
    this.tokenBuffer += token;
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    requestAnimationFrame(() => this.flushTokens());
  }

  private flushTokens(): void {
    this.flushScheduled = false;
    if (!this.tokenBuffer || !this.currentAssistantId) return;
    const chunk = this.tokenBuffer;
    this.tokenBuffer = '';
    const targetId = this.currentAssistantId;
    this.messages.update((list) =>
      list.map((m) =>
        m.id === targetId
          ? { ...m, text: m.text + chunk, pending: true }
          : m,
      ),
    );
  }

  private tagAgent(agent: 'codebase_agent' | 'search_agent'): void {
    const targetId = this.currentAssistantId;
    if (!targetId) return;
    this.messages.update((list) =>
      list.map((m) => (m.id === targetId ? { ...m, agent } : m)),
    );
  }

  private markError(message: string): void {
    const targetId = this.currentAssistantId;
    if (!targetId) return;
    this.messages.update((list) =>
      list.map((m) =>
        m.id === targetId
          ? { ...m, text: m.text || message, pending: false, error: true }
          : m,
      ),
    );
    this.isStreaming.set(false);
  }

  private markDone(): void {
    const targetId = this.currentAssistantId;
    if (!targetId) return;
    this.messages.update((list) =>
      list.map((m) => (m.id === targetId ? { ...m, pending: false } : m)),
    );
    this.currentAssistantId = null;
  }

  private scrollToBottom(): void {
    this.scrollEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  private id(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `m-${Math.random().toString(36).slice(2)}`;
  }
}
