import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  RouterModule,
  ActivatedRoute,
  Router
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CourseService, CourseCreate } from '../services/course.service';
import { FileService, UploadResult } from '../services/file.service';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.css']
})
export class CourseFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  private id?: string;
  loading = false;
  error: string | null = null;

  // for image upload
  uploadingBackground = false;
  previewBackgroundUrl?: string;

  constructor(
    private fb:     FormBuilder,
    private svc:    CourseService,
    private fileSvc: FileService,
    private route:  ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      title:       ['', Validators.required],
      code:        ['', Validators.required],
      description: ['', Validators.required],
      // background will hold the uploaded URL
      background:  ['']
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.id = id;
      this.loading = true;
      this.svc.get(id).subscribe({
        next: course => {
          this.form.patchValue({
            title:       course.title,
            code:        course.code,
            description: course.description,
            background:  course.background || ''
          });
          this.previewBackgroundUrl = course.background || undefined;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load course';
          this.loading = false;
        }
      });
    }
  }

  onBackgroundSelected(event: Event): void {
    const inp = event.target as HTMLInputElement;
    if (!inp.files?.length) return;
    const file = inp.files[0];

    this.uploadingBackground = true;
    this.fileSvc.upload(file).subscribe({
      next: (res: UploadResult) => {
        // show preview immediately
        this.previewBackgroundUrl = res.url;
        // store url into form
        this.form.patchValue({ background: res.url });
        this.uploadingBackground = false;
      },
      error: () => {
        this.error = 'Image upload failed';
        this.uploadingBackground = false;
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;

    const payload = this.form.value as CourseCreate;

    const obs = this.isEdit
      ? this.svc.update(this.id!, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: () => this.router.navigate(['/courses']),
      error: err => {
        this.error = err.error?.detail || 'Save failed';
        this.loading = false;
      }
    });
  }
}
