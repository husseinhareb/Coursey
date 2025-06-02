// src/app/submissions/submission.component.ts

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SubmissionService, SubmissionCreate } from '../services/submission.service';

@Component({
  selector: 'app-submission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="submission-form">
      <h4>Submit Homework</h4>
      <form (ngSubmit)="onSubmit()">
        <div>
          <label for="file">Choose file to upload:</label>
          <input
            id="file"
            type="file"
            (change)="onFileSelected($event)"
            required
          />
        </div>

        <div style="margin-top: 0.5rem;">
          <button type="submit" [disabled]="!selectedFile || loading">
            {{ loading ? 'Submitting…' : 'Submit' }}
          </button>
          <button type="button" (click)="cancel.emit()">Cancel</button>
        </div>
      </form>
      <div *ngIf="error" class="error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .submission-form {
      border: 1px solid #ccc;
      padding: 1rem;
      margin-bottom: 1rem;
      background: #fafafa;
    }
    .submission-form h4 {
      margin-top: 0;
    }
    .error {
      color: red;
      margin-top: 0.5rem;
    }
    label {
      display: block;
      margin-bottom: 0.25rem;
    }
    input[type="file"] {
      display: block;
      margin-bottom: 0.5rem;
    }
  `]
})
export class SubmissionFormComponent {
  @Input() courseId!: string;
  @Input() postId!: string;
  @Output() submitted = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private svc = inject(SubmissionService);

  selectedFile: File | null = null;
  loading = false;
  error: string | null = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error = null;
    }
  }

  onSubmit() {
    if (!this.selectedFile) {
      this.error = 'Please select a file before submitting.';
      return;
    }

    this.loading = true;
    this.error = null;

    const payload: SubmissionCreate = {
      file: this.selectedFile
    };

    this.svc.create(this.courseId, this.postId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.selectedFile = null;
        this.submitted.emit();
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.detail || 'Submission failed';
      }
    });
  }
}
