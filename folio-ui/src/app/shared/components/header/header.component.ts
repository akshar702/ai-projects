import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { ThemeService, AccentTheme } from '../../../core/services/theme.service'

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Input() showDocumentName = false
  @Input() documentName: string | null = null

  themes: AccentTheme[] = ['amber', 'teal', 'purple', 'rose']

  themeColors: Record<AccentTheme, string> = {
    amber: '#d97706',
    teal: '#0e7490',
    purple: '#7c3aed',
    rose: '#e11d48'
  }

  constructor(
    public themeService: ThemeService,
    public router: Router
  ) {}

  setAccent(theme: AccentTheme) {
    this.themeService.setAccent(theme)
  }

  toggleMode() {
    const current = this.themeService.mode()
    this.themeService.setMode(current === 'dark' ? 'light' : 'dark')
  }

  get headerBorderStyle() {
    return this.themeService.mode() === 'dark'
      ? 'border-bottom: 0.5px solid rgba(255,255,255,0.1);'
      : 'border-bottom: 0.5px solid rgba(0,0,0,0.1);'
  }
}