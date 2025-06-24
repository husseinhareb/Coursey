// src/app/users/users.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { HttpClientModule }  from '@angular/common/http';
import { RouterModule }      from '@angular/router';
import { forkJoin, switchMap, map, of } from 'rxjs';

import { UserService, User, Enrollment }   from '../services/user.service';
import { CourseService, Course }          from '../services/course.service';
import { TranslateModule }                from '@ngx-translate/core';
import { AuthService, Me }                from '../auth/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  // Map of userId → Enrollment[]
  userEnrollments: Record<string, Enrollment[]> = {};
  // Map of courseId → course code
  courseCodeMap: Record<string, string> = {};

  isAdmin = false;

  constructor(
    private userService:   UserService,
    private courseService: CourseService,
    private auth:          AuthService
  ) {}

  ngOnInit() {
    // Determine admin status
    const me: Me | null = this.auth.user;
    this.isAdmin = !!me && me.roles.map(r => r.toLowerCase()).includes('admin');

    // Fetch all users
    this.userService.getUsers()
      .pipe(
        switchMap(users => {
          this.users = users;
          if (!users.length) {
            return of([] as Array<{ userId: string; enrollments: Enrollment[] }>);
          }
          // For each user, fetch their enrollments
          const calls = users.map(u =>
            this.userService.listEnrollments(u.id)
              .pipe(map(enrs => ({ userId: u.id, enrollments: enrs })))
          );
          return forkJoin(calls);
        })
      )
      .subscribe({
        next: enrollResults => {
          // Store enrollments per user
          enrollResults.forEach(r => {
            this.userEnrollments[r.userId] = r.enrollments || [];
          });

          // Collect unique courseIds
          const courseIds = new Set<string>();
          enrollResults.forEach(r =>
            r.enrollments.forEach(e => courseIds.add(e.courseId))
          );
          if (courseIds.size === 0) {
            this.loading = false;
            return;
          }

          // Fetch each course to get its code
          const courseCalls = Array.from(courseIds).map(cid =>
            this.courseService.get(cid).pipe(
              map((c: Course) => ({ id: cid, code: c.code }))
            )
          );
          forkJoin(courseCalls).subscribe({
            next: courseArr => {
              courseArr.forEach(c => {
                this.courseCodeMap[c.id] = c.code;
              });
              this.loading = false;
            },
            error: err => {
              console.error('Error fetching courses:', err);
              this.error = err.message || 'Failed to load course codes';
              this.loading = false;
            }
          });
        },
        error: err => {
          console.error('Error fetching users or enrollments:', err);
          this.error = err.message || 'Failed to load users or enrollments';
          this.loading = false;
        }
      });
  }
}
