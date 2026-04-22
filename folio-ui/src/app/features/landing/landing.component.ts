import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ThemeService, AccentTheme } from '../../core/services/theme.service'
import { PdfService } from '../../core/services/pdf.service'
import { CommonModule } from '@angular/common'
import { ToastService } from '../../core/services/toast.service'
import { HeaderComponent } from '../../shared/components/header/header.component'

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  isDragging = false

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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files?.length) {
      Array.from(input.files).forEach(file => this.uploadFile(file))
    }
    input.value = ''
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault()
    this.isDragging = false
    const files = event.dataTransfer?.files
    if (files?.length) {
      Array.from(files)
        .filter(f => f.type === 'application/pdf')
        .forEach(file => this.uploadFile(file))
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
    this.pdfService.uploadError.set(null)
  
    const exists = this.pdfService.documents().find(d => d.filename === file.name)
    if (exists) {
      this.toastService.show(`${file.name} is already in your documents`, 'info')
      this.router.navigate(['/chat'])
      return
    }
  
    this.pdfService.uploadPdf(file).subscribe({
      next: (doc) => {
        this.toastService.show(`${doc.filename} uploaded successfully`)
        this.router.navigate(['/chat'])
      },
      error: (err) => {
        this.toastService.show('Failed to upload PDF. Please try again.', 'error')
        console.error(err)
      }
    })
  }

  skipUpload() {
    this.router.navigate(['/chat'])
  }
}