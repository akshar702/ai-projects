import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ThemeService, AccentTheme } from '../../core/services/theme.service'
import { PdfService } from '../../core/services/pdf.service'
import { CommonModule } from '@angular/common'
import { ToastService } from '../../core/services/toast.service'

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  isDragging = false

  themes: AccentTheme[] = ['amber', 'teal', 'purple', 'rose']

  themeColors: Record<AccentTheme, string> = {
    amber: '#d97706',
    teal: '#0e7490',
    purple: '#7c3aed',
    rose: '#e11d48'
  }

  constructor(
    public themeService: ThemeService,
    public pdfService: PdfService,
    public router: Router,
    private toastService: ToastService
  ) {}

  get cardStyle() {
    return this.themeService.mode() === 'dark'
      ? 'background: rgba(255,255,255,0.03); backdrop-filter: blur(10px); border: 0.5px solid rgba(255,255,255,0.08);'
      : 'background: #f5f5f5; border: 0.5px solid #e5e5e5;'
  }

  get headerBorderStyle() {
    return this.themeService.mode() === 'dark'
      ? 'border-bottom: 0.5px solid rgba(255,255,255,0.1);'
      : 'border-bottom: 0.5px solid rgba(0,0,0,0.1);'
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files?.[0]) {
      this.uploadFile(input.files[0])
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    this.isDragging = false
    const file = event.dataTransfer?.files[0]
    if (file && file.type === 'application/pdf') {
      this.uploadFile(file)
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
    this.isDragging = true
  }

  onDragLeave() {
    this.isDragging = false
  }

  uploadFile(file: File) {
    this.pdfService.uploadError.set(null)  // ← clear old error
    this.pdfService.uploadPdf(file).subscribe({
      next: () => {
        console.log('sdfasd');
        this.toastService.show('Document uploaded successfully')
        this.router.navigate(['/chat'])},
      error: (err) => {
        this.toastService.show('Failed to upload PDF. Please try again.', 'error')
        console.error(err)
      }
    })
  }

  setAccent(theme: AccentTheme) {
    this.themeService.setAccent(theme)
  }

  toggleMode() {
    const current = this.themeService.mode()
    this.themeService.setMode(current === 'dark' ? 'light' : 'dark')
  }

  skipUpload() {
    this.router.navigate(['/chat'])
  }
}