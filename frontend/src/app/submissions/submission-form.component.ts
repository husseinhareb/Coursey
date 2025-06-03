// src/app/submissions/submission-form.component.ts

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
      <h4>Soumettre un devoir</h4>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="fileInput">Téléverser le fichier :</label>
          <input
            id="fileInput"
            type="file"
            (change)="onFileSelected($event)"
            accept="*/*"
          />
        </div>
        <div style="margin-top: 0.5rem;">
          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Envoi…' : 'Soumettre' }}
          </button>
          <button type="button" (click)="cancel.emit()">Annuler</button>
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
  @Output() cancel    = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private svc = inject(SubmissionService);

  // We keep the actual File object in a FormControl
  form: FormGroup = this.fb.group({
    file: [null, Validators.required]
  });

  loading = false;
  error: string | null = null;

  /** Called when user picks a file */
  onFileSelected(evt: Event) {
    this.error = null;
    const input = evt.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.get('file')!.setValue(input.files[0]);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    const file: File = this.form.get('file')!.value;
    const payload: SubmissionCreate = { file };

    this.svc.create(this.courseId, this.postId, payload).subscribe({
      next: () => {
        this.loading = false;
        // Tell parent to reload the submissions list
        this.submitted.emit();
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.detail || 'Échec de la soumission';
      }
    });
  }
}
