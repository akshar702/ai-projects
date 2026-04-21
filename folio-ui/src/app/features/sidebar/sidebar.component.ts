import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { PdfService } from '../../core/services/pdf.service'
import { PdfDocument } from '../../core/models/pdf.model'
import { ToastService } from '../../core/services/toast.service'

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {

  constructor(
    public pdfService: PdfService,
    private toastService: ToastService
  ) {}

  selectDoc(doc: PdfDocument) {
    this.pdfService.setActiveDocument(doc)
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files?.length) {
      Array.from(input.files).forEach(file => this.uploadFile(file))
    }
    input.value = ''
  }

  uploadFile(file: File) {
    this.pdfService.uploadError.set(null)
  
    const exists = this.pdfService.documents().find(d => d.filename === file.name)
    if (exists) {
      this.toastService.show(`${file.name} is already in your documents`, 'info')
      this.pdfService.setActiveDocument(exists)
      return
    }
  
    this.pdfService.uploadPdf(file).subscribe({
      next: (doc) => {
        this.toastService.show(`${doc.filename} uploaded successfully`)
      },
      error: () => {
        this.toastService.show('Failed to upload PDF. Please try again.', 'error')
      }
    })
  }

  removeDoc(event: Event, doc: PdfDocument) {
    event.stopPropagation() // ← prevent selectDoc from firing
    this.pdfService.removeDocument(doc.id)
  }
}

