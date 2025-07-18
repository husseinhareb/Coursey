// src/app/services/post.service.ts

import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpRequest,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';


export interface Post {
  _id: string;
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  type: 'lecture' | 'reminder' | 'homework';
  file_id?: string;
  file_name?: string;
  due_date?: string;

  position: number;
  ispinned: boolean;
  pinnedAt?: string;

  created_at: string;
  updated_at: string;
}


export interface PostCreate {
  title: string;
  content: string;
  type: 'lecture' | 'reminder' | 'homework';
  file_id?: string;
  due_date?: string;
}

export interface PostUpdate {
  title: string;
  content: string;
  type: 'lecture' | 'reminder' | 'homework';
  file_id?: string;
  due_date?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) { }

  /** List all posts in a course */
  list(courseId: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.base}/${courseId}/posts`);
  }

  /** Get a single post */
  get(courseId: string, postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.base}/${courseId}/posts/${postId}`);
  }

  /** Create a new post (with optional file_id and due_date) */
  create(courseId: string, payload: PostCreate): Observable<Post> {
    return this.http.post<Post>(
      `${this.base}/${courseId}/posts`,
      payload
    );
  }

  /** Update an existing post */
  update(
    courseId: string,
    postId: string,
    payload: PostUpdate
  ): Observable<Post> {
    return this.http.put<Post>(
      `${this.base}/${courseId}/posts/${postId}`,
      payload
    );
  }

  /** Delete a post */
  delete(courseId: string, postId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${courseId}/posts/${postId}`
    );
  }

  /** Pin a post */
  pin(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/pin`,
      {}
    );
  }

  /** Unpin a post */
  unpin(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/unpin`,
      {}
    );
  }

  /** Move an unpinned post up */
  moveUp(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/moveUp`,
      {}
    );
  }

  /** Move an unpinned post down */
  moveDown(courseId: string, postId: string): Observable<Post> {
    return this.http.patch<Post>(
      `${this.base}/${courseId}/posts/${postId}/moveDown`,
      {}
    );
  }

  uploadFile(
    courseId: string,
    postId: string,
    file: File
  ): Observable<{ file_id: string; file_name: string }> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ file_id: string; file_name: string }>(
      `${this.base}/${courseId}/posts/${postId}/upload`,
      form
    );
  }

  uploadFileWithProgress(
    courseId: string,
    postId: string,
    file: File
  ): Observable<HttpEvent<any>> {
    const form = new FormData();
    form.append('file', file, file.name);
    // use `any` here so that FormData is acceptable
    const req = new HttpRequest<any>(
      'POST',
      `${this.base}/${courseId}/posts/${postId}/upload`,
      form,
      { reportProgress: true }
    );
    return this.http.request(req);
  }

  downloadFile(courseId: string, postId: string, fileId: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/${courseId}/posts/${postId}/files/${fileId}`,
      { responseType: 'blob' }
    );
  }

  getFileUrl(courseId: string, postId: string, fileId: string): string {
    return `${this.base}/${courseId}/posts/${postId}/files/${fileId}`;
  }
}
