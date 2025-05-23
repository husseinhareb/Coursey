import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({providedIn: 'root'})
export class AuthService {
  private apiUrl = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<{ access_token: string }>(
      `${this.apiUrl}/login`,
      { email, password }
    ).pipe(
      tap(res => localStorage.setItem('token', res.access_token))
    );
  }

  signup(email: string, password: string) {
    return this.http.post<{ access_token: string }>(
      `${this.apiUrl}/signup`,
      { email, password }
    ).pipe(
      tap(res => localStorage.setItem('token', res.access_token))
    );
  }

  logout() {
    localStorage.removeItem('token');
  }

  get token() {
    return localStorage.getItem('token');
  }

  get isLoggedIn() {
    return !!this.token;
  }
}
