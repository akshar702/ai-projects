import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { PdfService } from '../../core/services/pdf.service'
import { PdfDocument } from '../../core/models/pdf.model'

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  constructor(
    public pdfService: PdfService,
    private router: Router
  ) {}

  selectDoc(doc: PdfDocument) {
    this.pdfService.setActiveDocument(doc)
  }

  goToLanding() {
    this.router.navigate(['/'])
  }
}