import { Injectable } from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';
import { environment }  from '../environments/environment';

export interface Post {
  _id:       string;
  course_id: string;
  author_id: string;
  title:     string;
  content:   string;
  type:      string;       // e.g. "lecture" | "reminder" | "homework"
  file_id?:  string;       // optional
  due_date?: string;       // ← ISO string (if homework)

  position:  number;
  ispinned:  boolean;
  pinnedAt?: string;

  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  title:     string;
  content:   string;
  type:      string;
  file_id?:  string;
  due_date?: string;       // ← ISO string (if homework)
}

export interface PostUpdate {
  title:     string;
  content:   string;
  type:      string;
  file_id?:  string;
  due_date?: string;       // ← ISO string (if homework)
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  list(courseId: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.base}/${courseId}/posts/`);
  }

  get(courseId: string, postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.base}/${courseId}/posts/${postId}`);
  }

  create(courseId: string, payload: PostCreate): Observable<Post> {
    return this.http.post<Post>(
      `${this.base}/${courseId}/posts/`,
      payload
    );
  }

  update(courseId: string, postId: string, payload: PostUpdate): Observable<Post> {
    return this.http.put<Post>(
      `${this.base}/${courseId}/posts/${postId}`,
      payload
    );
  }

  delete(courseId: string, postId: string): Observable<void> {
    return this.http.delete<void>(
    `${this.base}/${courseId}/posts/${postId}`
    );
  }

  pin(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/pin`, {}
    );
  }

  unpin(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/unpin`, {}
    );
  }

  moveUp(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/moveUp`, {}
    );
  }

  moveDown(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/moveDown`, {}
    );
  }
}
