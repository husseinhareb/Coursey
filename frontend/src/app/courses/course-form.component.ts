// src/app/courses/course-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { CourseService, Course, CourseCreate } from '../services/course.service';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './course-form.component.html'
})
export class CourseFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  private id!: string;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private svc: CourseService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // initialize the form after fb is injected
    this.form = this.fb.group({
      title:      ['', Validators.required],
      code:       ['', Validators.required],
      description:['', Validators.required],
      background: ['']
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.id = id;
      this.svc.get(id).subscribe({
        next: (c: Course) => this.form.patchValue(c),
        error: () => this.error = 'Failed to load course'
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    // cast to your DTO so TS knows fields are non-null
    const payload = this.form.value as CourseCreate;

    const action = this.isEdit
      ? this.svc.update(this.id, payload)
      : this.svc.create(payload);

    action.subscribe({
      next: () => this.router.navigate(['/courses']),
      error: err => this.error = err.error?.detail || 'Save failed'
    });
  }
}
