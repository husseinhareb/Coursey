// src/app/services/user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface Profile {
  firstName: string;
  lastName: string;
  profilePic?: string;
  phoneNumber?: string;
  address?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  profile: Profile;
  roles: string[];
  enrollments: any[];
  accesses: any[];
  alerts: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  courseId: string;
  enrolledAt: string; // ISO
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

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

  listEnrollments(userId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.base}/${userId}/enrollments`).pipe(
      map(arr => arr.map(e => ({ ...e, enrolledAt: e.enrolledAt })))
    );
  }

  enroll(userId: string, courseId: string): Observable<Enrollment> {
    return this.http.post<Enrollment>(`${this.base}/${userId}/enrollments`, { courseId });
  }

  unenroll(userId: string, courseId: string): Observable<any> {
    return this.http.delete(`${this.base}/${userId}/enrollments/${courseId}`);
  }
    getById(userId: string): Observable<User> {
    return this.http
      .get<any>(`${this.base}/${userId}`)
      .pipe(
        map(u => {
          // Si le back-end renvoie “_id”, on le recopie dans le champ “id” attendu par Angular
          // (tout en conservant _id au besoin).
          return {
            ...u,
            id: u._id ?? u.id  // si le JSON n’a pas _id mais déjà “id”, on garde “id”
          } as User;
        })
      );
  }
}
