// src/app/activity-log-list/activity-log-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIf, NgForOf, DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { ActivityLogService, ActivityLogDB } from '../services/activity-log.service';
import { UserService, User } from '../services/user.service';
import { CourseService, Course } from '../services/course.service';
import { PostService, Post } from '../services/post.service';

interface RawActivityLog {
  _id: string;
  user_id: string;
  action: string;
  timestamp: string; // ISO string
  metadata?: { [key: string]: any };
}

interface CombinedData {
  rawLogs: RawActivityLog[];
  users: (User | null)[];
  courses: (Course | null)[];
  posts: (Post | null)[];
}

interface EnrichedLog {
  id: string;
  userName: string;
  actionLabel: string;
  timestamp: Date;
  details: string[];
}

@Component({
  selector: 'app-activity-log-list',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    DatePipe,
    TranslateModule
  ],
  templateUrl: './activity-log-list.component.html',
  styleUrls: ['./activity-log-list.component.css']
})
export class ActivityLogListComponent implements OnInit {
  logs: EnrichedLog[] = [];
  loading = false;
  error: string | null = null;

  // Map each action to its translation key. Actual values are looked up at runtime.
  private actionTranslationKeys: { [action: string]: string } = {
    login: 'ACTIVITY_LOG.ACTION.LOGIN',
    login_failed: 'ACTIVITY_LOG.ACTION.LOGIN_FAILED',
    view_course: 'ACTIVITY_LOG.ACTION.VIEW_COURSE',
    submit_homework: 'ACTIVITY_LOG.ACTION.SUBMIT_HOMEWORK',
    create_post: 'ACTIVITY_LOG.ACTION.CREATE_POST',
    update_post: 'ACTIVITY_LOG.ACTION.UPDATE_POST',
    delete_post: 'ACTIVITY_LOG.ACTION.DELETE_POST',
    pin_post: 'ACTIVITY_LOG.ACTION.PIN_POST',
    unpin_post: 'ACTIVITY_LOG.ACTION.UNPIN_POST',
    view_user: 'ACTIVITY_LOG.ACTION.VIEW_USER',
    view_own_profile: 'ACTIVITY_LOG.ACTION.VIEW_OWN_PROFILE',
    list_courses: 'ACTIVITY_LOG.ACTION.LIST_COURSES',
    view_post: 'ACTIVITY_LOG.ACTION.VIEW_POST'
    // …add more actions and their corresponding translation keys as needed
  };

  constructor(
    private activityLogSvc: ActivityLogService,
    private userSvc: UserService,
    private courseSvc: CourseService,
    private postSvc: PostService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadLogs();
  }

