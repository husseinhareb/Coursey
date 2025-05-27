import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  signupForm: FormGroup;
  signupSuccess = false;
  signupError = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.signupForm.invalid) return;

    const formValue = this.signupForm.value;
    this.http.post<any>('http://localhost:8000/auth/signup', formValue).subscribe({
      next: (response) => {
        this.signupSuccess = true;
        this.signupError = '';
        localStorage.setItem('token', response.access_token);
      },
      error: (err) => {
        this.signupSuccess = false;
        this.signupError = err.error?.detail || 'Signup failed';
      }
    });
  }
}
