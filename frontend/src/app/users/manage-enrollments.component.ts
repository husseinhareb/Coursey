// src/app/users/manage-enrollments.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ActivatedRoute }    from '@angular/router';
import { CourseService, Course } from '../services/course.service';
import { UserService, Enrollment } from '../services/user.service';

@Component({
  selector: 'app-manage-enrollments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-enrollments.component.html'
})
export class ManageEnrollmentsComponent implements OnInit {
  userId!: string;
  courses: Course[] = [];
  enrollments = new Set<string>();
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private courseSvc: CourseService,
    private userSvc: UserService
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.params['id'];
    // load both lists in parallel
    this.courseSvc.list().subscribe({
      next: cs => {
        this.courses = cs;
        this.userSvc.listEnrollments(this.userId).subscribe(enrs => {
          enrs.forEach(e => this.enrollments.add(e.courseId));
          this.loading = false;
        });
      },
      error: err => { this.error = 'Load failed'; this.loading = false; }
    });
  }

  toggle(courseId: string, checked: boolean) {
    if (checked) {
      this.userSvc.enroll(this.userId, courseId).subscribe({
        next: () => this.enrollments.add(courseId),
        error: () => this.error = 'Enroll failed'
      });
    } else {
      this.userSvc.unenroll(this.userId, courseId).subscribe({
        next: () => this.enrollments.delete(courseId),
        error: () => this.error = 'Un-enroll failed'
      });
    }
  }
}
