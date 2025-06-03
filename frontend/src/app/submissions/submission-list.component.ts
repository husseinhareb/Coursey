import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  SubmissionService,
  Submission,
  SubmissionGrade
} from '../services/submission.service';
import { PostService, Post } from '../services/post.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-submission-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="submission-list">
      <h4>Toutes les soumissions</h4>

      <div *ngIf="loading">Chargement des soumissions…</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <table
        *ngIf="!loading && !error"
        border="1"
        cellpadding="4"
        cellspacing="0"
      >
        <thead>
          <tr>
            <th>Étudiant·e</th>
            <th>Fichier</th>
            <th>Soumis à</th>
            <th>Date limite</th>
            <th>Statut</th>
            <th>Note</th>
            <th>Commentaire</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of submissions">
            <td>{{ s.firstName || '—' }} {{ s.lastName || '' }}</td>
            <td>
              <ng-container *ngIf="s.file_name && s.file_id; else noFile">
                <a
                  [href]="getFileUrl(s.file_id)"
                  target="_blank"
                  rel="noopener"
                >
                  {{ s.file_name }}
                </a>
              </ng-container>
              <ng-template #noFile>—</ng-template>
            </td>
            <td>{{ s.created_at | date: 'short' }}</td>
            <td>
              <ng-container *ngIf="postDueDate; else noDue">
                {{ postDueDate | date: 'short' }}
              </ng-container>
              <ng-template #noDue>—</ng-template>
            </td>
            <td>
              <span
                [ngClass]="{
                  'badge-submitted': s.status === 'submitted',
                  'badge-late': s.status === 'late',
                  'badge-graded': s.status === 'graded'
                }"
              >
                {{ formatStatus(s.status) }}
              </span>
            </td>
            <td>{{ s.grade != null ? s.grade : '—' }}</td>
            <td>{{ s.comment != null ? s.comment : '—' }}</td>
            <td>
              <button
                *ngIf="s.status !== 'graded'"
                (click)="startGrading(s._id)"
              >
                Noter
              </button>
            </td>
          </tr>
          <tr *ngIf="submissions.length === 0">
            <td colspan="8">Aucune soumission pour le moment.</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="gradingSubmissionId" class="grading-form">
        <h5>Noter la soumission</h5>
        <form [formGroup]="gradeForm" (ngSubmit)="submitGrade()">
          <div>
            <label for="grade">Note (0–100) :</label>
            <input
              id="grade"
              type="number"
              formControlName="grade"
              placeholder="par ex. 85"
            />
            <div
              *ngIf="
                gradeForm.get('grade')?.touched &&
                gradeForm.get('grade')?.invalid
              "
              class="error"
            >
              La note doit être entre 0 et 100.
            </div>
          </div>
          <div>
            <label for="comment">Commentaire :</label>
            <textarea
              id="comment"
              formControlName="comment"
              placeholder="Vos commentaires…"
            ></textarea>
            <div
              *ngIf="
                gradeForm.get('comment')?.touched &&
                gradeForm.get('comment')?.invalid
              "
              class="error"
            >
              Un commentaire est requis.
            </div>
          </div>
          <button
            type="submit"
            [disabled]="gradeForm.invalid || gradingLoading"
          >
            {{ gradingLoading ? 'Enregistrement…' : 'Enregistrer la note' }}
          </button>
          <button type="button" (click)="cancelGrading()">Annuler</button>
        </form>
        <div *ngIf="gradingError" class="error">{{ gradingError }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .submission-list {
        border: 1px solid #ddd;
        padding: 1rem;
        margin: 1rem 0;
        background: #f9f9f9;
      }
      .grading-form {
        border: 2px solid #f90;
        padding: 1rem;
        margin-top: 1rem;
        background: #fff3e0;
      }
      .error {
        color: red;
        margin-top: 0.5rem;
      }
      table {
        width: 100%;
        margin-bottom: 1rem;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 0.5rem;
        text-align: left;
        border: 1px solid #ccc;
      }
      a {
        color: #1976d2;
        text-decoration: underline;
        cursor: pointer;
      }

      /* Badges for different statuses */
      .badge-submitted {
        background: #ffd54f;
        color: #212121;
        padding: 0.25rem 0.6rem;
        border-radius: 0.25rem;
        font-size: 0.85em;
      }
      .badge-late {
        background: #e57373;
        color: #fff;
        padding: 0.25rem 0.6rem;
        border-radius: 0.25rem;
        font-size: 0.85em;
      }
      .badge-graded {
        background: #81c784;
        color: #fff;
        padding: 0.25rem 0.6rem;
        border-radius: 0.25rem;
        font-size: 0.85em;
      }
    `,
  ],
})
export class SubmissionListComponent implements OnInit {
  @Input() courseId!: string;
  @Input() postId!: string;

  private svc = inject(SubmissionService);
  private postSvc = inject(PostService);
  private fb = inject(FormBuilder);

  submissions: Submission[] = [];
  loading = false;
  error: string | null = null;

  /**
   * The post’s due_date as a real Date object (or null if none).
   * We convert the ISO‐string from the API into a Date so the `date` pipe can render it.
   */
  postDueDate: Date | null = null;

  // Grading state
  gradingSubmissionId: string | null = null;
  gradeForm: FormGroup = this.fb.group({
    grade: [
      null,
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
    comment: ['', Validators.required],
  });
  gradingLoading = false;
  gradingError: string | null = null;

  ngOnInit() {
    this.fetchPostDueDate();
    this.fetchSubmissions();
  }

  /** Fetch the parent post to read its due_date */
  private fetchPostDueDate() {
    this.postSvc.get(this.courseId, this.postId).subscribe({
      next: (post: Post) => {
        if (post.due_date) {
          // Convert ISO string → Date so the date pipe can format it
          this.postDueDate = new Date(post.due_date);
        } else {
          console.warn(
            `[SubmissionList] pas de due_date sur le post ${this.postId}`
          );
          this.postDueDate = null;
        }
      },
      error: (err: any) => {
        console.error('Impossible de charger la date limite :', err);
        this.postDueDate = null;
      },
    });
  }

  fetchSubmissions() {
    this.loading = true;
    this.error = null;
    this.svc.list(this.courseId, this.postId).subscribe({
      next: (arr: Submission[]) => {
        this.submissions = arr;
        this.loading = false;
      },
      error: (err: any) => {
        this.error =
          err.error?.detail || 'Impossible de charger les soumissions';
        this.loading = false;
      },
    });
  }

  /** Convert the raw status into a French label */
  formatStatus(raw: string): string {
    switch (raw) {
      case 'submitted':
        return 'Soumis';
      case 'late':
        return 'En retard';
      case 'graded':
        return 'Corrigé';
      default:
        return raw;
    }
  }

  startGrading(submissionId: string) {
    this.gradingSubmissionId = submissionId;
    this.gradeForm.reset();
    this.gradingError = null;
  }

  cancelGrading() {
    this.gradingSubmissionId = null;
    this.gradingError = null;
  }

  submitGrade() {
    if (!this.gradingSubmissionId || this.gradeForm.invalid) {
      return;
    }
    this.gradingLoading = true;

    const payload: SubmissionGrade = {
      grade: this.gradeForm.value.grade!,
      comment: this.gradeForm.value.comment!,
    };

    this.svc
      .grade(
        this.courseId,
        this.postId,
        this.gradingSubmissionId,
        payload
      )
      .subscribe({
        next: () => {
          this.gradingLoading = false;
          this.gradingSubmissionId = null;
          this.fetchSubmissions();
        },
        error: (err: any) => {
          this.gradingError =
            err.error?.detail || 'Échec de l’enregistrement de la note';
          this.gradingLoading = false;
        },
      });
  }

  getFileUrl(fileId: string): string {
    return `${environment.apiUrl}/files/${fileId}`;
  }
}
