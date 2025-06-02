import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

/**
 * What the server returns for each submission.
 * Adjust fields if your backend sends back different property names.
 */
export interface Submission {
  _id:          string;
  student_id:   string;
  file_name:    string;
  status:       'submitted' | 'graded' | 'late';  // example statuses
  grade?:       number;
  comment?:     string;
  submittedAt:  string;   // ISO timestamp
  gradedAt?:    string;   // ISO timestamp
}

/**
 * When creating a new submission, we only need to send the File.
 */
export interface SubmissionCreate {
  file: File;
}

/**
 * When grading, we send a grade + comment.
 */
export interface SubmissionGrade {
  grade:   number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  /** Base URL: /courses/{courseId}/posts/{postId}/submissions */
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  /**
   * List all submissions for a given courseId & postId (homework).
   * GET  /courses/:courseId/posts/:postId/submissions
   */
  list(courseId: string, postId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(
      `${this.base}/${courseId}/posts/${postId}/submissions`
    );
  }

  /**
   * Create a new submission by uploading a file.
   * POST /courses/:courseId/posts/:postId/submissions
   * Must send multipart/form-data with the file under the field name “file”.
   */
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

  /**
   * Grade a submission: PATCH /courses/:courseId/posts/:postId/submissions/:submissionId/grade
   */
  grade(
    courseId: string,
    postId: string,
    submissionId: string,
    payload: SubmissionGrade
  ): Observable<Submission> {
    return this.http.patch<Submission>(
      `${this.base}/${courseId}/posts/${postId}/submissions/${submissionId}/grade`,
      payload
    );
  }
}
