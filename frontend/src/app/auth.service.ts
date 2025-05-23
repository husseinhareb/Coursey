// src/app/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginResponse {
  token: string;
  // …any other fields your API returns
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = '/api'; // adjust to your backend base URL

  constructor(private http: HttpClient) {}

  /**
   * Send credentials as separate params so you can call:
   *   this.auth.login(email, password)
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { email, password }
    );
  }

  /**
   * Persist the JWT (or whatever token your API returns)
   */
  saveToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }
}
