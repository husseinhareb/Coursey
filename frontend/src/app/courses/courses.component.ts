import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../environments/environment';

import { CourseService, Course } from '../services/course.service';
import { AuthService, Me } from '../auth/auth.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  loading = false;
  error: string | null = null;
  isAdmin = false;

  searchQuery = '';

  constructor(
    private svc: CourseService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user: Me | null = this.auth.user;
    this.isAdmin =
      !!user && user.roles.map(r => r.toLowerCase()).includes('admin');

    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.error = null;
    this.svc.list().subscribe({
      next: cs => {
        this.courses = cs;
        this.loading = false;
      },
      error: err => {
        this.error =
          err.error?.detail || err.message || 'Failed to load courses';
        this.loading = false;
      }
    });
  }

  get filteredCourses(): Course[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.courses;
    return this.courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }

  getHeaderStyle(c: Course): { [key: string]: string } {
    const bg = c.background?.trim() || '';
    const base = environment.apiUrl.replace(/\/+$/, '');
    if (bg) {
      const url = /^https?:\/\//.test(bg)
        ? bg
        : bg.startsWith('/')
        ? `${base}/${bg.slice(1)}`
        : `${base}/${bg}`;
      return {
        'background-image': `url('${url}')`,
        'background-size': 'cover',
        'background-position': 'center'
      };
    }
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
      error: err => (this.error = err.error?.detail || 'Delete failed')
    });
  }
}
