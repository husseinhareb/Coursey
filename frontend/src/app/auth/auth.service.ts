// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router }     from '@angular/router';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { tap, switchMap, catchError, map } from 'rxjs/operators';
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

// shape of the “me” endpoint
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

  // holds the “me” object
  private userSubject = new BehaviorSubject<Me|null>(null);
  public  user$       = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // on startup, if token exists, load profile
    if (this.token) {
      this.loadProfile().subscribe();
    }
  }

  /** synchronous snapshot of the current user */
  get user(): Me|null {
    return this.userSubject.value;
  }

  /** whether a JWT token is stored */
  get isLoggedIn(): boolean {
    return !!this.token;
  }

  /** raw JWT from localStorage */
  get token(): string|null {
    return localStorage.getItem(this.tokenKey);
  }

  /** fetch `/users/me` and publish into userSubject */
  private loadProfile(): Observable<Me|null> {
    return this.http.get<Me>(`${this.apiBase}/users/me`).pipe(
      tap(me => this.userSubject.next(me)),
      catchError(() => {
        // if it fails (invalid token), log out
        this.logout();
        return of(null);
      })
    );
  }

  /** log in, store JWT, then load profile */
  login(email: string, password: string): Observable<boolean> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/login`, { email, password })
      .pipe(
        tap(res => localStorage.setItem(this.tokenKey, res.access_token)),
        switchMap(() => this.loadProfile()),
        map(me => !!me)
      );
  }

  /** sign up, store JWT, then load profile */
  signup(data: SignupData): Observable<boolean> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/signup`, data)
      .pipe(
        tap(res => localStorage.setItem(this.tokenKey, res.access_token)),
        switchMap(() => this.loadProfile()),
        map(me => !!me)
      );
  }

  /** clear JWT + user, navigate to login */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }
}
