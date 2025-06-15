// src/app/submissions/submission-form.component.ts

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule }     from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SubmissionService, SubmissionCreate } from '../services/submission.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-submission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,TranslateModule],
  templateUrl: `./submission-form.component.html`,

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
