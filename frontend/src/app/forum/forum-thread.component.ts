// src/app/forum/forum-thread.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute }    from '@angular/router';

import { ForumService, ForumTopic, ForumMessage } from '../services/forum.service';

@Component({
  selector: 'app-forum-thread',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="forum-thread">
      <h3 *ngIf="!loadingTopic">{{ topic?.title }}</h3>
      <div *ngIf="loadingTopic">Chargement du sujet…</div>
      <div *ngIf="errorTopic" class="error">{{ errorTopic }}</div>

      <div *ngIf="topic && !loadingTopic">
        <p>
          Créé par {{ topic.author_id }} 
          le {{ topic.created_at | date:'short' }}
        </p>

        <hr />

        <!-- Zone d’affichage des messages -->
        <div *ngIf="topic.messages.length > 0; else noMessages">
          <div *ngFor="let msg of topic.messages" class="forum-message">
            <strong>{{ msg.author_id }}</strong> 
            <em>le {{ msg.created_at | date:'short' }}</em>
            <p>{{ msg.content }}</p>
            <hr />
          </div>
        </div>
        <ng-template #noMessages>
          <p>Aucun message dans ce sujet.</p>
        </ng-template>

        <!-- Formulaire pour poster un nouveau message -->
        <div class="reply-form">
          <h4>Ajouter une réponse</h4>
          <form [formGroup]="messageForm" (ngSubmit)="postMessage()">
            <textarea formControlName="content" rows="3" placeholder="Votre message…"></textarea>
            <br />
            <button type="submit" [disabled]="messageForm.invalid || posting">
              {{ posting ? 'Envoi…' : 'Envoyer' }}
            </button>
          </form>
          <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forum-thread { padding: 1rem; }
    .forum-message { margin-bottom: 1rem; }
    .reply-form { margin-top: 1.5rem; }
    textarea { width: 100%; }
    .error { color: red; }
  `]
})
export class ForumThreadComponent implements OnInit {
  @Input() courseId!: string;

  topicId!: string;
  topic?: ForumTopic;
  loadingTopic = false;
  errorTopic: string | null = null;

  messageForm: FormGroup;
  posting = false;
  errorMessage: string | null = null;

  constructor(
    private forumSvc: ForumService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.messageForm = this.fb.group({
      content: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.topicId = this.route.snapshot.paramMap.get('threadId')!;
    this.loadTopic();
  }

  loadTopic() {
    this.loadingTopic = true;
    this.errorTopic = null;
    this.forumSvc.getTopic(this.courseId, this.topicId).subscribe({
      next: (t) => {
        this.topic = t;
        this.loadingTopic = false;
      },
      error: (err) => {
        this.errorTopic = err.error?.detail || 'Échec du chargement du sujet';
        this.loadingTopic = false;
      }
    });
  }

  postMessage() {
    if (this.messageForm.invalid) return;
    this.posting = true;
    this.errorMessage = null;
    const content = this.messageForm.value.content;
    this.forumSvc.addMessage(this.courseId, this.topicId, content).subscribe({
      next: () => {
        this.messageForm.reset();
        this.loadingTopic = true;
        // Re-reload the topic (including the new message)
        this.forumSvc.getTopic(this.courseId, this.topicId).subscribe({
          next: (t) => {
            this.topic = t;
            this.loadingTopic = false;
            this.posting = false;
          },
          error: (err) => {
            this.errorTopic = err.error?.detail || 'Impossible de rafraîchir le sujet';
            this.loadingTopic = false;
            this.posting = false;
          }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Échec de l’envoi du message';
        this.posting = false;
      }
    });
  }
}
