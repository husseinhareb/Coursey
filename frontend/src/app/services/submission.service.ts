// src/app/services/submission.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap, map } from 'rxjs';
import { environment } from '../environments/environment';
import { UserService } from './user.service';

/**
 * Note: we renamed first_name → firstName and last_name → lastName
 */
export interface Submission {
  _id:          string;
  course_id:    string;
  post_id:      string;
  student_id:   string;
  file_id:      string;
  file_name?:   string;
  status:       string;
  grade?:       number;
  comment?:     string;
  created_at:   string;
  updated_at:   string;
  firstName?:   string;  // ← camelCase
  lastName?:    string;  // ← camelCase
}

export interface SubmissionCreate {
  file: File;
}

export interface SubmissionGrade {
  grade:   number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  private base = `${environment.apiUrl}/courses`;

  constructor(
    private http: HttpClient,
    private userSvc: UserService
  ) {}

  /**
   * List all submissions for a given courseId & postId (homework),
   * then fetch each student’s name via UserService.
   */
  list(courseId: string, postId: string): Observable<Submission[]> {
    return this.http
      .get<Submission[]>(`${this.base}/${courseId}/posts/${postId}/submissions`)
      .pipe(
        switchMap((submissions) => {
          if (!submissions.length) {
            return of([] as Submission[]);
          }

          // For each submission, fetch the user and copy profile.firstName/lastName into the Submission
          const enriched$ = submissions.map(s =>
            this.userSvc.getById(s.student_id).pipe(
              map(user => ({
                ...s,
                firstName: user.profile.firstName,
                lastName:  user.profile.lastName,
              }))
            )
          );

          return forkJoin(enriched$);
        })
      );
  }

  create(
    courseId: string,
    postId: string,
    payload: SubmissionCreate
  ): Observable<Submission> {
    const formData = new FormData();
    formData.append('file', payload.file);
    return this.http.post<Submission>(
      `${this.base}/${courseId}/posts/${postId}/submissions`,
      formData
    );
  }

  grade(
    courseId: string,
    postId: string,
    submissionId: string,
    payload: SubmissionGrade
  ): Observable<Submission> {
    return this.http.patch<Submission>(
      `${this.base}/${courseId}/posts/${postId}/submissions/${submissionId}`,
      payload
    );
  }
}
