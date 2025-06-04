// src/app/services/forum.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ForumMessage {
  _id:       string;
  author_id: string;
  content:   string;
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

  /** Créer un nouveau topic pour un cours */
  createTopic(courseId: string, payload: NewTopic): Observable<ForumTopic> {
    return this.http.post<ForumTopic>(
      `${this.base}/${courseId}/forums/`, 
      payload
    );
  }

  /** Lister tous les topics d’un cours */
  listTopics(courseId: string): Observable<ForumTopic[]> {
    return this.http.get<ForumTopic[]>(
      `${this.base}/${courseId}/forums/`
    );
  }

  /** Récupérer un seul topic (avec ses messages) */
  getTopic(courseId: string, topicId: string): Observable<ForumTopic> {
    return this.http.get<ForumTopic>(
      `${this.base}/${courseId}/forums/${topicId}`
    );
  }

  /** Mettre à jour le titre d’un topic */
  updateTopic(courseId: string, topicId: string, payload: UpdateTopic): Observable<ForumTopic> {
    return this.http.put<ForumTopic>(
      `${this.base}/${courseId}/forums/${topicId}`, 
      payload
    );
  }

  /** Supprimer un topic */
  deleteTopic(courseId: string, topicId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${courseId}/forums/${topicId}`
    );
  }

  /** Ajouter un message au topic */
  addMessage(courseId: string, topicId: string, content: string): Observable<ForumMessage> {
    return this.http.post<ForumMessage>(
      `${this.base}/${courseId}/forums/${topicId}/messages`, 
      { content }
    );
  }
}
