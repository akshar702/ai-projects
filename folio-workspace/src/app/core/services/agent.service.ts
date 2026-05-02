import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectP1Url, selectP2Url } from '../store/app.selectors';
import { environment } from '../../../environments/environment';

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
  private p1Url = environment.p1BackendUrl;
  private p2Url = environment.p2BackendUrl;

  constructor() {
    // FIX 4: environment URL is fallback; NgRx store (user settings) takes priority
    this.store.select(selectP1Url).subscribe((url) => {
      this.p1Url = url || environment.p1BackendUrl;
    });
    this.store.select(selectP2Url).subscribe((url) => {
      this.p2Url = url || environment.p2BackendUrl;
    });
  }

  /**
   * FIX 2 — P1 RAG backend streaming
   * - hasFile=true  → POST /ask/stream  (PDF/doc session)
   * - hasFile=false → POST /chat/stream (general chat)
   *
   * P1 SSE format (plain text, NOT JSON):
   *   data: token_text\n\n
   *   data: [SOURCES]["url1","url2"]\n\n
   *   data: [DONE]\n\n
   */
  streamChat(
    message: string,
    sessionId: string,
    hasFile = false
  ): Observable<StreamToken> {
    return new Observable((observer) => {
      const controller = new AbortController();

      (async () => {
        try {
          const endpoint = hasFile ? '/ask/stream' : '/chat/stream';
          const body = hasFile
            ? JSON.stringify({ question: message, session_id: sessionId, history: [] })
            : JSON.stringify({ messages: [{ role: 'user', content: message }], temperature: 0.7 });

          const res = await fetch(`${this.p1Url}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
            body,
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            observer.error(new Error(`P1 error: ${res.status} ${res.statusText}`));
            return;
          }

          const reader  = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer    = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();

              if (raw === '[DONE]') {
                observer.next({ token: '', done: true });
                observer.complete();
                return;
              }

              if (raw.startsWith('[SOURCES]')) {
                try {
                  const sources: string[] = JSON.parse(raw.slice(9));
                  observer.next({ token: '', done: false, sources });
                } catch {
                  // ignore malformed sources
                }
                continue;
              }

              // Plain text token
              observer.next({ token: raw, done: false });
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

  /**
   * FIX 3 — P2 agentic research backend
   * SSE format: data: {"token":"...","done":false,"agent":"codebase_agent"}\n\n
   * Strip "_agent" suffix from agent field before emitting.
   */
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
            observer.error(new Error(`P2 error: ${res.status} ${res.statusText}`));
            return;
          }

          const reader  = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer    = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();

              if (raw === '[DONE]') {
                observer.next({ token: '', done: true });
                observer.complete();
                return;
              }

              try {
                const parsed = JSON.parse(raw);
                // FIX 3: strip "_agent" suffix (backend sends "codebase_agent" / "search_agent")
                const agent = parsed.agent
                  ? (parsed.agent.replace('_agent', '') as 'codebase' | 'search')
                  : undefined;

                observer.next({
                  token:   parsed.token  ?? '',
                  agent,
                  done:    parsed.done   ?? false,
                  sources: parsed.sources,
                });

                if (parsed.done) { observer.complete(); return; }
              } catch {
                observer.next({ token: raw, done: false });
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

          if (!res.ok) { observer.error(new Error(`Search failed: ${res.status}`)); return; }

          const reader  = res.body!.getReader();
          const decoder = new TextDecoder();
          let fullText  = '';
          let buffer    = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                try   { const p = JSON.parse(raw); if (p.token) fullText += p.token; }
                catch { fullText += raw; }
              }
            }
          }

          const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
          const results: MusicResult[] = [];
          let match: RegExpExecArray | null;
          let i = 0;

          while ((match = ytRegex.exec(fullText)) !== null) {
            const vid = match[1];
            results.push({
              title:    `Search Result ${++i}`,
              url:      `https://www.youtube.com/watch?v=${vid}`,
              embedUrl: `https://www.youtube.com/embed/${vid}`,
              mood:     'Custom',
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
