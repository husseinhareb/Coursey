// src/app/users/manage-enrollments.component.ts

import { Component, OnInit }      from '@angular/core';
import { CommonModule }            from '@angular/common';
import { ActivatedRoute }          from '@angular/router';
import { CourseService, Course }   from '../services/course.service';
import { UserService } from '../services/user.service';
import { TranslateModule }       from '@ngx-translate/core';

@Component({
  selector: 'app-manage-enrollments',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './manage-enrollments.component.html',
  styleUrl: './manage-enrollments.component.css'
})
export class ManageEnrollmentsComponent implements OnInit {
  userId!: string;
  courses: Course[] = [];
  enrollments = new Set<string>();
  loading = true;
  error: string | null = null;
  isTargetAdmin = false;

  constructor(
    private route:    ActivatedRoute,
    private courseSvc: CourseService,
    private userSvc:   UserService
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.params['id'];

    // 1) Vérifier si l'utilisateur cible est admin
    this.userSvc.getById(this.userId).subscribe({
      next: user => {
        const rolesLower = user.roles.map(r => r.toLowerCase());
        this.isTargetAdmin = rolesLower.includes('admin');

        if (this.isTargetAdmin) {
          // On arrête ici : pas besoin de charger courses ni enrollments
          this.loading = false;
          return;
        }

        // 2) Charger la liste des cours, puis les enrollments
        this.courseSvc.list().subscribe({
          next: cs => {
            this.courses = cs;
            this.userSvc.listEnrollments(this.userId).subscribe({
              next: enrs => {
                enrs.forEach(e => this.enrollments.add(e.courseId));
                this.loading = false;
              },
              error: () => {
                this.error = 'Failed to load user enrollments';
                this.loading = false;
              }
            });
          },
          error: () => {
            this.error = 'Failed to load courses';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Failed to load user data';
        this.loading = false;
      }
    });
  }

  toggle(courseId: string, checked: boolean) {
    if (this.isTargetAdmin) {
      return;
    }

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
