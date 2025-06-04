import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

import { ForumService, ForumTopic, NewTopic } from '../services/forum.service';

@Component({
  selector: 'app-forum-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="forum-list">
      <h3>Forums / Sujets</h3>
      <button (click)="toggleNewTopicForm()">
        {{ showNewTopicForm ? 'Annuler' : '+ Nouveau sujet' }}
      </button>

      <!-- Formulaire pour créer un nouveau topic -->
      <div *ngIf="showNewTopicForm" class="new-topic-form">
        <form [formGroup]="newTopicForm" (ngSubmit)="createTopic()">
          <div>
            <label for="title">Titre du sujet :</label>
            <input id="title" formControlName="title" placeholder="Titre" />
            <div *ngIf="newTopicForm.get('title')?.touched && newTopicForm.get('title')?.invalid" class="error">
              Le titre est requis.
            </div>
          </div>
          <button type="submit" [disabled]="newTopicForm.invalid">
            Créer
          </button>
        </form>
      </div>

      <div *ngIf="loading">Chargement des sujets…</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <ul *ngIf="!loading && !error">
        <li *ngFor="let topic of topics" (click)="goToTopic(topic._id)">
          <strong>{{ topic.title }}</strong>
          <br />
          <small>
            Créé par {{ topic.author_id }} 
            le {{ topic.created_at | date:'short' }} 
            • {{ topic.messages.length }} message(s)
          </small>
        </li>
      </ul>

      <div *ngIf="!loading && topics.length === 0">
        <p>Aucun sujet pour l’instant.</p>
      </div>
    </div>
  `,
  styles: [`
    .forum-list { padding: 1rem; }
    .new-topic-form { margin: 1rem 0; }
    li { cursor: pointer; margin: 0.5rem 0; padding: 0.5rem; border-bottom: 1px solid #ccc; }
    .error { color: red; }
  `]
})
export class ForumListComponent implements OnInit {
  courseId!: string;              // now read from route, not Input
  topics: ForumTopic[] = [];
  loading = false;
  error: string | null = null;

  showNewTopicForm = false;
  newTopicForm: FormGroup;

  constructor(
    private forumSvc: ForumService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.newTopicForm = this.fb.group({
      title: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Read courseId from the route parameter "id"
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Identifiant de cours manquant';
      return;
    }
    this.courseId = id;
    this.loadTopics();
  }

  loadTopics() {
    this.loading = true;
    this.error = null;

    this.forumSvc.listTopics(this.courseId).subscribe({
      next: (arr) => {
        this.topics = arr;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Échec du chargement';
        this.loading = false;
      }
    });
  }

  toggleNewTopicForm() {
    this.showNewTopicForm = !this.showNewTopicForm;
  }

  createTopic() {
    if (this.newTopicForm.invalid) return;

    const payload: NewTopic = {
      title: this.newTopicForm.value.title
    };
    this.forumSvc.createTopic(this.courseId, payload).subscribe({
      next: () => {
        this.newTopicForm.reset();
        this.showNewTopicForm = false;
        this.loadTopics();
      },
      error: (err) => {
        this.error = err.error?.detail || 'Impossible de créer le sujet';
      }
    });
  }

  goToTopic(topicId: string) {
    // Navigate to /courses/{courseId}/forums/{topicId}
    this.router.navigate(
      ['/courses', this.courseId, 'forums', topicId],
      { relativeTo: this.route }
    );
  }
}
