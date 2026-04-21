import { Injectable, signal } from '@angular/core'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([])

  show(message: string, type: Toast['type'] = 'success') {
    const toast: Toast = {
      id: crypto.randomUUID(),
      message,
      type
    }
    this.toasts.update(t => [...t, toast])

    // Auto remove after 3 seconds
    setTimeout(() => {
      this.remove(toast.id)
    }, 3000)
  }

  remove(id: string) {
    this.toasts.update(t => t.filter(toast => toast.id !== id))
  }
}