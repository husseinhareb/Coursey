// src/app/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AdminOverview {
  role: 'admin';
  totals: {
    users:   number;
    courses: number;
    posts:   number;
  };
  submissions:       { [status: string]: number };
  activityLast7Days: { [action: string]: number };
}

export interface TeacherCourse {
  id:           string;
  title:        string;
  code:         string;
  enrolledCount: number;
}
export interface TeacherOverview {
  role: 'teacher';
  coursesCreated: TeacherCourse[];
}

export interface StudentCourse {
  id:       string;
  title:    string;
  code:     string;
  progress: number;  // 0–100
}
export interface StudentOverview {
  role: 'student';
  enrolledCourses: StudentCourse[];
}

export type DashboardOverview =
  | AdminOverview
  | TeacherOverview
  | StudentOverview;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = `${environment.apiUrl}/dashboard`;
  constructor(private http: HttpClient) {}

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.base}/overview`);
  }
}
