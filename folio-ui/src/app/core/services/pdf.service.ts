import { Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { map, catchError, finalize } from 'rxjs/operators'
import { PdfDocument } from '../models/pdf.model'

@Injectable({ providedIn: 'root' })
export class PdfService {
  private apiUrl = 'http://localhost:8000'

  // State
  documents = signal<PdfDocument[]>([])
  activeDocument = signal<PdfDocument | null>(null)
  isUploading = signal<boolean>(false)
  uploadError = signal<string | null>(null)

  constructor(private http: HttpClient) {}

  uploadPdf(file: File): Observable<PdfDocument> {
    this.isUploading.set(true)
    this.uploadError.set(null)  // ← clear previous error
  
    const formData = new FormData()
    formData.append('file', file)
  
    return this.http.post<{session_id: string, filename: string}>(
      `${this.apiUrl}/upload`,
      formData
    ).pipe(
      map(data => {
        const doc: PdfDocument = {
          id: data.session_id,
          filename: data.filename,
          uploadedAt: new Date(),
          isActive: true
        }
        this.documents.update(docs => [
          ...docs.map(d => ({ ...d, isActive: false })),
          doc
        ])
        this.activeDocument.set(doc)
        return doc
      }),
      catchError(err => {
        this.uploadError.set('Failed to upload PDF. Please try again.')
        return throwError(() => err)
      }),
      finalize(() => this.isUploading.set(false))  // ← always runs
    )
  }

  setActiveDocument(doc: PdfDocument) {
    this.documents.update(docs =>
      docs.map(d => ({ ...d, isActive: d.id === doc.id }))
    )
    this.activeDocument.set({ ...doc, isActive: true })
  }
}