import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectP1Url, selectP2Url } from '../store/app.selectors';

export interface StreamToken {
  token: string;
  agent?: 'codebase' | 'search';
  done: boolean;
  sources?: string[];
}

export interface MusicResult {
  title: string;
  url: string;
  embedUrl: string;
  mood?: string;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  private store = inject(Store);

  private p1Url = '';
  private p2Url = '';

  constructor() {
    this.store.select(selectP1Url).subscribe((url) => (this.p1Url = url));
    this.store.select(selectP2Url).subscribe((url) => (this.p2Url = url));
  }

  /** Stream chat response from P1 RAG backend (SSE via fetch + ReadableStream) */
  streamChat(message: string, sessionId: string): Observable<StreamToken> {
    return new Observable((observer) => {
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(`${this.p1Url}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
            body: JSON.stringify({ message, session_id: sessionId }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            observer.error(new Error(`P1 backend error: ${res.status}`));
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') {
                  observer.next({ token: '', done: true });
                  observer.complete();
                  return;
                }
                try {
                  const parsed = JSON.parse(raw);
                  observer.next({
                    token: parsed.token ?? parsed.text ?? raw,
                    done: parsed.done ?? false,
                    sources: parsed.sources,
                  });
                } catch {
                  // Plain text token
                  observer.next({ token: raw, done: false });
                }
              }
            }
          }
          observer.next({ token: '', done: true });
          observer.complete();
        } catch (err: any) {
          if (err?.name !== 'AbortError') observer.error(err);
        }
      })();

      return () => controller.abort();
    });
  }

  /** Stream research response from P2 agentic backend (SSE via fetch + ReadableStream) */
  streamResearch(query: string, projectPath: string): Observable<StreamToken> {
    return new Observable((observer) => {
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(`${this.p2Url}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
            body: JSON.stringify({ query, project_path: projectPath }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            observer.error(new Error(`P2 backend error: ${res.status}`));
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') {
                  observer.next({ token: '', done: true });
                  observer.complete();
                  return;
                }
                try {
                  const parsed = JSON.parse(raw);
                  observer.next({
                    token: parsed.token ?? '',
                    agent: parsed.agent,
                    done: parsed.done ?? false,
                    sources: parsed.sources,
                  });
                  if (parsed.done) {
                    observer.complete();
                    return;
                  }
                } catch {
                  observer.next({ token: raw, done: false });
                }
              }
            }
          }
          observer.next({ token: '', done: true });
          observer.complete();
        } catch (err: any) {
          if (err?.name !== 'AbortError') observer.error(err);
        }
      })();

      return () => controller.abort();
    });
  }

  /** Search for focus music via P2 agent */
  searchMusic(query: string): Observable<MusicResult[]> {
    return new Observable((observer) => {
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(`${this.p2Url}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `Find YouTube music for focus/coding: ${query}. Return YouTube links.`,
              project_path: '',
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            observer.error(new Error(`Search failed: ${res.status}`));
            return;
          }

          // Collect full streamed response
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                try {
                  const p = JSON.parse(raw);
                  if (p.token) fullText += p.token;
                } catch {
                  fullText += raw;
                }
              }
            }
          }

          // Extract YouTube URLs from response text
          const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
          const results: MusicResult[] = [];
          let match: RegExpExecArray | null;
          let i = 0;

          while ((match = ytRegex.exec(fullText)) !== null) {
            const videoId = match[1];
            results.push({
              title: `Search Result ${++i}`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              embedUrl: `https://www.youtube.com/embed/${videoId}`,
              mood: 'Custom',
            });
          }

          observer.next(results);
          observer.complete();
        } catch (err: any) {
          if (err?.name !== 'AbortError') observer.error(err);
        }
      })();

      return () => controller.abort();
    });
  }
}
