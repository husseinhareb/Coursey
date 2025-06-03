// src/app/users/users.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }           from '@angular/common';
import { HttpClientModule }       from '@angular/common/http';
import { RouterModule }           from '@angular/router';
import { forkJoin, switchMap, map, of } from 'rxjs';

import { UserService, User, Enrollment } from '../services/user.service';
import { CourseService, Course }        from '../services/course.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule    // ← so that [routerLink] works
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  /**
   * After we call listEnrollments(u.id), we store each user’s list of Enrollment[] here.
   * Key = user ID, Value = array of Enrollment objects
   */
  userEnrollments: Record<string, Enrollment[]> = {};

  /** 
   * After we fetch each Course in step #3, we build a lookup:
   *   courseCodeMap[courseId] = course.code
   */
  courseCodeMap: Record<string,string> = {};

  constructor(
    private userService: UserService,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    // Step 1: Fetch all users
    this.userService.getUsers()
      .pipe(
        switchMap(users => {
          this.users = users;

          if (!users.length) {
            // No users → skip directly to “done”
            return of([] as Array<{ userId: string; enrollments: Enrollment[] }>);
          }

          // Step 2: For each user, fetch their enrollments
          const enrollCalls = users.map(u =>
            this.userService
              .listEnrollments(u.id)
              .pipe(map(enrs => ({ userId: u.id, enrollments: enrs })))
          );

          // forkJoin waits for all listEnrollments(...) to complete
          return forkJoin(enrollCalls);
        })
      )
      .subscribe({
        next: (enrollResults) => {
          // enrollResults is Array<{ userId, enrollments }>
          enrollResults.forEach(r => {
            this.userEnrollments[r.userId] = r.enrollments || [];
          });

          // Step 3a: Collect every distinct courseId from all users’ Enrollment[]
          const allCourseIds = new Set<string>();
          enrollResults.forEach(r => {
            r.enrollments.forEach(e => {
              allCourseIds.add(e.courseId);
            });
          });

          // If no one is enrolled anywhere, we’re done:
          if (allCourseIds.size === 0) {
            this.loading = false;
            return;
          }

          // Step 3b: Fetch each unique course exactly once, to get its “code”
          const courseCalls = Array.from(allCourseIds).map(cid =>
            this.courseService.get(cid).pipe(
              map((course: Course) => ({ id: cid, code: course.code }))
            )
          );

          forkJoin(courseCalls).subscribe({
            next: (courseArr) => {
              // courseArr is Array<{ id, code }>
              courseArr.forEach(c => {
                this.courseCodeMap[c.id] = c.code;
              });
              this.loading = false;
            },
            error: (err) => {
              console.error('Error fetching courses:', err);
              this.error = err.message || 'Failed to load course codes';
              this.loading = false;
            }
          });
        },
        error: (err) => {
          console.error('Error fetching users or enrollments:', err);
          this.error = err.message || 'Failed to load users or enrollments';
          this.loading = false;
        }
      });
  }
}
