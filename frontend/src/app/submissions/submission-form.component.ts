import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule }     from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
          <label for="fileInput">Upload File:</label>
          <input
            id="fileInput"
            type="file"
            (change)="onFileSelected($event)"
            accept="*/*"
          />
        </div>
        <div style="margin-top: 0.5rem;">
          <button type="submit" [disabled]="form.invalid || loading">
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

  private fb  = inject(FormBuilder);
  private svc = inject(SubmissionService);

  // Instead of a text field, we hold the actual File in a FormControl
  form: FormGroup = this.fb.group({
    file: [null, Validators.required]  // Will hold a File object
  });

  loading = false;
  error: string | null = null;

  /** Called when user picks a file from the <input type="file"> */
  onFileSelected(evt: Event) {
    this.error = null;
    const input = evt.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.form.get('file')!.setValue(file);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    // Extract the File from the FormGroup
    const file: File = this.form.get('file')!.value as File;
    const payload: SubmissionCreate = { file };

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
