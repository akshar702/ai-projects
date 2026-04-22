import { Injectable, signal } from '@angular/core'
import { Message } from '../models/message.model'
import { environment } from '../../../environments/environment'
@Injectable({ providedIn: 'root' })
export class ChatService {

  private apiUrl = environment.apiUrl
  // State
  messages = signal<Message[]>([])
  isStreaming = signal<boolean>(false)
  error = signal<string | null>(null)

  clearMessages() {
    this.messages.set([])
  }
  async ask(question: string, sessionId: string | null): Promise<void> {
    if (!question.trim()) return
  
    this.error.set(null)
  
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }
    this.messages.update(msgs => [...msgs, userMessage])
  
    // Add empty assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      sources: [],
      isStreaming: true,
      timestamp: new Date()
    }
    this.messages.update(msgs => [...msgs, assistantMessage])
    this.isStreaming.set(true)
  
    try {
      // If no sessionId — use general chat endpoint
      const url = sessionId
        ? `${this.apiUrl}/ask/stream`
        : `${this.apiUrl}/chat/stream`
  
        const body = sessionId
        ? { 
            question, 
            session_id: sessionId,
            history: this.messages()
              .slice(0, -2)  // exclude current user + empty assistant messages
              .map(m => ({ role: m.role, content: m.content }))
          }
        : { 
            messages: [
              ...this.messages()
                .slice(0, -2)
                .map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: question }
            ], 
            temperature: 0.7 
          }
  
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
  
      if (!response.ok) throw new Error('Request failed')
  
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
  
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
  
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
  
        for (const line of lines) {
            if (line.startsWith('data: ')) {
              const token = line.replace('data: ', '')
          
              if (token.startsWith('[SOURCES]')) {
                // Parse and save sources
                const sources = JSON.parse(token.replace('[SOURCES]', ''))
                this.messages.update(msgs => {
                  const updated = [...msgs]
                  const last = updated[updated.length - 1]
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, sources }
                  }
                  return updated
                })
              } else if (token === '[DONE]') {
                break
              } else {
                // Normal token — append to content
                this.messages.update(msgs => {
                  const updated = [...msgs]
                  const last = updated[updated.length - 1]
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + token
                    }
                  }
                  return updated
                })
              }
            }
          }
      }
  
    } catch (err) {
      this.error.set('Something went wrong. Please try again.')
      this.messages.update(msgs => msgs.slice(0, -1))
    } finally {
      this.messages.update(msgs => {
        const updated = [...msgs]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, isStreaming: false }
        }
        return updated
      })
      this.isStreaming.set(false)
    }
  }
}