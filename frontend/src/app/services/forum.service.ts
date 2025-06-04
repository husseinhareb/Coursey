// src/app/services/forum.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';


export interface ForumMessage {
  _id:        string;
  thread_id:  string;
  author_id:  string;
  content?:   string;
  image_data?: string;   // Base64 string
  created_at: string;
}


export interface ForumTopic {
  _id:        string;
  course_id:  string;
  author_id:  string;
  title:      string;
  created_at: string;
  updated_at: string;
  messages:   ForumMessage[];
}

export interface NewTopic {
  title: string;
}

export interface UpdateTopic {
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class ForumService {
  private base = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  /** Create a new topic for a course */
  createTopic(courseId: string, payload: NewTopic): Observable<ForumTopic> {
    return this.http.post<ForumTopic>(
      `${this.base}/${courseId}/forums/`,
      payload
    );
  }

  /** List all topics in a course */
  listTopics(courseId: string): Observable<ForumTopic[]> {
    return this.http.get<ForumTopic[]>(
      `${this.base}/${courseId}/forums/`
    );
  }

  /** Get a single topic (with its messages) */
  getTopic(courseId: string, topicId: string): Observable<ForumTopic> {
    return this.http.get<ForumTopic>(
      `${this.base}/${courseId}/forums/${topicId}`
    );
  }

  /** Update the title of a topic */
  updateTopic(
    courseId: string,
    topicId: string,
    payload: UpdateTopic
  ): Observable<ForumTopic> {
    return this.http.put<ForumTopic>(
      `${this.base}/${courseId}/forums/${topicId}`,
      payload
    );
  }

  /** Delete a topic */
  deleteTopic(courseId: string, topicId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${courseId}/forums/${topicId}`
    );
  }

  /**
   * Add a message to the topic, possibly with an image.
   * We accept FormData so that the component can append both 'content' and 'image'.
   */
  addMessage(
    courseId: string,
    topicId: string,
    payload: FormData
  ): Observable<ForumMessage> {
    return this.http.post<ForumMessage>(
      `${this.base}/${courseId}/forums/${topicId}/messages`,
      payload
      // NOTE: Angular will automatically set Content-Type to multipart/form-data with the proper boundary.
    );
  }
}
