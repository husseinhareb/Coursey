// src/app/register/register.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { AuthService, SignupData } from '../auth/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  signupForm: FormGroup;
  signupSuccess = false;
  signupError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService
  ) {
    this.signupForm = this.fb.group({
      email:     ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      role:      ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { email, firstName, lastName, role } = this.signupForm.value;
    const password = `${firstName}${lastName}${firstName.length}${lastName}`;

    const payload: SignupData = {
      email,
      password,
      profile: { firstName, lastName },
      roles: [role]
    };

    this.auth.signup(payload).subscribe({
      next: () => {
        this.signupSuccess = true;
        this.signupError = null;
      },
      error: err => {
        this.signupError = err.error?.detail || 'Signup failed.';
      }
    });
  }
}
