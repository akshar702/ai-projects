import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Discriminated union of events the backend may emit on the SSE stream.
 *  - `token`  — a piece of assistant text to append to the current bubble
 *  - `agent`  — sentinel telling the UI which sub-agent answered (badge)
 *  - `done`   — final event; the stream is complete
 *  - `error`  — something blew up server-side
 */
export type StreamEvent =
  | { kind: 'token'; token: string }
  | { kind: 'agent'; agent: 'codebase_agent' | 'search_agent' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

const DEFAULT_BACKEND = 'http://localhost:8000';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly baseUrl = DEFAULT_BACKEND;

  /**
   * POST /research and turn the SSE response into an Observable<StreamEvent>.
   *
   * We use `fetch` + `ReadableStream` rather than `EventSource` because:
   *   - EventSource only supports GET (we need POST with a JSON body)
   *   - fetch streaming gives us native AbortController for cancellation
   */
  sendQuery(
    query: string,
    projectPath: string,
    threadId?: string,
  ): Observable<StreamEvent> {
    return new Observable<StreamEvent>((subscriber) => {
      const controller = new AbortController();

      const run = async () => {
        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              project_path: projectPath || undefined,
              thread_id: threadId,
            }),
            signal: controller.signal,
          });
        } catch (err: unknown) {
          subscriber.next({
            kind: 'error',
            message: this.errorMessage(err) ?? 'Network error',
          });
          subscriber.complete();
          return;
        }

        if (!response.ok || !response.body) {
          subscriber.next({
            kind: 'error',
            message: `Backend returned ${response.status}`,
          });
          subscriber.complete();
          return;
        }

        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();

        // SSE events are separated by a blank line. We buffer between reads
        // so we don't split a single event across two chunks.
        let buffer = '';
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;

            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
              const rawEvent = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);
              this.parseEvent(rawEvent).forEach((evt) => subscriber.next(evt));
            }
          }
          // Flush any trailing event without a closing blank line.
          if (buffer.trim().length > 0) {
            this.parseEvent(buffer).forEach((evt) => subscriber.next(evt));
          }
          subscriber.complete();
        } catch (err: unknown) {
          if (controller.signal.aborted) {
            subscriber.complete();
            return;
          }
          subscriber.next({
            kind: 'error',
            message: this.errorMessage(err) ?? 'Stream error',
          });
          subscriber.complete();
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // ignore
          }
        }
      };

      void run();

      return () => controller.abort();
    });
  }

  private parseEvent(rawEvent: string): StreamEvent[] {
    const out: StreamEvent[] = [];
    for (const line of rawEvent.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload) as {
          token?: string;
          done?: boolean;
          agent?: 'codebase_agent' | 'search_agent';
          error?: string;
        };
        if (parsed.error) {
          out.push({ kind: 'error', message: parsed.error });
          continue;
        }
        if (parsed.agent) {
          out.push({ kind: 'agent', agent: parsed.agent });
        }
        if (parsed.token) {
          out.push({ kind: 'token', token: parsed.token });
        }
        if (parsed.done) {
          out.push({ kind: 'done' });
        }
      } catch {
        // Ignore malformed payloads — the backend may send keep-alive
        // comments (lines starting with ":") that are not JSON.
      }
    }
    return out;
  }

  private errorMessage(err: unknown): string | undefined {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return undefined;
  }
}
