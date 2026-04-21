import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Message } from '../../../../core/models/message.model'

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message.component.html',
})
export class MessageComponent {
  @Input() message!: Message
}