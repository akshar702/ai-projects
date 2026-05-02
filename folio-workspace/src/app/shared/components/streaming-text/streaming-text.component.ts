import {
  Component, Input, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, signal, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-streaming-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <span class="streaming-text">{{ displayed() }}<span *ngIf="isStreaming()" class="cursor-blink"></span></span>
  `,
})
export class StreamingTextComponent implements OnChanges {
  @Input() fullText = '';
  @Input() streaming = false;

  displayed = signal('');
  isStreaming = signal(false);

  private cdr = inject(ChangeDetectorRef);
  private animFrame: number | null = null;
  private words: string[] = [];
  private wordIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['streaming']) {
      this.isStreaming.set(this.streaming);
    }
    if (changes['fullText'] && this.fullText) {
      // Append only the new part word by word
      const newText = this.fullText;
      this.displayed.set(newText);
      this.cdr.markForCheck();
    }
    if (changes['streaming'] && !this.streaming) {
      this.isStreaming.set(false);
    }
  }
}
