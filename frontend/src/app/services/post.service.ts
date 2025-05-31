// src/app/services/post.service.ts

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
  type:      string;     // e.g. "lecture" | "reminder"
  file_id?:  string;     // optional

  position:  number;     // ordering index among unpinned or pinned groups
  ispinned:  boolean;    // true if it is pinned (floats to top)
  pinnedAt?: string;     // ISO-8601 date when pinned (or undefined/null if unpinned)

  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  title:   string;
  content: string;
  type:    string;
  file_id?: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  // Note: base URL = /courses/{courseId}/posts
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) { }

  /** GET  /courses/:courseId/posts/  → returns Post[] sorted (pinned first by pinnedAt DESC, then unpinned by position ASC) */
  list(courseId: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.base}/${courseId}/posts/`);
  }

  /** POST → create a new post. Backend should auto-assign `position` = (max unpinned position)+1, ispinned=false. */
  create(courseId: string, payload: PostCreate): Observable<Post> {
    return this.http.post<Post>(`${this.base}/${courseId}/posts/`, payload);
  }

  /** PUT → update title/content/type/file_id only. Does NOT touch ispinned or position. */
  update(courseId: string, postId: string, payload: PostCreate): Observable<Post> {
    return this.http.put<Post>(
      `${this.base}/${courseId}/posts/${postId}`, payload
    );
  }

  /** DELETE → remove post. Backend should fix the remaining posts’ positions. */
  delete(courseId: string, postId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${courseId}/posts/${postId}`
    );
  }

  /**
   * PATCH → pin this post. 
   * Expected backend route: /courses/:courseId/posts/:postId/pin 
   * (No request‐body; backend sets ispinned=true, pinnedAt=now, and reorders pinned positions.)
   */
  pin(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/pin`, {}
    );
  }

  /**
   * PATCH → unpin this post. 
   * Expected backend route: /courses/:courseId/posts/:postId/unpin 
   * (No request‐body; backend sets ispinned=false, pinnedAt=null, and assigns this post to the bottom of unpinned positions.)
   */
  unpin(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/unpin`, {}
    );
  }

  /**
   * PATCH → move a non-pinned post UP one slot among unpinned posts.
   * Expected backend route: /courses/:courseId/posts/:postId/moveUp
   * Backend should swap this post’s `position` with the post just above it.
   */
  moveUp(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/moveUp`, {}
    );
  }

  /**
   * PATCH → move a non-pinned post DOWN one slot among unpinned posts.
   * Expected backend route: /courses/:courseId/posts/:postId/moveDown
   * Backend swaps this post’s position with the one just below it.
   */
  moveDown(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/moveDown`, {}
    );
  }
}
