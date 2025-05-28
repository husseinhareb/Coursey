// src/app/services/course.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface Course {
  id:        string;
  title:     string;
  description:string;
  code:      string;
  background?:string;
}

export interface CourseCreate {
  title:      string;
  description:string;
  code:       string;
  background?:string;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  private normalize(course: any): Course {
    return {
      id: course._id,
      title: course.title,
      description: course.description,
      code: course.code,
      background: course.background
    };
  }

  list(): Observable<Course[]> {
    return this.http.get<any[]>(`${this.base}/`).pipe(
      map(courses => courses.map(c => this.normalize(c)))
    );
  }

  get(id: string): Observable<Course> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(
      map(c => this.normalize(c))
    );
  }

  create(payload: CourseCreate): Observable<Course> {
    return this.http.post<any>(`${this.base}/`, payload).pipe(
      map(c => this.normalize(c))
    );
  }

  update(id: string, payload: CourseCreate): Observable<Course> {
    return this.http.put<any>(`${this.base}/${id}`, payload).pipe(
      map(c => this.normalize(c))
    );
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }
}
