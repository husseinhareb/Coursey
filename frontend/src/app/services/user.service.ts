// src/app/services/user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface User {
  id:           string;
  email:        string;
  username:     string;
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
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /** GET /users **/
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/`);
  }

  /** GET /users/me **/
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`);
  }
}
