// src/app/submissions/submission-list.component.ts

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
import { environment } from '../environments/environment';

@Component({
  selector: 'app-submission-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="submission-list">
      <h4>All Submissions</h4>

      <div *ngIf="loading">Loading submissions…</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <table *ngIf="!loading && !error" border="1" cellpadding="4" cellspacing="0">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>File Name</th>
            <th>Status</th>
            <th>Grade</th>
            <th>Comment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of submissions">
            <td>
              {{ s.firstName || '—' }} {{ s.lastName || '' }}
            </td>
            <td>
              <ng-container *ngIf="s.file_name && s.file_id; else noFile">
                <a [href]="getFileUrl(s.file_id)" target="_blank" rel="noopener">
                  {{ s.file_name }}
                </a>
              </ng-container>
              <ng-template #noFile>—</ng-template>
            </td>
            <td>{{ s.status }}</td>
            <td>{{ s.grade != null ? s.grade : '—' }}</td>
            <td>{{ s.comment != null ? s.comment : '—' }}</td>
            <td>
              <button *ngIf="s.status !== 'graded'" (click)="startGrading(s._id)">
                Grade
              </button>
            </td>
          </tr>

          <tr *ngIf="submissions.length === 0">
            <td colspan="6">No submissions yet.</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="gradingSubmissionId" class="grading-form">
        <h5>Grade Submission</h5>
        <form [formGroup]="gradeForm" (ngSubmit)="submitGrade()">
          <div>
            <label for="grade">Grade:</label>
            <input
              id="grade"
              type="number"
              formControlName="grade"
              placeholder="e.g. 85"
            />
          </div>
          <div>
            <label for="comment">Comment:</label>
            <textarea
              id="comment"
              formControlName="comment"
              placeholder="Feedback…"
            ></textarea>
          </div>
          <button
            type="submit"
            [disabled]="gradeForm.invalid || gradingLoading"
          >
            {{ gradingLoading ? 'Saving…' : 'Save Grade' }}
          </button>
          <button type="button" (click)="cancelGrading()">Cancel</button>
        </form>
        <div *ngIf="gradingError" class="error">{{ gradingError }}</div>
      </div>
    </div>
  `,
  styles: [`
    .submission-list {
      border: 1px solid #ddd;
      padding: 1rem;
      margin: 1rem 0;
    }
    .grading-form {
      border: 1px solid #f90;
      padding: 0.75rem;
      margin-top: 1rem;
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
    th, td {
      padding: 0.5rem;
      text-align: left;
      border: 1px solid #ccc;
    }
    a {
      color: blue;
      text-decoration: underline;
      cursor: pointer;
    }
  `]
})
export class SubmissionListComponent implements OnInit {
  @Input() courseId!: string;
  @Input() postId!: string;

  private svc = inject(SubmissionService);
  private fb = inject(FormBuilder);

  submissions: Submission[] = [];
  loading = false;
  error: string | null = null;

  // Grading state:
  gradingSubmissionId: string | null = null;
  gradeForm: FormGroup = this.fb.group({
    grade: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    comment: ['', Validators.required]
  });
  gradingLoading = false;
  gradingError: string | null = null;

  ngOnInit() {
    this.fetchSubmissions();
  }

  fetchSubmissions() {
    this.loading = true;
    this.error = null;

    this.svc.list(this.courseId, this.postId).subscribe({
      next: arr => {
        this.submissions = arr;
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.detail || 'Failed to load submissions';
        this.loading = false;
      }
    });
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
    this.gradingError = null;

    const payload: SubmissionGrade = {
      grade: this.gradeForm.value.grade!,
      comment: this.gradeForm.value.comment!
    };

    this.svc.grade(
      this.courseId,
      this.postId,
      this.gradingSubmissionId,
      payload
    ).subscribe({
      next: () => {
        this.gradingLoading = false;
        this.gradingSubmissionId = null;
        this.fetchSubmissions();
      },
      error: err => {
        this.gradingError = err.error?.detail || 'Failed to save grade';
        this.gradingLoading = false;
      }
    });
  }

  getFileUrl(fileId: string): string {
    return `${environment.apiUrl}/files/${fileId}`;
  }
}
