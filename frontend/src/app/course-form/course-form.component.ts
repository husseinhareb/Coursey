// src/app/courses/course-form.component.ts

import { Component, OnInit }            from '@angular/core';
import { CommonModule }                  from '@angular/common';
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
import { CourseService, CourseCreate }   from '../services/course.service';
import { TranslateModule }       from '@ngx-translate/core';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterModule, TranslateModule ],
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.css']
})
export class CourseFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  private id?: string;
  loading = false;
  error: string | null = null;

  constructor(
    private fb:     FormBuilder,
    private svc:    CourseService,
    private route:  ActivatedRoute,
    private router: Router
  ) {
    // initialize here, after fb is available
    this.form = this.fb.group({
      title:       ['', Validators.required],
      code:        ['', Validators.required],
      description: ['', Validators.required],
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
          // only patch the fields your form cares about
          this.form.patchValue({
            title:       course.title,
            code:        course.code,
            description: course.description,
            background:  course.background || ''
          });
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load course';
          this.loading = false;
        }
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    // cast to CourseCreate so TS is happy
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
