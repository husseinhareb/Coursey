// src/app/submissions/submission-list.component.ts

import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { AuthService, Me } from '../auth/auth.service';
import {
  SubmissionService,
  Submission,
  SubmissionGrade
} from '../services/submission.service';
import { PostService, Post } from '../services/post.service';
import { environment } from '../environments/environment';
import { Enrollment } from '../services/user.service';

@Component({
  selector: 'app-submission-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="submission-list">
      <!-- Title adapts to role -->
      <h4 *ngIf="canViewAll">Toutes les soumissions</h4>
      <h4 *ngIf="!canViewAll">Vos soumissions</h4>

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
            <!-- Only professors/admins see the student column -->
            <th *ngIf="canViewAll">Étudiant·e</th>
            <th>Fichier</th>
            <th>Soumis le</th>
            <th>Due Date</th>
            <th>Statut</th>
            <th>Note</th>
            <th>Commentaire</th>
            <!-- Only professors/admins can grade -->
            <th *ngIf="canGrade">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of displayedSubmissions">
            <td *ngIf="canViewAll">
              {{ s.firstName || '—' }} {{ s.lastName || '' }}
            </td>
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
            <td *ngIf="canGrade">
              <button
                *ngIf="s.status !== 'graded'"
                (click)="startGrading(s._id)"
              >
                Noter
              </button>
            </td>
          </tr>

          <!-- “No submissions” row (with proper interpolation inside <td>) -->
          <tr *ngIf="displayedSubmissions.length === 0">
  <td [attr.colspan]="canViewAll ? 8 : 7">
    {{ 
      canViewAll 
        ? 'Aucune soumission pour le moment.' 
        : 'Vous n\'avez pas encore soumis.' 
    }}
  </td>
</tr>

        </tbody>
      </table>

      <!-- Grading Form (only visible to prof/admin) -->
      <div *ngIf="gradingSubmissionId && canGrade" class="grading-form">
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
    `
  ]
})
export class SubmissionListComponent implements OnInit {
  @Input() courseId!: string;
  @Input() postId!: string;

  private auth = inject(AuthService);
  private svc = inject(SubmissionService);
  private postSvc = inject(PostService);
  private fb = inject(FormBuilder);

  currentUser: Me | null = null;
  isAdmin = false;
  isProfessorInCourse = false;
  isStudentInCourse = false;

  /** All fetched submissions */
  private allSubmissions: Submission[] = [];
  /** Filtered: either all submissions or just the current user’s */
  displayedSubmissions: Submission[] = [];

  loading = false;
  error: string | null = null;

  /**
   * Parsed due date of the post, used in the “Due Date” column.
   */
  postDueDate: Date | null = null;

  // Grading form state (professor/admin only)
  gradingSubmissionId: string | null = null;
  gradeForm: FormGroup = this.fb.group({
    grade: [
      null,
      [Validators.required, Validators.min(0), Validators.max(100)]
    ],
    comment: ['', Validators.required]
  });
  gradingLoading = false;
  gradingError: string | null = null;

  /** Computed flags **/
  get canViewAll(): boolean {
    return this.isAdmin || this.isProfessorInCourse;
  }
  get canGrade(): boolean {
    return this.canViewAll;
  }

  ngOnInit() {
    // Subscribe to the user stream to determine roles and load submissions
    this.auth.user$.subscribe({
      next: (user) => {
        this.currentUser = user;
        this.computePermissions();
        this.fetchPostDueDate();
        this.fetchSubmissions();
      },
      error: () => {
        this.currentUser = null;
        this.computePermissions();
        this.fetchPostDueDate();
        this.fetchSubmissions();
      }
    });
  }

  /** Determine if currentUser is admin/professor/student in this course */
  private computePermissions() {
    if (!this.currentUser) {
      this.isAdmin = false;
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
      return;
    }

    const rolesLower = this.currentUser.roles.map(r => r.toLowerCase());
    this.isAdmin = rolesLower.includes('admin');

    const found: Enrollment | undefined =
      (this.currentUser.enrollments as Enrollment[]).find(
        (e: Enrollment) => e.courseId === this.courseId
      );

    if (found) {
      this.isProfessorInCourse = rolesLower.includes('teacher');
      this.isStudentInCourse = rolesLower.includes('student');
    } else {
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
    }
  }

  /** Load the parent post to extract its due date (if any) */
  private fetchPostDueDate() {
    this.postSvc.get(this.courseId, this.postId).subscribe({
      next: (post: Post) => {
        this.postDueDate = post.due_date ? new Date(post.due_date) : null;
      },
      error: () => {
        this.postDueDate = null;
      }
    });
  }

  /** Fetch all submissions, then filter for display */
  private fetchSubmissions() {
  this.loading = true;
  this.error = null;
  this.svc.list(this.courseId, this.postId).subscribe({
    next: (subs: Submission[]) => {
      console.log('raw submissions from server:', subs);
      this.allSubmissions = subs;
      this.applyDisplayFilter();
      console.log('after filter, displayedSubmissions =', this.displayedSubmissions);
      this.loading = false;
    },
    error: (err: any) => {
      this.error =
        err.error?.detail || 'Impossible de charger les soumissions';
      this.loading = false;
    }
  });
}


  /** Decide which submissions to show based on role */
  private applyDisplayFilter() {
  if (this.canViewAll) {
    // Professors/admins see every submission
    this.displayedSubmissions = [...this.allSubmissions];
  } else if (this.isStudentInCourse && this.currentUser) {
    // Students see only submissions where studentId matches their _id:
    this.displayedSubmissions = this.allSubmissions.filter(
      s => (s as any).studentId === this.currentUser!.id
    );
  } else {
    this.displayedSubmissions = [];
  }
}


  /** Human-friendly French status labels */
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

  /** Begin grading flow for a specific submission */
  startGrading(submissionId: string) {
    this.gradingSubmissionId = submissionId;
    this.gradeForm.reset();
    this.gradingError = null;
  }

  /** Cancel grading form */
  cancelGrading() {
    this.gradingSubmissionId = null;
    this.gradingError = null;
  }

  /** Submit a grade + comment to the backend */
  submitGrade() {
    if (!this.gradingSubmissionId || this.gradeForm.invalid) {
      return;
    }
    this.gradingLoading = true;

    const payload: SubmissionGrade = {
      grade: this.gradeForm.value.grade!,
      comment: this.gradeForm.value.comment!
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
          // Reload submissions (so the “grade” and “status” update)
          this.fetchSubmissions();
        },
        error: (err: any) => {
          this.gradingError =
            err.error?.detail || 'Échec de l’enregistrement de la note';
          this.gradingLoading = false;
        }
      });
  }

  /** Build the file download URL from the file ID */
  getFileUrl(fileId: string): string {
    return `${environment.apiUrl}/files/${fileId}`;
  }
}
