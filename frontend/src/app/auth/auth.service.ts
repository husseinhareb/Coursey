// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

interface TokenResponse {
  access_token: string;
  token_type:   string;
}

/**
 * Shape of the signup payload matching the backend SignupIn schema.
 */
export interface SignupData {
  email:     string;
  password:  string;
  profile: {
    firstName:   string;
    lastName:    string;
    profilePic?: string;
    phoneNumber?:string;
    address?:    string;
  };
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'token';
  private apiBase  = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Log in with email & password. Stores JWT on success.
   */
  login(email: string, password: string): Observable<boolean> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/login`, { email, password })
      .pipe(
        tap(res => localStorage.setItem(this.tokenKey, res.access_token)),
        map(() => true)
      );
  }

  /**
   * Sign up a new user. Expects a SignupData object that includes
   * email, password, nested profile, and optional roles.
   * Stores JWT on success.
   */
  signup(data: SignupData): Observable<boolean> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/signup`, data)
      .pipe(
        tap(res => localStorage.setItem(this.tokenKey, res.access_token)),
        map(() => true)
      );
  }

  /**
   * Remove JWT and navigate to login.
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }

  /**
   * Retrieve stored JWT, if any.
   */
  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Returns true if a JWT is present.
   */
  get isLoggedIn(): boolean {
    return !!this.token;
  }
}
