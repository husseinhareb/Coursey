// src/app/courses/course-detail.component.ts

import { Component, OnInit }      from '@angular/core';
import { CommonModule }            from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CourseService, Course }   from '../services/course.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit {
  course?: Course;
  loading = false;
  error: string | null = null;

  constructor(
    private svc:   CourseService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'No course ID provided';
      return;
    }
    this.loading = true;
    this.svc.get(id).subscribe({
      next: c => {
        this.course = c;
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.detail || 'Failed to load course';
        this.loading = false;
      }
    });
  }
}
