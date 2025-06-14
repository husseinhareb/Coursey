// src/app/submissions/submission.component.ts

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SubmissionService, SubmissionCreate } from '../services/submission.service';

@Component({
  selector: 'app-submission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: `./submission.component.html`,

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
