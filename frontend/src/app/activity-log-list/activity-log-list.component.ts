// src/app/activity-log-list/activity-log-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
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
  timestamp: string;
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
  userId: string;
  userName: string;
  actionLabel: string;
  timestamp: Date;
  details: string[];
}

interface LogGroup {
  userId: string;
  userName: string;
  logs: EnrichedLog[];
  expanded: boolean;
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
  groups: LogGroup[] = [];
  loading = false;
  error: string | null = null;

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
  };

  constructor(
    private activityLogSvc: ActivityLogService,
    private userSvc: UserService,
    private courseSvc: CourseService,
    private postSvc: PostService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  toggleGroup(idx: number) {
    this.groups[idx].expanded = !this.groups[idx].expanded;
  }

  private loadLogs(): void {
    this.loading = true;
    this.error = null;

    this.activityLogSvc.getAll().pipe(
      switchMap((rawDB: ActivityLogDB[]): Observable<CombinedData> => {
        const rawLogs = rawDB as any as RawActivityLog[];
        if (!rawLogs.length) {
          return of({ rawLogs: [], users: [], courses: [], posts: [] });
        }

        const userIds   = Array.from(new Set(rawLogs.map(l => l.user_id)));
        const courseIds = Array.from(new Set(
          rawLogs.map(l => l.metadata?.['course_id']).filter(id => !!id) as string[]
        ));
        const postIds   = Array.from(new Set(
          rawLogs.map(l => l.metadata?.['post_id']).filter(id => !!id) as string[]
        ));

        // Map post→course
        const postToCourse = new Map<string,string>();
        rawLogs.forEach(l => {
          const pid = l.metadata?.['post_id'], cid = l.metadata?.['course_id'];
          if (pid && cid) postToCourse.set(pid, cid);
        });

        const users$ = userIds.length
          ? forkJoin(userIds.map(id =>
              this.userSvc.getById(id).pipe(catchError(() => of(null)))
            ))
          : of([] as (User|null)[]);

        const courses$ = courseIds.length
          ? forkJoin(courseIds.map(id =>
              this.courseSvc.get(id).pipe(catchError(() => of(null)))
            ))
          : of([] as (Course|null)[]);

        const posts$ = postIds.length
          ? forkJoin(postIds.map(pid => {
              const cid = postToCourse.get(pid);
              return cid
                ? this.postSvc.get(cid, pid).pipe(catchError(() => of(null)))
                : of(null);
            }))
          : of([] as (Post|null)[]);

        return forkJoin({ rawLogs: of(rawLogs), users: users$, courses: courses$, posts: posts$ });
      }),
      catchError(() => of({
        rawLogs: [] as RawActivityLog[],
        users:   [] as (User|null)[],
        courses: [] as (Course|null)[],
        posts:   [] as (Post|null)[]
      })),
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ rawLogs, users, courses, posts }) => {
        // Build lookup maps
        const userMap   = new Map<string,User>();
        users.forEach(u => u && userMap.set(u.id, u));
        const courseMap = new Map<string,Course>();
        courses.forEach(c => c && courseMap.set(c.id, c));
        const postMap   = new Map<string,Post>();
        posts.forEach(p => p && postMap.set(p._id, p));

        // Enrich logs
        const enriched: EnrichedLog[] = rawLogs.map(l =>
          this.toEnrichedLog(l, userMap, courseMap, postMap)
        );

        // Group by user
        const groupsMap = new Map<string, EnrichedLog[]>();
        enriched.forEach(e => {
          const arr = groupsMap.get(e.userId) || [];
          arr.push(e);
          groupsMap.set(e.userId, arr);
        });

        // Build LogGroup[]
        this.groups = Array.from(groupsMap.entries()).map(([uid, logs]) => ({
          userId:   uid,
          userName: logs[0].userName,
          logs:     logs.sort((a,b)=> b.timestamp.getTime()-a.timestamp.getTime()),
          expanded: false
        }));
      },
      error: () => {
        this.error = this.translate.instant('ACTIVITY_LOG.ERROR_LOADING');
      }
    });
  }

  private toEnrichedLog(
    raw: RawActivityLog,
    userMap: Map<string,User>,
    courseMap: Map<string,Course>,
    postMap: Map<string,Post>
  ): EnrichedLog {
    const u = userMap.get(raw.user_id) || null;
    const userName = u
      ? `${u.profile.firstName} ${u.profile.lastName}`.trim()
      : this.translate.instant('ACTIVITY_LOG.UNKNOWN_USER');

    const actionKey   = this.actionTranslationKeys[raw.action];
    const actionLabel = actionKey
      ? this.translate.instant(actionKey)
      : raw.action;

    const ts = new Date(raw.timestamp);
    const details: string[] = [];

    if (raw.metadata) {
      const m = raw.metadata;
      // course detail
      if (m['course_id']) {
        const c = courseMap.get(m['course_id']);
        details.push(
          c
            ? this.translate.instant('ACTIVITY_LOG.DETAIL.COURSE', { title: c.title })
            : this.translate.instant('ACTIVITY_LOG.DETAIL.COURSE_ID', { id: m['course_id'] })
        );
      }
      // post detail
      if (m['post_id']) {
        const p = postMap.get(m['post_id']);
        details.push(
          p
            ? this.translate.instant('ACTIVITY_LOG.DETAIL.POST', { title: p.title })
            : this.translate.instant('ACTIVITY_LOG.DETAIL.POST_ID', { id: m['post_id'] })
        );
      }
      // submission detail
      if (m['submission_id']) {
        details.push(
          this.translate.instant('ACTIVITY_LOG.DETAIL.SUBMISSION_ID', { id: m['submission_id'] })
        );
      }
      // any other metadata
      Object.keys(m).forEach(k => {
        if (!['course_id','post_id','submission_id'].includes(k)) {
          const keyLabel = this.translate.instant(`ACTIVITY_LOG.DETAIL.${k.toUpperCase()}`)
            || this.humanizeKey(k);
          details.push(`${keyLabel}: ${m[k]}`);
        }
      });
    }

    return {
      id:          raw._id,
      userId:      raw.user_id,
      userName,
      actionLabel,
      timestamp:   ts,
      details
    };
  }

  private humanizeKey(key: string): string {
    return key.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
  }
}
