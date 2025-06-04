// src/app/forum-thread/forum-thread.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute }    from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
            <p *ngIf="msg.content">{{ msg.content }}</p>
            <img
              *ngIf="msg.image_data"
              [src]="toSafeUrl(msg.image_data)"
              alt="Image jointe"
              class="message-image"
            />
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
            <textarea
              formControlName="content"
              rows="3"
              placeholder="Votre message…">
            </textarea>
            <div
              *ngIf="messageForm.get('content')?.touched && messageForm.get('content')?.invalid"
              class="error">
              Le contenu est requis si vous n’ajoutez pas d’image.
            </div>

            <br />

            <!-- File picker for image -->
            <label class="file-input-label">
              <input
                type="file"
                accept="image/*"
                (change)="onFileSelected($event)"
              />
              <span *ngIf="!selectedFile">Joindre une image…</span>
              <span *ngIf="selectedFile">{{ selectedFile.name }}</span>
            </label>
            <div *ngIf="fileError" class="error">{{ fileError }}</div>

            <br />

            <button
              type="submit"
              [disabled]="posting || (!messageForm.value.content && !selectedFile)">
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
    .message-image {
      display: block;
      max-width: 100%;
      margin-top: 0.5rem;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }
    .reply-form { margin-top: 1.5rem; }
    textarea { width: 100%; resize: vertical; }
    .file-input-label {
      display: inline-block;
      margin-top: 0.5rem;
      cursor: pointer;
      font-size: 0.9rem;
      color: #555;
    }
    .file-input-label input {
      display: none;
    }
    .error { color: red; margin-top: 0.25rem; }
    button[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class ForumThreadComponent implements OnInit {
  courseId!: string;
  topicId!: string;

  topic?: ForumTopic;
  loadingTopic = false;
  errorTopic: string | null = null;

  messageForm: FormGroup;
  posting = false;
  errorMessage: string | null = null;

  selectedFile: File | null = null;
  fileError: string | null = null;

  constructor(
    private forumSvc: ForumService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    this.messageForm = this.fb.group({
      content: ['']  // le champ texte reste optionnel si l’utilisateur fournit une image
    });
  }

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('id');
    const tId = this.route.snapshot.paramMap.get('threadId');
    if (!cId || !tId) {
      this.errorTopic = 'Identifiants manquants';
      return;
    }
    this.courseId = cId;
    this.topicId = tId;
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

  onFileSelected(event: Event) {
    this.fileError = null;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      return;
    }
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.fileError = 'Veuillez sélectionner un fichier image';
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
  }

  postMessage() {
    if (!this.messageForm.value.content && !this.selectedFile) {
      this.errorMessage = 'Vous devez entrer un message ou choisir une image.';
      return;
    }

    this.posting = true;
    this.errorMessage = null;

    const formData = new FormData();
    const contentValue = this.messageForm.value.content?.trim();
    if (contentValue) {
      formData.append('content', contentValue);
    }
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.forumSvc.addMessage(this.courseId, this.topicId, formData).subscribe({
      next: () => {
        this.messageForm.reset();
        this.selectedFile = null;
        this.loadTopic();
        this.posting = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Échec de l’envoi du message';
        this.posting = false;
      }
    });
  }

  /**
   * Convertit la chaîne Base64 reçue en SafeUrl pour qu’Angular puisse l’injecter dans <img [src]> sans blocage de sécurité.
   */
  toSafeUrl(base64: string): SafeUrl {
    // Si vous savez que c’est un JPEG, utilisez 'data:image/jpeg;base64,'. 
    // Sinon, si PNG, utilisez 'data:image/png;base64,'. 
    // Vous pouvez aussi ajuster dynamiquement selon vos besoins,
    // mais ici on part sur PNG par défaut :
    const dataUrl = `data:image/png;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  }
}
