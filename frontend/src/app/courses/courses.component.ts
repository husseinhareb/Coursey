// src/app/courses/courses.component.ts

import { Component, OnInit }    from '@angular/core';
import { CommonModule }          from '@angular/common';
import { RouterModule, Router }  from '@angular/router';
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
  loading = false;
  error: string | null = null;

  constructor(
    private svc:    CourseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetch();
  }

  private fetch() {
    this.loading = true;
    this.svc.list().subscribe({
      next: cs => {
        this.courses = cs;
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.detail || err.message || 'Failed to load courses';
        this.loading = false;
      }
    });
  }

  edit(id: string) {
    this.router.navigate(['/courses', id, 'edit']);
  }

  delete(id: string) {
    if (!confirm('Are you sure you want to delete this course?')) {
      return;
    }
    this.svc.delete(id).subscribe({
      next: () => this.fetch(),
      error: err => this.error = err.error?.detail || 'Delete failed'
    });
  }
}
