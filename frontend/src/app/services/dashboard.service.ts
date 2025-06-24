// src/app/dashboard/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';
import { environment } from '../environments/environment';

export interface DashboardOverview {
  totals: {
    users:   number;
    courses: number;
    posts:   number;
  };
  submissions: { [status: string]: number };
  activityLast7Days: { [action: string]: number };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // Build the full URL off your API base:
  private base = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /** GET http://<apiUrl>/dashboard/overview */
  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.base}/overview`);
  }
}
