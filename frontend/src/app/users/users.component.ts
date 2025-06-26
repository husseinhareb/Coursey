import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { forkJoin, switchMap, map, of } from 'rxjs';

import { UserService, User, Enrollment } from '../services/user.service';
import { CourseService, Course } from '../services/course.service';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService, Me } from '../auth/auth.service';
import { TranslateService } from '@ngx-translate/core';
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

  userEnrollments: Record<string, Enrollment[]> = {};
  courseCodeMap: Record<string, string> = {};

  isAdmin = false;

  constructor(
    private userService: UserService,
    private courseService: CourseService,
    private auth: AuthService,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.isAdmin = this.auth.user?.roles
      .map(r => r.toLowerCase())
      .includes('admin') ?? false;

    this.loadUsersAndEnrollments();
  }

  private loadUsersAndEnrollments() {
    this.loading = true;
    this.userService.getUsers().pipe(
      switchMap(users => {
        this.users = users;
        if (!users.length) {
          return of([]);
        }
        return forkJoin(
          users.map(u =>
            this.userService.listEnrollments(u.id).pipe(
              map(enrs => ({ userId: u.id, enrollments: enrs }))
            )
          )
        );
      })
    ).subscribe({
      next: enrollResults => {
        enrollResults.forEach(r => {
          this.userEnrollments[r.userId] = r.enrollments || [];
        });

        const courseIds = new Set<string>();
        enrollResults.forEach(r =>
          r.enrollments.forEach(e => courseIds.add(e.courseId))
        );
        if (!courseIds.size) {
          this.loading = false;
          return;
        }

        forkJoin(
          Array.from(courseIds).map(cid =>
            this.courseService.get(cid).pipe(
              map(c => ({ id: cid, code: c.code }))
            )
          )
        ).subscribe({
          next: courseArr => {
            courseArr.forEach(c => this.courseCodeMap[c.id] = c.code);
            this.loading = false;
          },
          error: err => {
            console.error('Error fetching courses:', err);
            this.error = err.message || 'Failed to load courses';
            this.loading = false;
          }
        });
      },
      error: err => {
        console.error('Error loading users/enrollments:', err);
        this.error = err.message || 'Failed to load users';
        this.loading = false;
      }
    });
  }

  /**
   * Called when the admin clicks the "Delete user" button.
   */
  onDeleteUser(userId: string) {
    if (!this.isAdmin) return;

    // use ngx-translate instead of $localize
    const msg = this.translate.instant('USERS.CONFIRM_DELETE');
    if (!confirm(msg)) {
      return;
    }

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== userId);
        delete this.userEnrollments[userId];
      },
      error: err => {
        console.error('Error deleting user:', err);
        const errMsg = this.translate.instant('USERS.DELETE_FAILED', { error: err.message });
        alert(errMsg);
      }
    });
  }

}
