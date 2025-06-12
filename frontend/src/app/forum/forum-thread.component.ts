// src/app/forum-thread/forum-thread.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { ActivatedRoute }    from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { ForumService, ForumTopic } from '../services/forum.service';
import { TranslateModule }       from '@ngx-translate/core';

@Component({
  selector: 'app-forum-thread',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,TranslateModule],
  templateUrl: './forum-thread.component.html',
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
