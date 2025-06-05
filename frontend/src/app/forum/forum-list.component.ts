// src/app/forum-list/forum-list.component.ts

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
import { AuthService, Me }         from '../auth/auth.service';
import { Enrollment } from '../services/user.service';

@Component({
  selector: 'app-forum-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="forum-list">
      <h3>Forums / Sujets</h3>

      <!-- Affiche le bouton + Nouveau sujet uniquement si canCreateTopic true -->
      <button *ngIf="canCreateTopic" (click)="toggleNewTopicForm()">
        {{ showNewTopicForm ? 'Annuler' : '+ Nouveau sujet' }}
      </button>

      <!-- Formulaire de création de sujet -->
      <div *ngIf="showNewTopicForm" class="new-topic-form">
        <form [formGroup]="newTopicForm" (ngSubmit)="createTopic()">
          <div>
            <label for="title">Titre du sujet :</label>
            <input id="title" formControlName="title" placeholder="Titre" />
            <div
              *ngIf="newTopicForm.get('title')?.touched && newTopicForm.get('title')?.invalid"
              class="error"
            >
              Le titre est requis.
            </div>
          </div>
          <button type="submit" [disabled]="newTopicForm.invalid">
            Créer
          </button>
        </form>
      </div>

      <!-- Message d'information si l'utilisateur ne peut pas créer de sujet -->
      <div *ngIf="!loading && !canCreateTopic" class="info">
        Seuls les professeurs inscrits peuvent créer de nouveaux sujets.
      </div>

      <div *ngIf="loading">Chargement des sujets…</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <ul *ngIf="!loading && !error">
        <li *ngFor="let topic of topics" (click)="goToTopic(topic._id)">
          <strong>{{ topic.title }}</strong>
          <br />
          <small>
            Créé par {{ topic.author_id }}
            le {{ topic.created_at | date: 'short' }}
            • {{ topic.messages?.length || 0 }} message(s)
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
    li {
      cursor: pointer;
      margin: 0.5rem 0;
      padding: 0.5rem;
      border-bottom: 1px solid #ccc;
    }
    .error { color: red; }
    .info {
      margin-top: 1rem;
      color: #555;
      font-style: italic;
    }
  `]
})
export class ForumListComponent implements OnInit {
  courseId!: string;              
  topics: ForumTopic[] = [];
  loading = false;
  error: string | null = null;

  showNewTopicForm = false;
  newTopicForm: FormGroup;

  currentUser: Me | null = null;
  canCreateTopic = false;

  constructor(
    private forumSvc:  ForumService,
    private fb:         FormBuilder,
    private router:     Router,
    private route:      ActivatedRoute,
    private auth:       AuthService
  ) {
    this.newTopicForm = this.fb.group({
      title: ['', Validators.required]
    });
  }

  ngOnInit() {
    // 1) Récupérer le courseId depuis la route
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Identifiant de cours manquant';
      return;
    }
    this.courseId = id;

    // 2) S'abonner à l'utilisateur courant pour calculer canCreateTopic
    this.auth.user$.subscribe({
      next: user => {
        this.currentUser = user;
        this.computeCanCreateTopic();
      },
      error: () => {
        this.currentUser = null;
        this.computeCanCreateTopic();
      }
    });

    // 3) Charger la liste des topics
    this.loadTopics();
  }

  private computeCanCreateTopic() {
    if (!this.currentUser) {
      this.canCreateTopic = false;
      return;
    }
    const rolesLower = this.currentUser.roles.map(r => r.toLowerCase());
    if (!rolesLower.includes('teacher')) {
      this.canCreateTopic = false;
      return;
    }
    // Vérifier qu'il est bien inscrit à ce cours
    const found = (this.currentUser.enrollments as Enrollment[]).find(
      (e: Enrollment) => e.courseId === this.courseId /* && e.role?.toLowerCase() === 'teacher' */
    );
    this.canCreateTopic = !!found;
  }

  loadTopics() {
    this.loading = true;
    this.error = null;

    this.forumSvc.listTopics(this.courseId).subscribe({
      next: arr => {
        this.topics = arr;
        this.loading = false;
      },
      error: err => {
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
      error: err => {
        this.error = err.error?.detail || 'Impossible de créer le sujet';
      }
    });
  }

  goToTopic(topicId: string) {
    this.router.navigate(
      ['/courses', this.courseId, 'forums', topicId],
      { relativeTo: this.route }
    );
  }
}
