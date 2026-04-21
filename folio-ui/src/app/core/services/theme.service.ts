import { Injectable, signal } from '@angular/core'

export type AccentTheme = 'amber' | 'teal' | 'purple' | 'rose'
export type ColorMode = 'dark' | 'light'

@Injectable({ providedIn: 'root' })
export class ThemeService {
  accent = signal<AccentTheme>('amber')
  mode = signal<ColorMode>('dark')

  setAccent(theme: AccentTheme) {
    const root = document.documentElement
    // Remove old theme
    root.classList.remove('theme-amber', 'theme-teal', 'theme-purple', 'theme-rose')
    // Add new theme
    root.classList.add(`theme-${theme}`)
    this.accent.set(theme)
    localStorage.setItem('accent', theme)
  }

  setMode(mode: ColorMode) {
    const root = document.documentElement
    root.classList.toggle('light', mode === 'light')
    this.mode.set(mode)
    localStorage.setItem('mode', mode)
  }

  init() {
    const savedAccent = localStorage.getItem('accent') as AccentTheme || 'amber'
    const savedMode = localStorage.getItem('mode') as ColorMode || 'dark'
    this.setAccent(savedAccent)
    this.setMode(savedMode)
  }
}