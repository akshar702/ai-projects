import { Component, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { ChatService } from '../../core/services/chat.service'
import { PdfService } from '../../core/services/pdf.service'
import { ThemeService, AccentTheme } from '../../core/services/theme.service'
import { SidebarComponent } from '../sidebar/sidebar.component'
import { MessageComponent } from './components/message/message.component'

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MessageComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef
  @ViewChild('inputRef') inputRef!: ElementRef

  question = ''

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
        setTimeout(() => this.scrollToBottom(), 50)
      }
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {}

  sendMessage() {
    if (!this.question.trim() || this.chatService.isStreaming()) return
  
    // sessionId can be null — general chat
    const sessionId = this.pdfService.activeDocument()?.id ?? null
  
    const q = this.question
    this.question = ''
    this.chatService.ask(q, sessionId)
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

  get headerBorderStyle() {
    return this.themeService.mode() === 'dark'
      ? 'border-bottom: 0.5px solid rgba(255,255,255,0.1);'
      : 'border-bottom: 0.5px solid rgba(0,0,0,0.1);'
  }

  setAccent(theme: AccentTheme) {
    this.themeService.setAccent(theme)
  }

  toggleMode() {
    const current = this.themeService.mode()
    this.themeService.setMode(current === 'dark' ? 'light' : 'dark')
  }

  themes: AccentTheme[] = ['amber', 'teal', 'purple', 'rose']

  themeColors: Record<AccentTheme, string> = {
    amber: '#d97706',
    teal: '#0e7490',
    purple: '#7c3aed',
    rose: '#e11d48'
  }
  
}