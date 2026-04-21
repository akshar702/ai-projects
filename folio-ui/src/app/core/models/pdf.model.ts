export interface PdfDocument {
    id: string          // session_id from backend (hash)
    filename: string
    pageCount?: number
    uploadedAt: Date
    isActive: boolean
  }