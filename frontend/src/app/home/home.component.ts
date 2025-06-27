// src/app/home/home.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, switchMap, map } from 'rxjs';

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
  errorRecents: string | null   = null;

  ngOnInit(): void {
    this.loadCourses();
    this.loadRecents();
  }

  private loadCourses(): void {
    this.loading = true;
    this.error   = null;
    this.courseSvc.list().subscribe({
      next: (cs: Course[]) => {
        this.courses = cs;
        this.loading = false;
      },
      error: (e: any) => {
        this.error   = e.error?.detail || 'Failed to load courses';
        this.loading = false;
      }
    });
  }

  private loadRecents(): void {
    this.loadingRecents = true;
    this.errorRecents   = null;
    this.userSvc.getRecentAccesses().pipe(
      switchMap((accesses: Access[]) => {
        if (!accesses.length) {
          this.loadingRecents = false;
          return of([]);
        }
        return forkJoin(
          accesses.map(a =>
            this.courseSvc.get(a.courseId).pipe(
              map(c => ({ ...c, accessedAt: new Date(a.accessedAt) } as RecentCourse))
            )
          )
        );
      })
    ).subscribe({
      next: (list: RecentCourse[]) => {
        this.recentCourses   = list;
        this.loadingRecents  = false;
      },
      error: (err: any) => {
        this.errorRecents    = err.error?.detail || 'Failed to load recent courses';
        this.loadingRecents  = false;
      }
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
