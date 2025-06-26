import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

import {
  DashboardOverview,
  AdminOverview,
  TeacherOverview
} from '../services/dashboard.service';
import { DashboardService } from '../services/dashboard.service';
import { AuthService, Me } from '../auth/auth.service';

import { UserService, Enrollment } from '../services/user.service';
import { CourseService, Course } from '../services/course.service';
import { ForumService } from '../services/forum.service';
import { PostService } from '../services/post.service';
import { CompletionService, Completion } from '../services/completion.service';

import { forkJoin, of, Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

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
  homeworksDue = 0;
  avgCompletion = 0;
  studentProgressChartData: ChartData<'pie', number[], string> = {
    labels: [], datasets: [{ data: [] }]
  };

  // TEACHER view
  teacherCourses: Array<{ code: string; title: string; enrolledCount: number }> = [];
  teacherForumsCount = 0;
  teacherForumMessagesCount = 0;
  teacherEnrollChartData: ChartData<'bar', number[], string> = {
    labels: [], datasets: [{ data: [], label: 'Students' }]
  };
  teacherEnrollOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: { y: { beginAtZero: true } }
  };

  // ADMIN view
  adminTotals = { users: 0, courses: 0, posts: 0 };
  adminForumsCount = 0;
  adminForumMessagesCount = 0;
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
    private courseService: CourseService,
    private forumService: ForumService,
    private postService: PostService,
    private completionService: CompletionService
  ) { }

  ngOnInit() {
    const u: Me | null = this.auth.user;
    if (!u) {
      this.error = 'Access denied';
      this.loading = false;
      return;
    }

    const userId = (u as any)._id || (u as any).id;
    if (!userId) {
      this.error = 'Unable to determine user ID';
      this.loading = false;
      return;
    }

    this.svc.getOverview().subscribe({
      next: (overview: DashboardOverview) => {
        this.overview = overview;
        this.role = overview.role;
        this.loading = false;

        if (this.role === 'admin') {
          this.setupAdmin(overview as AdminOverview);
        } else if (this.role === 'teacher') {
          this.setupTeacher(overview as TeacherOverview);
        } else {
          this.setupStudent(userId);
        }
      },
      error: err => {
        console.error(err);
        this.error = err.message || 'Error loading dashboard';
        this.loading = false;
      }
    });
  }

  private setupAdmin(a: AdminOverview) {
    this.adminTotals = { ...a.totals };
    this.submissionsData = {
      labels: Object.keys(a.submissions),
      datasets: [{ data: Object.values(a.submissions) }]
    };
    this.activityChartData = {
      labels: Object.keys(a.activityLast7Days),
      datasets: [{ data: Object.values(a.activityLast7Days), label: 'Actions' }]
    };

    this.courseService.list().subscribe((all: Course[]) => {
      this.adminTotals.courses = all.length;
    });

    this.courseService.list().pipe(
      switchMap((courses: Course[]) => {
        const forums$ = forkJoin(
          courses.map(c =>
            this.forumService.listTopics(c.id).pipe(
              map(ts => ts.length),
              catchError(() => of(0))
            )
          )
        ).pipe(map(arr => arr.reduce((sum, n) => sum + n, 0)));

        const messages$ = forkJoin(
          courses.map(c =>
            this.forumService.listTopics(c.id).pipe(
              switchMap(ts =>
                ts.length
                  ? forkJoin(
                      ts.map(t =>
                        this.forumService.getTopic(c.id, t._id).pipe(
                          map(topic => topic.messages.length),
                          catchError(() => of(0))
                        )
                      )
                    )
                  : of([] as number[])
              ),
              map(arr => arr.reduce((sum, n) => sum + n, 0)),
              catchError(() => of(0))
            )
          )
        ).pipe(map(arr => arr.reduce((sum, n) => sum + n, 0)));

        return forkJoin([forums$, messages$]);
      })
    ).subscribe({
      next: ([fCount, mCount]: [number, number]) => {
        this.adminForumsCount = fCount;
        this.adminForumMessagesCount = mCount;
      },
      error: err => console.error(err)
    });
  }

  private setupTeacher(t: TeacherOverview) {
    this.teacherCourses = t.coursesCreated.map(c => ({
      code: c.code,
      title: c.title,
      enrolledCount: c.enrolledCount
    }));

    this.teacherEnrollChartData = {
      labels: this.teacherCourses.map(c => c.code),
      datasets: [{ label: 'Students', data: this.teacherCourses.map(c => c.enrolledCount) }]
    };

    forkJoin([
      // total forums
      forkJoin(
        this.teacherCourses.map(tc =>
          this.forumService.listTopics(tc.code).pipe(
            map(ts => ts.length),
            catchError(() => of(0))
          )
        )
      ).pipe(map(arr => arr.reduce((sum, n) => sum + n, 0))),
      // total messages
      forkJoin(
        this.teacherCourses.map(tc =>
          this.forumService.listTopics(tc.code).pipe(
            switchMap(ts =>
              ts.length
                ? forkJoin(
                    ts.map(topic =>
                      this.forumService.getTopic(tc.code, topic._id).pipe(
                        map(t => t.messages.length),
                        catchError(() => of(0))
                      )
                    )
                  )
                : of([] as number[])
            ),
            map(arr => arr.reduce((sum, n) => sum + n, 0)),
            catchError(() => of(0))
          )
        )
      ).pipe(map(arr => arr.reduce((sum, n) => sum + n, 0)))
    ]).subscribe({
      next: ([fCount, mCount]: [number, number]) => {
        this.teacherForumsCount = fCount;
        this.teacherForumMessagesCount = mCount;
      },
      error: err => console.error(err)
    });
  }

  private setupStudent(userId: string) {
  this.userService.listEnrollments(userId).pipe(
    switchMap((enrs: Enrollment[]) => {
      if (!enrs.length) {
        return of([] as Array<{ courseId: string; due: number; progress: number }>);
      }
      return forkJoin(
        enrs.map(e =>
          forkJoin({
            posts: this.postService.list(e.courseId),
            completions: this.completionService.getCompletions(e.courseId)
          }).pipe(
            map(({ posts, completions }) => {
              // Only homework posts
              const hwPosts = posts.filter(p => p.type === 'homework');
              const totalHw = hwPosts.length;
              // Count how many of those the student has marked complete
              const doneHw = completions.filter(c =>
                hwPosts.some(p => p._id === c.post_id)
              ).length;

              return {
                courseId: e.courseId,
                // now due = uncompleted homeworks
                due: totalHw - doneHw,
                progress: totalHw > 0 ? (doneHw / totalHw) * 100 : 0
              };
            }),
            catchError(() =>
              of({ courseId: e.courseId, due: 0, progress: 0 })
            )
          )
        )
      );
    })
  ).subscribe({
    next: (items) => {
      // Sum uncompleted homeworks across all courses
      this.homeworksDue = items.reduce((sum, x) => sum + x.due, 0);

      // Average percent complete remains the same
      this.avgCompletion = items.length
        ? items.reduce((sum, x) => sum + x.progress, 0) / items.length
        : 0;

      this.studentProgressChartData = {
        labels:   items.map((_, i) => `#${i + 1}`),
        datasets: [{ data: items.map(x => x.progress) }]
      };

      if (items.length) {
        forkJoin(items.map(x => this.courseService.get(x.courseId)))
          .subscribe((courses: Course[]) => {
            this.enrolledCourses = courses.map((c, i) => ({
              code:     c.code,
              title:    c.title,
              progress: items[i].progress
            }));
          }, err => console.error(err));
      } else {
        this.enrolledCourses = [];
      }
    },
    error: err => console.error(err)
  });
}

}
