import {
  Component, Input, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { userMessageAnim, agentMessageAnim } from '../../animations/route.animations';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  agent?: 'RAG' | 'codebase' | 'search';
  sources?: string[];
  streaming?: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  animations: [userMessageAnim, agentMessageAnim],
  template: `
    <!-- USER message -->
    @if (message.role === 'user') {
      <div class="flex mb-4 justify-end" @userMessage>
        <div class="msg-user">
          <div class="message-content text-sm leading-relaxed"
               style="color: var(--text-primary)"
               [innerHTML]="formattedContent">
          </div>
          <span *ngIf="message.streaming" class="cursor-blink"></span>
          <div class="mt-1 text-xs text-right" style="color: var(--text-dim)">
            {{ message.timestamp | date:'h:mm a' }}
          </div>
        </div>
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm
                    font-semibold ml-3 flex-shrink-0"
             style="background: var(--bg-card); border: 1px solid var(--border)">
          A
        </div>
      </div>
    }

    <!-- AGENT message -->
    @if (message.role === 'agent') {
      <div class="flex mb-4" @agentMessage>
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm
                    mr-3 flex-shrink-0"
             style="background: linear-gradient(135deg, var(--primary), var(--accent))">
          🤖
        </div>

        <div class="msg-agent" [class.streaming-active]="message.streaming">

          <!-- Agent badge -->
          <div *ngIf="message.agent" class="mb-2">
            <span class="badge"
                  [class.badge-rag]="message.agent === 'RAG'"
                  [class.badge-codebase]="message.agent === 'codebase'"
                  [class.badge-search]="message.agent === 'search'">
              {{ message.agent }}
            </span>
          </div>

          <div class="message-content text-sm leading-relaxed"
               style="color: var(--text-primary)"
               [innerHTML]="formattedContent">
          </div>

          <span *ngIf="message.streaming" class="cursor-blink"></span>

          <!-- Sources -->
          <div *ngIf="message.sources?.length" class="mt-3 flex flex-wrap gap-2">
            <a *ngFor="let src of message.sources"
               [href]="src" target="_blank" rel="noopener"
               class="source-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {{ truncateUrl(src) }}
            </a>
          </div>

          <div class="mt-1 text-xs" style="color: var(--text-dim)">
            {{ message.timestamp | date:'h:mm a' }}
          </div>
        </div>
      </div>
    }
  `,
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: ChatMessage;

  get formattedContent(): string {
    return this.message.content
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_: string, __: string, code: string) =>
        `<div class="code-block my-2"><pre><code>${escapeHtml(code.trim())}</code></pre></div>`
      )
      .replace(/`([^`]+)`/g, (_: string, code: string) =>
        `<code style="background:#0d0d14;padding:1px 5px;border-radius:4px;font-size:0.8em;color:var(--accent-light)">${escapeHtml(code)}</code>`
      )
      .replace(/\n/g, '<br>');
  }

  truncateUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + '…' : u.pathname);
    } catch {
      return url.slice(0, 40);
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
