import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

import { CourseService, Course } from '../services/course.service';
import { UserService, Access } from '../services/user.service';

interface RecentCourse extends Course {
  accessedAt: Date;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private courseSvc = inject(CourseService);
  private userSvc   = inject(UserService);

  // Header/search
  searchQuery     = '';
  isAdmin         = false; // TODO: wire real admin check via AuthService

  // Full courses list
  courses: Course[]     = [];
  loading: boolean      = false;
  error: string | null  = null;

  // Recent courses
  recentCourses: RecentCourse[] = [];
  loadingRecents: boolean       = false;
  // we no longer show an error message; 404 just means “no recents”
  errorRecents: string | null   = null;

  ngOnInit(): void {
    this.loadCourses();
    this.loadRecents();
  }

  private loadCourses(): void {
    this.loading = true;
    this.error   = null;

    this.courseSvc.list().subscribe({
      next: cs => {
        this.courses = cs;
        this.loading = false;
      },
      error: e => {
        this.error   = e.error?.detail || 'Failed to load courses';
        this.loading = false;
      }
    });
  }

  private loadRecents(): void {
    this.loadingRecents = true;
    this.errorRecents   = null;

    this.userSvc.getRecentAccesses().pipe(
      // Treat 404 as “no recents”
      catchError(err => {
        if (err.status === 404) {
          return of([] as Access[]);
        }
        return throwError(() => err);
      }),
      switchMap((accesses: Access[]) => {
        if (!accesses.length) {
          return of([] as RecentCourse[]);
        }
        return forkJoin(
          accesses.map(a =>
            this.courseSvc.get(a.courseId).pipe(
              map(c => ({ 
                ...c, 
                accessedAt: new Date(a.accessedAt) 
              } as RecentCourse)),
              catchError(() => of(null)) // skip missing courses
            )
          )
        ).pipe(
          // filter out any nulls if a course lookup failed
          map(results => results.filter((c): c is RecentCourse => !!c))
        );
      }),
      catchError(err => {
        // for any non-404 error, we log and suppress the error
        console.error('Failed to load recents:', err);
        return of([] as RecentCourse[]);
      })
    )
    .subscribe(list => {
      this.recentCourses  = list;
      this.loadingRecents = false;
    });
  }

  /** Compute background-image for course card */
  getHeaderStyle(c: Course): { [key: string]: string } {
    const url = (c as any).imageUrl || '';
    return url ? { 'background-image': `url(${url})` } : {};
  }

  /** Filter by searchQuery */
  get filteredCourses(): Course[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.courses;
    return this.courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.code?.toLowerCase().includes(q))
    );
  }
}
