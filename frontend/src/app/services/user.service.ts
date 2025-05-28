// src/app/services/user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient }    from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment }   from '../environments/environment';

export interface Profile {
  firstName:   string;
  lastName:    string;
  profilePic?: string;
  phoneNumber?:string;
  address?:    string;
}

export interface User {
  id:           string;
  email:        string;
  username:     string;
  profile:      Profile;
  roles:        string[];
  enrollments:  any[];
  accesses:     any[];
  alerts:       any[];
  createdAt:    string;
  updatedAt:    string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /** fetch /users/me, normalize _id → id */
  getMe(): Observable<User> {
    return this.http.get<any>(`${this.base}/me`).pipe(
      map(u => ({ ...u, id: u._id }))
    );
  }

  /** update profile; returns the new user and normalizes _id → id */
  updateProfile(id: string, profile: Profile): Observable<User> {
    return this.http.put<any>(`${this.base}/${id}`, profile).pipe(
      map(u => ({ ...u, id: u._id }))
    );
  }

  /** list all users (unchanged) */
  getUsers(): Observable<User[]> {
    return this.http.get<any[]>(`${this.base}/`).pipe(
      map(list => list.map(u => ({ ...u, id: u._id })))
    );
  }
}
