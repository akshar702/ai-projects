import { Component, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { ChatService } from '../../core/services/chat.service'
import { PdfService } from '../../core/services/pdf.service'
import { ThemeService, AccentTheme } from '../../core/services/theme.service'
import { SidebarComponent } from '../sidebar/sidebar.component'
import { MessageComponent } from './components/message/message.component'
import { HeaderComponent } from '../../shared/components/header/header.component'

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MessageComponent, HeaderComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef
  @ViewChild('inputRef') inputRef!: ElementRef

  question = ''
  chatMode: 'document' | 'general' = 'document'

  constructor(
    public chatService: ChatService,
    public pdfService: PdfService,
    public themeService: ThemeService,
    public router: Router
  ) {
    // Auto scroll on new messages
    effect(() => {
      const msgs = this.chatService.messages()
      if (msgs.length) {
        setTimeout(() => this.scrollToBottom(), 100)
      }
    })
  
    // Refocus input when streaming stops
    effect(() => {
      const streaming = this.chatService.isStreaming()
      if (!streaming) {
        setTimeout(() => {
          this.inputRef?.nativeElement?.focus()
        }, 50)
      }
    })
    
  }

  ngOnInit() {
  }

  ngOnDestroy() {}

  toggleChatMode() {
    this.chatMode = this.chatMode === 'document' ? 'general' : 'document'
  }
  
  sendMessage() {
    if (!this.question.trim() || this.chatService.isStreaming()) return
  
    const sessionId = this.chatMode === 'document' && this.pdfService.activeDocument()
      ? this.pdfService.activeDocument()!.id
      : null
  
    const q = this.question
    this.question = ''
    this.chatService.ask(q, sessionId)
  
    // Refocus input after sending
    setTimeout(() => {
      this.inputRef?.nativeElement?.focus()
    }, 0)
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      this.sendMessage()
    }
  }

  scrollToBottom() {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' })
  }
  
}