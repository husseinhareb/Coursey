import { Component, OnInit }    from '@angular/core';
import { CommonModule }          from '@angular/common';
import { RouterModule, Router }  from '@angular/router';
import { TranslateModule }       from '@ngx-translate/core';

import { CourseService, Course } from '../services/course.service';
import { AuthService, Me }       from '../auth/auth.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.css'
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
  ) {}

  ngOnInit(): void {
    // Determine admin status
    const user: Me | null = this.auth.user;
    this.isAdmin = user?.roles
      .map(r => r.toLowerCase())
      .includes('admin') || false;

    // Load courses
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
        this.error = err.error?.detail
                   || err.message
                   || 'Failed to load courses';
        this.loading = false;
      }
    });
  }

  /** 
   * If background looks like an image URL → use as background-image,
   * otherwise treat as solid color
   */
  getHeaderStyle(c: Course): { [key: string]: string } {
    const b = c.background || '';
    const looksLikeImage = /\.(jpe?g|png|gif|svg)$/i.test(b)
                         || b.startsWith('http');
    if (looksLikeImage) {
      return {
        'background-image': `url(${b})`,
        'background-size':  'cover',
        'background-position': 'center'
      };
    }
    return {
      'background-color': b || 'var(--color-primary)'
    };
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
        this.error = err.error?.detail || 'Delete failed';
      }
    });
  }
}
