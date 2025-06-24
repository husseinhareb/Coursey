import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../environments/environment'; // updated path

import { CourseService, Course } from '../services/course.service';
import { AuthService, Me } from '../auth/auth.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  loading = false;
  error: string | null = null;
  isAdmin = false;

  constructor(
    private svc: CourseService,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Determine admin status
    const user: Me | null = this.auth.user;
    this.isAdmin = !!user && user.roles
      .map(r => r.toLowerCase())
      .includes('admin');

    // Load courses
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.error = null;

    this.svc.list().subscribe({
      next: cs => {
        console.log('Courses loaded:', cs);
        this.courses = cs;
        this.loading = false;
      },
      error: err => {
        console.error('Error loading courses', err);
        this.error = err.error?.detail
          || err.message
          || 'Failed to load courses';
        this.loading = false;
      }
    });
  }

  /**
   * Build the header style: full URL, root-relative anchored to API base, or fallback color
   */
  getHeaderStyle(c: Course): { [key: string]: string } {
    const bg = c.background?.trim() || '';
    const base = environment.apiUrl.replace(/\/+$/, '');
    if (bg) {
      // build a full URL whether it starts with http://, /, or neither:
      const url = /^https?:\/\//.test(bg)
        ? bg
        : bg.startsWith('/')
          ? `${base}/${bg.slice(1)}`
          : `${base}/${bg}`;
      return {
        'background-image': `url('${url}')`,
        'background-size': 'cover',
        'background-position': 'center center'
      };
    }
    // still fall back to a solid color if bg is really empty
    return { 'background-color': 'var(--color-primary)' };
  }


  edit(id: string): void {
    if (!this.isAdmin) return;
    this.router.navigate(['/courses', id, 'edit']);
  }

  delete(id: string): void {
    if (!this.isAdmin) return;
    if (!confirm('Are you sure you want to delete this course?')) return;

    this.svc.delete(id).subscribe({
      next: () => this.fetch(),
      error: err => {
        console.error('Error deleting course', err);
        this.error = err.error?.detail || 'Delete failed';
      }
    });
  }
}
