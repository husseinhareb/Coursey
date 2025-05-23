// src/app/login/login.component.ts
import { Component }               from '@angular/core';
import { CommonModule }            from '@angular/common';
import { FormsModule }             from '@angular/forms';
import { Router }                  from '@angular/router';

import { AuthService }             from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,               // <-- standalone
  imports: [
    CommonModule,                 // for *ngIf
    FormsModule                   // for [(ngModel)]
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => this.error = err.error?.detail || 'Login failed'
    });
  }
}
