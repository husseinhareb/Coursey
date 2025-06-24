import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { TranslateModule }   from '@ngx-translate/core';
import { NgChartsModule }    from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

import {
  DashboardOverview,
  AdminOverview,
  TeacherOverview
} from '../services/dashboard.service';
import { DashboardService }  from '../services/dashboard.service';
import { AuthService, Me }   from '../auth/auth.service';

import { UserService, Enrollment } from '../services/user.service';
import { CourseService, Course }   from '../services/course.service';

import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgChartsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  overview?: DashboardOverview;
  loading = true;
  error: string | null = null;
  role!: 'admin' | 'teacher' | 'student';

  // STUDENT view
  enrolledCourses: Array<{ code: string; title: string; progress: number }> = [];

  // TEACHER view
  teacherCourses: Array<{ code: string; title: string; enrolledCount: number }> = [];

  // ADMIN view
  adminTotals = { users: 0, courses: 0, posts: 0 };
  submissionsData: ChartData<'doughnut', number[], string> = {
    labels: [], datasets: [{ data: [] }]
  };
  submissionsOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };
  activityChartData: ChartData<'bar', number[], string> = {
    labels: [], datasets: [{ data: [], label: 'Actions' }]
  };
  activityOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Action' } },
      y: { title: { display: true, text: 'Count' }, beginAtZero: true }
    }
  };

  constructor(
    private svc: DashboardService,
    public auth: AuthService,
    private userService: UserService,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    const u: Me | null = this.auth.user;
    if (!u) {
      this.error = 'Accès interdit';
      this.loading = false;
      return;
    }

    // figure out the real user‐ID field (common backends use `_id`)
    const userId = (u as any)._id || (u as any).id;
    if (!userId) {
      console.error('DashboardComponent: no user id found on auth.user', u);
      this.error = 'Impossible de déterminer l’identifiant utilisateur';
      this.loading = false;
      return;
    }

    this.svc.getOverview().subscribe({
      next: data => {
        this.overview = data;
        this.role     = data.role;
        this.loading  = false;

        // STUDENT: load their enrollments → fetch each course
        if (this.role === 'student') {
          this.userService.listEnrollments(userId).pipe(
            switchMap((enrs: Enrollment[]) => {
              if (!enrs.length) return of([]);
              const calls = enrs.map(e =>
                this.courseService.get(e.courseId).pipe(
                  map((c: Course) => ({
                    code: c.code,
                    title: c.title,
                    progress: (e as any).progress ?? 0
                  }))
                )
              );
              return forkJoin(calls);
            })
          ).subscribe({
            next: courses => this.enrolledCourses = courses,
            error: err     => {
              console.error('Failed loading student courses', err);
              // optionally set this.error here
            }
          });
        }

        // TEACHER: map coursesCreated into a simple array
        if (this.role === 'teacher') {
          const t = data as TeacherOverview;
          this.teacherCourses = t.coursesCreated.map(c => ({
            code: c.code,
            title: c.title,
            enrolledCount: c.enrolledCount
          }));
        }

        // ADMIN: totals + chart data
        if (this.role === 'admin') {
          const a = data as AdminOverview;
          this.adminTotals = { ...a.totals };
          this.submissionsData.labels = Object.keys(a.submissions);
          this.submissionsData.datasets[0].data = Object.values(a.submissions);
          this.activityChartData.labels = Object.keys(a.activityLast7Days);
          this.activityChartData.datasets[0].data = Object.values(a.activityLast7Days);
        }
      },
      error: err => {
        this.error   = err.message || 'Erreur chargement';
        this.loading = false;
      }
    });
  }
}
