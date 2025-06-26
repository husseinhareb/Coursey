// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router }     from '@angular/router';
import {
  BehaviorSubject,
  of,
  Observable
} from 'rxjs';
import {
  tap,
  switchMap,
  catchError,
  map
} from 'rxjs/operators';
import { environment } from '../environments/environment';

interface TokenResponse {
  access_token: string;
  token_type:   string;
}

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

export interface Me {
  id:          string;
  email:       string;
  username:    string;
  profile: {
    firstName:   string;
    lastName:    string;
    profilePic?: string;
    phoneNumber?:string;
    address?:    string;
  };
  roles:       string[];
  enrollments: any[];
  accesses:    any[];
  alerts:      any[];
  createdAt:   string;
  updatedAt:   string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey    = 'token';
  private apiBase     = environment.apiUrl;

  private userSubject = new BehaviorSubject<Me|null>(null);
  public  user$       = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // on startup, if token exists, load profile
    if (this.token) {
      this.loadProfile().subscribe();
    }
  }

  get user(): Me|null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get token(): string|null {
    return localStorage.getItem(this.tokenKey);
  }

  private loadProfile(): Observable<Me|null> {
    return this.http.get<Me>(`${this.apiBase}/users/me`).pipe(
      tap(me => this.userSubject.next(me)),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  login(email: string, password: string): Observable<boolean> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/login`, { email, password })
      .pipe(
        tap(res => localStorage.setItem(this.tokenKey, res.access_token)),
        switchMap(() => this.loadProfile()),
        map(me => !!me)
      );
  }

  /**
   * Sign up a new user.
   * This call only registers the account; it does NOT log the user in.
   */
  signup(data: SignupData): Observable<void> {
    return this.http.post<void>(`${this.apiBase}/auth/signup`, data);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }
}
