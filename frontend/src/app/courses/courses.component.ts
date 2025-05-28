// src/app/courses/courses.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CourseService, Course } from '../services/course.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private svc: CourseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.svc.list().subscribe({
      next: data => { this.courses = data; this.loading = false; },
      error: err => { this.error = err.message || 'Failed loading'; this.loading = false; }
    });
  }

  delete(id: string) {
    if (!confirm('Delete this course?')) return;
    this.svc.delete(id).subscribe({
      next: () => this.reload(),
      error: err => alert(err.error?.detail || 'Delete failed')
    });
  }

  edit(id: string) {
    this.router.navigate(['/courses', id, 'edit']);
  }
}
