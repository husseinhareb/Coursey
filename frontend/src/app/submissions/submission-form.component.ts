// src/app/submissions/submission-form.component.ts

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule }     from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { SubmissionService, SubmissionCreate } from '../services/submission.service';

@Component({
  selector: 'app-submission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="submission-form">
      <h4>Submit Homework</h4>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="fileId">File ID / URL:</label>
          <input id="fileId" formControlName="file_id" placeholder="e.g. file123" />
        </div>
        <button type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Submitting…' : 'Submit' }}
        </button>
        <button type="button" (click)="cancel.emit()">Cancel</button>
      </form>
      <div *ngIf="error" class="error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .submission-form {
      border: 1px solid #ccc;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .error {
      color: red;
      margin-top: 0.5rem;
    }
  `]
})
export class SubmissionFormComponent {
  @Input() courseId!: string;
  @Input() postId!: string;
  @Output() submitted = new EventEmitter<void>();
  @Output() cancel    = new EventEmitter<void>();

  private fb   = inject(FormBuilder);
  private svc  = inject(SubmissionService);

  form = this.fb.group({
    file_id: ['', Validators.required]
  });
  loading = false;
  error: string | null = null;

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    // Explicitly extract `file_id` so TS knows it’s a string
    const payload: SubmissionCreate = {
      file_id: this.form.get('file_id')!.value
    };

    this.svc.create(this.courseId, this.postId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.submitted.emit();
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.detail || 'Submission failed';
      }
    });
  }
}
