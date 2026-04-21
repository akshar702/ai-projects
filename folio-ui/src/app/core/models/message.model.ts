export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  sources?: string[]
  isStreaming?: boolean
  timestamp: Date
}