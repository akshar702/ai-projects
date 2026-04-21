import { Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { map, catchError, finalize } from 'rxjs/operators'
import { PdfDocument } from '../models/pdf.model'
import { environment } from '../../../environments/environment.development'

@Injectable({ providedIn: 'root' })
export class PdfService {
  private apiUrl = environment.apiUrl

  // State
  documents = signal<PdfDocument[]>([])
  activeDocument = signal<PdfDocument | null>(null)
  isUploading = signal<boolean>(false)
  uploadError = signal<string | null>(null)

  constructor(private http: HttpClient) {}

  uploadPdf(file: File): Observable<PdfDocument> {
    // Check if already uploaded
    const exists = this.documents().find(d => d.filename === file.name)
    if (exists) {
      this.setActiveDocument(exists)
      // Return existing doc as observable
      return new Observable(observer => {
        observer.next(exists)
        observer.complete()
      })
    }
  
    this.isUploading.set(true)
    this.uploadError.set(null)
  
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
      finalize(() => this.isUploading.set(false))
    )
  }
  setActiveDocument(doc: PdfDocument) {
    this.documents.update(docs =>
      docs.map(d => ({ ...d, isActive: d.id === doc.id }))
    )
    this.activeDocument.set({ ...doc, isActive: true })
  }

  removeDocument(id: string) {
    const remaining = this.documents().filter(d => d.id !== id)
    this.documents.set(remaining)
  
    // If removed doc was active — set first remaining as active or null
    if (this.activeDocument()?.id === id) {
      this.activeDocument.set(remaining[0] ?? null)
    }
  }
}