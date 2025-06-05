// src/app/services/forum.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
    return this.http
      .post<ForumTopic>(`${this.base}/${courseId}/forums/`, payload)
      .pipe(
        map(topic => ({
          _id:        topic._id,
          course_id:  topic.course_id,
          author_id:  topic.author_id,
          title:      topic.title,
          created_at: topic.created_at,
          updated_at: topic.updated_at,
          // Assure that messages is always an array (even if backend omits it)
          messages:   Array.isArray(topic.messages) ? topic.messages : []
        }))
      );
  }

  /** List all topics in a course */
  listTopics(courseId: string): Observable<ForumTopic[]> {
    return this.http
      .get<ForumTopic[]>(`${this.base}/${courseId}/forums/`)
      .pipe(
        map(topicsArray =>
          topicsArray.map(topic => ({
            _id:        topic._id,
            course_id:  topic.course_id,
            author_id:  topic.author_id,
            title:      topic.title,
            created_at: topic.created_at,
            updated_at: topic.updated_at,
            messages:   Array.isArray(topic.messages) ? topic.messages : []
          }))
        )
      );
  }

  /** Get a single topic (with its messages) */
  getTopic(courseId: string, topicId: string): Observable<ForumTopic> {
    return this.http
      .get<ForumTopic>(`${this.base}/${courseId}/forums/${topicId}`)
      .pipe(
        map(topic => ({
          _id:        topic._id,
          course_id:  topic.course_id,
          author_id:  topic.author_id,
          title:      topic.title,
          created_at: topic.created_at,
          updated_at: topic.updated_at,
          messages:   Array.isArray(topic.messages) ? topic.messages : []
        }))
      );
  }

  /** Update the title of a topic */
  updateTopic(
    courseId: string,
    topicId: string,
    payload: UpdateTopic
  ): Observable<ForumTopic> {
    return this.http
      .put<ForumTopic>(`${this.base}/${courseId}/forums/${topicId}`, payload)
      .pipe(
        map(topic => ({
          _id:        topic._id,
          course_id:  topic.course_id,
          author_id:  topic.author_id,
          title:      topic.title,
          created_at: topic.created_at,
          updated_at: topic.updated_at,
          messages:   Array.isArray(topic.messages) ? topic.messages : []
        }))
      );
  }

  /** Delete a topic */
  deleteTopic(courseId: string, topicId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${courseId}/forums/${topicId}`);
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
    return this.http
      .post<ForumMessage>(
        `${this.base}/${courseId}/forums/${topicId}/messages`,
        payload
      )
      .pipe(
        map(msg => ({
          _id:        msg._id,
          thread_id:  msg.thread_id,
          author_id:  msg.author_id,
          content:    msg.content,
          image_data: msg.image_data,
          created_at: msg.created_at
        }))
      );
  }
}
