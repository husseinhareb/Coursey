// src/app/register/register.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  signupForm: FormGroup;
  signupSuccess = false;
  signupError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private generateUsername(firstName: string, lastName: string): string {
    const initial = lastName.charAt(0).toLowerCase();
    const rand4 = Math.floor(1000 + Math.random() * 9000);
    return `${firstName.toLowerCase()}${initial}_${rand4}`;
  }

  private generatePassword(firstName: string, lastName: string): string {
    const len = firstName.length;
    return `${firstName}${lastName}${len}${lastName}`;
  }

  onSubmit() {
    if (this.signupForm.invalid) return;

    const { first_name, last_name, email } = this.signupForm.value;
    const username = this.generateUsername(first_name, last_name);
    const password = this.generatePassword(first_name, last_name);

    this.auth
      .signup(email, first_name, last_name, username, password, true)
      .subscribe({
        next: () => {
          this.signupSuccess = true;
          this.signupError = null;
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: err => {
          console.error(err);
          this.signupError = err.error?.detail || 'Signup failed.';
        }
      });
  }
}
