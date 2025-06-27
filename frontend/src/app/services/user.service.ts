// src/app/services/user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface Profile {
  firstName:   string;
  lastName:    string;
  profilePic?: string;
  phoneNumber?: string;
  address?:     string;
}

export interface Enrollment {
  courseId:   string;
  enrolledAt: string; // ISO string
}

export interface Access {
  courseId:   string;
  accessedAt: string; // ISO string
}

export interface User {
  id:          string;
  email:       string;
  username:    string;
  profile:     Profile;
  roles:       string[];
  enrollments: Enrollment[];
  accesses:    Access[];
  createdAt:   string;
  updatedAt:   string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /** GET /users/me */
  getMe(): Observable<User> {
    return this.http.get<any>(`${this.base}/me`).pipe(
      map(u => ({
        id:          u._id,
        email:       u.email,
        username:    u.username,
        profile:     u.profile,
        roles:       u.roles,
        enrollments: u.enrollments,
        accesses:    u.accesses,
        createdAt:   u.createdAt,
        updatedAt:   u.updatedAt
      }))
    );
  }

  /** GET /users/{id} */
  getById(userId: string): Observable<User> {
    return this.http.get<any>(`${this.base}/${userId}`).pipe(
      map(u => ({
        id:          u._id,
        email:       u.email,
        username:    u.username,
        profile:     u.profile,
        roles:       u.roles,
        enrollments: u.enrollments,
        accesses:    u.accesses,
        createdAt:   u.createdAt,
        updatedAt:   u.updatedAt
      }))
    );
  }

  /** GET /users */
  getUsers(): Observable<User[]> {
    return this.http.get<any[]>(`${this.base}`).pipe(
      map(list =>
        list.map(u => ({
          id:          u._id,
          email:       u.email,
          username:    u.username,
          profile:     u.profile,
          roles:       u.roles,
          enrollments: u.enrollments,
          accesses:    u.accesses,
          createdAt:   u.createdAt,
          updatedAt:   u.updatedAt
        }))
      )
    );
  }

  /** GET /users/{userId}/enrollments */
  listEnrollments(userId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.base}/${userId}/enrollments`);
  }

  /** POST /users/{userId}/enrollments */
  enroll(userId: string, courseId: string): Observable<Enrollment> {
    return this.http.post<Enrollment>(
      `${this.base}/${userId}/enrollments`,
      { courseId }
    );
  }

  /** DELETE /users/{userId}/enrollments/{courseId} */
  unenroll(userId: string, courseId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${userId}/enrollments/${courseId}`
    );
  }

  /** PUT /users/{id} */
  updateProfile(id: string, profile: Profile): Observable<User> {
    return this.http.put<any>(`${this.base}/${id}`, profile).pipe(
      map(u => ({
        id:          u._id,
        email:       u.email,
        username:    u.username,
        profile:     u.profile,
        roles:       u.roles,
        enrollments: u.enrollments,
        accesses:    u.accesses,
        createdAt:   u.createdAt,
        updatedAt:   u.updatedAt
      }))
    );
  }

  /** DELETE /users/{userId} */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}`);
  }

  /** POST /users/{userId}/password */
  changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Observable<void> {
    return this.http.post<void>(
      `${this.base}/${userId}/password`,
      { oldPassword, newPassword }
    );
  }

  /**
   * GET /users/me/accesses?limit={limit}
   * Returns the most recently accessed courses for the current user.
   */
  getRecentAccesses(limit: number = 10): Observable<Access[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Access[]>(`${this.base}/me/accesses`, { params });
  }
}
