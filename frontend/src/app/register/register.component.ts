// src/app/register/register.component.ts

import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  signupForm: FormGroup;
  signupSuccess = false;
  signupError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    // Only first_name, last_name, email
    this.signupForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private generateUsername(firstName: string, lastName: string): string {
    // rule: firstname + first letter of lastname + "_" + random 4 digits
    const initial = lastName.charAt(0).toLowerCase();
    const rand4 = Math.floor(1000 + Math.random() * 9000);
    return `${firstName.toLowerCase()}${initial}_${rand4}`;
  }

  private generatePassword(firstName: string, lastName: string): string {
    // rule: firstName + lastName + lengthOfFirstName + lastName
    const len = firstName.length;
    return `${firstName}${lastName}${len}${lastName}`;
  }

  onSubmit() {
    if (this.signupForm.invalid) return;

    const { first_name, last_name, email } = this.signupForm.value;

    const username = this.generateUsername(first_name, last_name);
    const password = this.generatePassword(first_name, last_name);

    const payload = {
      email,
      first_name,
      last_name,
      username,
      password,
      password_auto_generated: true
    };

    this.http.post('/api/users', payload).subscribe({
      next: () => {
        this.signupSuccess = true;
        this.signupError = null;
        // redirect after a short pause
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: err => {
        console.error(err);
        this.signupError = err.error?.message || 'Signup failed.';
      }
    });
  }
}