  private loadLogs(): void {
    this.loading = true;
    this.error = null;

    this.activityLogSvc.getAll().pipe(
      switchMap((rawLogsDB: ActivityLogDB[]): Observable<CombinedData> => {
        const logs = rawLogsDB as any as RawActivityLog[];

        if (logs.length === 0) {
          // No logs → return empty arrays so subscriber can handle empty state
          return of({
            rawLogs: [],
            users: [],
            courses: [],
            posts: []
          });
        }

        // Collect unique IDs
        const userIds = Array.from(new Set(logs.map(l => l.user_id)));
        const courseIds = Array.from(new Set(
          logs
            .map(l => l.metadata?.['course_id'])
            .filter(id => !!id) as string[]
        ));
        const postIds = Array.from(new Set(
          logs
            .map(l => l.metadata?.['post_id'])
            .filter(id => !!id) as string[]
        ));

        // Map post_id → course_id for posts lookup
        const postToCourse = new Map<string, string>();
        logs.forEach(l => {
          const pid = l.metadata?.['post_id'];
          const cid = l.metadata?.['course_id'];
          if (pid && cid) {
            postToCourse.set(pid, cid);
          }
        });

        // Fetch users
        const users$: Observable<(User | null)[]> = userIds.length
          ? forkJoin(
              userIds.map(id =>
                this.userSvc.getById(id).pipe(catchError(() => of(null)))
              )
            )
          : of([] as (User | null)[]);

        // Fetch courses
        const courses$: Observable<(Course | null)[]> = courseIds.length
          ? forkJoin(
              courseIds.map(id =>
                this.courseSvc.get(id).pipe(catchError(() => of(null)))
              )
            )
          : of([] as (Course | null)[]);

        // Fetch posts (need both post_id and its course_id)
        const posts$: Observable<(Post | null)[]> = postIds.length
          ? forkJoin(
              postIds.map(pid => {
                const cid = postToCourse.get(pid);
                if (!cid) {
                  return of(null as Post | null);
                }
                return this.postSvc.get(cid, pid).pipe(catchError(() => of(null)));
              })
            )
          : of([] as (Post | null)[]);

        return forkJoin({
          rawLogs: of(logs),
          users: users$,
          courses: courses$,
          posts: posts$
        });
      }),
      catchError(() => {
        // If the initial fetch fails, return an empty CombinedData so subscriber sees no data
        return of({
          rawLogs: [] as RawActivityLog[],
          users: [] as (User | null)[],
          courses: [] as (Course | null)[],
          posts: [] as (Post | null)[]
        });
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (data: CombinedData) => {
        const { rawLogs, users, courses, posts } = data;

        // Build lookup maps
        const userMap = new Map<string, User>();
        users.forEach(u => {
          if (u) {
            userMap.set(u.id, u);
          }
        });

        const courseMap = new Map<string, Course>();
        courses.forEach(c => {
          if (c) {
            courseMap.set(c.id, c);
          }
        });

        const postMap = new Map<string, Post>();
        posts.forEach(p => {
          if (p) {
            postMap.set(p._id, p);
          }
        });

        // Transform raw logs into enriched logs
        const enriched: EnrichedLog[] = rawLogs.map(l =>
          this.toEnrichedLog(l, userMap, courseMap, postMap)
        );

        // Sort descending by timestamp
        this.logs = enriched.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
      },
      error: () => {
        // Use a translation key for the generic error message
        this.error = this.translate.instant('ACTIVITY_LOG.ERROR_LOADING');
      }
    });
  }

  private toEnrichedLog(
    raw: RawActivityLog,
    userMap: Map<string, User>,
    courseMap: Map<string, Course>,
    postMap: Map<string, Post>
  ): EnrichedLog {
    // 1) Resolve user name
    const userObj = userMap.get(raw.user_id) || null;
    const userName = userObj
      ? `${userObj.profile.firstName} ${userObj.profile.lastName}`.trim()
      : this.translate.instant('ACTIVITY_LOG.UNKNOWN_USER');

    // 2) Resolve action label via translation key
    const actionKey = this.actionTranslationKeys[raw.action];
    const actionLabel = actionKey
      ? this.translate.instant(actionKey)
      : raw.action;

    // 3) Parse timestamp
    const timestamp = new Date(raw.timestamp);

    // 4) Build details array
    const details: string[] = [];
    if (raw.metadata) {
      const meta = raw.metadata;

      // Course detail
      const cid = meta['course_id'];
      if (cid) {
        const c = courseMap.get(cid) || null;
        if (c) {
          // Use a translation key with parameter for course title
          details.push(
            this.translate.instant('ACTIVITY_LOG.DETAIL.COURSE', { title: c.title })
          );
        } else {
          details.push(
            this.translate.instant('ACTIVITY_LOG.DETAIL.COURSE_ID', { id: cid })
          );
        }
      }

      // Post detail
      const pid = meta['post_id'];
      if (pid) {
        const p = postMap.get(pid) || null;
        if (p) {
          details.push(
            this.translate.instant('ACTIVITY_LOG.DETAIL.POST', { title: p.title })
          );
        } else {
          details.push(
            this.translate.instant('ACTIVITY_LOG.DETAIL.POST_ID', { id: pid })
          );
        }
      }

      // Submission detail
      const sid = meta['submission_id'];
      if (sid) {
        details.push(
          this.translate.instant('ACTIVITY_LOG.DETAIL.SUBMISSION_ID', { id: sid })
        );
      }

      // Any additional metadata keys
      Object.keys(meta).forEach(key => {
        if (!['course_id', 'post_id', 'submission_id'].includes(key)) {
          details.push(
            `${this.translate.instant(`ACTIVITY_LOG.DETAIL.${key.toUpperCase()}`) || this.humanizeKey(key)}: ${meta[key]}`
          );
        }
      });
    }

    return {
      id: raw._id,
      userName,
      actionLabel,
      timestamp,
      details
    };
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}
