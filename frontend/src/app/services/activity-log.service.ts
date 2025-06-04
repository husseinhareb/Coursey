// src/app/services/activity-log.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ActivityLogCreate {
  user_id: string;
  action:  string;
  timestamp: string;             // ISO string
  metadata?: { [key: string]: any };
}

export interface ActivityLogDB {
  _id:      string;
  user_id:  string;
  action:   string;
  timestamp: string;
  metadata?: { [key: string]: any };
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private baseUrl = `${environment.apiUrl}/activity-logs`;

  constructor(private http: HttpClient) {}

  /** GET /activity-logs/ */
  getAll(): Observable<ActivityLogDB[]> {
    return this.http.get<ActivityLogDB[]>(`${this.baseUrl}/`);
  }

  /** (Optionnel) POST /activity-logs/ */
  create(log: ActivityLogCreate): Observable<ActivityLogDB> {
    return this.http.post<ActivityLogDB>(`${this.baseUrl}/`, log);
  }
}
