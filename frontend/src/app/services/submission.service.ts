// src/app/services/submission.service.ts

import { Injectable } from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable }  from 'rxjs';
import { environment } from '../environments/environment';

export interface Submission {
  _id:        string;
  course_id:  string;
  post_id:    string;
  student_id: string;
  file_id:    string;
  status:     string;    // e.g. "submitted" | "graded" | "late"
  grade?:     number;
  comment?:   string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionCreate {
  file_id: string;
}

export interface SubmissionGrade {
  grade:   number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  // Base path: /courses/:courseId/posts/:postId/submissions
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) { }

  /** List all submissions for a given course + post */
  list(courseId: string, postId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.base}/${courseId}/posts/${postId}/submissions`);
  }

  /** Create (student) submission: { file_id } */
  create(courseId: string, postId: string, payload: SubmissionCreate): Observable<Submission> {
    return this.http.post<Submission>(
      `${this.base}/${courseId}/posts/${postId}/submissions/`,
      payload
    );
  }

  /** Grade a submission (teacher): { grade, comment } */
  grade(
    courseId: string,
    postId:   string,
    submissionId: string,
    payload:  SubmissionGrade
  ): Observable<Submission> {
    return this.http.patch<Submission>(
      `${this.base}/${courseId}/posts/${postId}/submissions/${submissionId}`,
      payload
    );
  }

  /** (Optional) Delete a submission */
  delete(courseId: string, postId: string, submissionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${courseId}/posts/${postId}/submissions/${submissionId}`
    );
  }
}
