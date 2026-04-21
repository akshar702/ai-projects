import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ToastService } from '../../../core/services/toast.service'

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-12 right-6 flex flex-col gap-2 z-50">
      <div
        *ngFor="let toast of toastService.toasts()"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all"
        [style.background]="toast.type === 'success' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.85)'"
        style="backdrop-filter: blur(10px); border: 0.5px solid rgba(255,255,255,0.1); color: #ededed; min-width: 240px;">

        <!-- Icon -->
        <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
  [style.background]="toast.type === 'success' ? 'var(--accent)' : toast.type === 'error' ? '#e11d48' : '#0e7490'">
  <svg *ngIf="toast.type === 'success'" width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <svg *ngIf="toast.type === 'error'" width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M3 3l4 4M7 3l-4 4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
  <svg *ngIf="toast.type === 'info'" width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M5 4v4M5 3v0.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
</div>

        <span>{{ toast.message }}</span>

        <!-- Close -->
        <button
          (click)="toastService.remove(toast.id)"
          class="ml-auto shrink-0"
          style="color: var(--text-muted);">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>

      </div>
    </div>
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}