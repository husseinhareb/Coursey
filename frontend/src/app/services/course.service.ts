// src/app/services/course.service.ts

import { Injectable } from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface Course {
  id:          string;
  title:       string;
  description: string;
  code:        string;
  background?: string;
}

export interface CourseCreate {
  title:       string;
  description: string;
  code:        string;
  background?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  list(): Observable<Course[]> {
    return this.http.get<any[]>(`${this.base}/`).pipe(
      map(arr =>
        arr.map(c => ({
          id:          c._id,
          title:       c.title,
          description: c.description,
          code:        c.code,
          background:  c.background
        }))
      )
    );
  }

  get(id: string): Observable<Course> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(
      map(c => ({
        id:          c._id,
        title:       c.title,
        description: c.description,
        code:        c.code,
        background:  c.background
      }))
    );
  }

  create(payload: CourseCreate): Observable<Course> {
    return this.http.post<any>(`${this.base}/`, payload).pipe(
      map(c => ({
        id:          c._id,
        title:       c.title,
        description: c.description,
        code:        c.code,
        background:  c.background
      }))
    );
  }

  update(id: string, payload: CourseCreate): Observable<Course> {
    return this.http.put<any>(`${this.base}/${id}`, payload).pipe(
      map(c => ({
        id:          c._id,
        title:       c.title,
        description: c.description,
        code:        c.code,
        background:  c.background
      }))
    );
  }

  delete(id: string): Observable<{deleted: boolean}> {
    return this.http.delete<{deleted: boolean}>(`${this.base}/${id}`);
  }
}
