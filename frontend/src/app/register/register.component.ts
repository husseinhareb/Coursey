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
      lastName:  ['', Validators.required],
      // New control: role (must be one of the three)
      role:      ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.signupForm.invalid) {
      // Mark all controls as touched so errors appear
      this.signupForm.markAllAsTouched();
      return;
    }

    const { email, firstName, lastName, role } = this.signupForm.value;

    // auto‐generate a password (example logic)
    const password = `${firstName}${lastName}${firstName.length}${lastName}`;

    // We send roles as an array with exactly one role string
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
        // After 1.5s, redirect to login
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: err => {
        console.error(err);
        this.signupError = err.error?.detail || 'Signup failed.';
      }
    });
  }
}
