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
import { AuthService, SignupData } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
      email:     ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.signupForm.invalid) return;

    const { email, firstName, lastName } = this.signupForm.value;

    // auto‐generate a password
    const password = `${firstName}${lastName}${firstName.length}${lastName}`;

    const payload: SignupData = {
      email,
      password,
      profile: { firstName, lastName },
      roles: []
    };

    this.auth.signup(payload).subscribe({
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
