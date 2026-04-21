import { Component, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ThemeService } from './core/services/theme.service'
import { ToastComponent } from './shared/components/toast/toast.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.init()
  }
}