// src/app/services/completion.service.ts

import { Injectable } from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';
import { environment }  from '../environments/environment';

export interface Completion {
  id:         string;
  user_id:    string;
  course_id:  string;
  post_id:    string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CompletionService {
  private baseUrl = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  getCompletions(courseId: string): Observable<Completion[]> {
    return this.http.get<Completion[]>(`${this.baseUrl}/${courseId}/completions`);
  }

  markComplete(courseId: string, postId: string): Observable<Completion> {
    return this.http.post<Completion>(
      `${this.baseUrl}/${courseId}/posts/${postId}/complete`,
      {}
    );
  }

  unmarkComplete(courseId: string, postId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${courseId}/posts/${postId}/complete`
    );
  }
}
