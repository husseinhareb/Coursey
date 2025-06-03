// src/app/activity-log-list/activity-log-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

import { ActivityLogService, ActivityLogDB } from '../services/activity-log.service';
import { UserService, User } from '../services/user.service';
import { CourseService, Course } from '../services/course.service';
import { PostService, Post } from '../services/post.service';

interface RawActivityLog {
  _id: string;
  user_id: string;
  action: string;
  timestamp: string; // ISO
  metadata?: { [key: string]: any };
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
  imports: [CommonModule],
  templateUrl: './activity-log-list.component.html',
  styleUrls: ['./activity-log-list.component.css']
})
export class ActivityLogListComponent implements OnInit {
  logs: EnrichedLog[] = [];
  loading = false;
  error: string | null = null;

  private actionLabels: { [key: string]: string } = {
    login: 'Connexion',
    login_failed: 'Échec de connexion',
    view_course: 'Consultation de cours',
    submit_homework: 'Soumission de devoir',
    create_post: 'Création de post',
    update_post: 'Mise à jour de post',
    delete_post: 'Suppression de post',
    pin_post: 'Épingler un post',
    unpin_post: 'Désépingler un post',
    // ↪ ajouter d’autres actions si nécessaire
  };

  constructor(
    private activityLogSvc: ActivityLogService,
    private userSvc: UserService,
    private courseSvc: CourseService,
    private postSvc: PostService
  ) { }

  ngOnInit(): void {
    this.loadLogs();
  }

  private loadLogs(): void {
    this.loading = true;
    this.error = null;

    this.activityLogSvc.getAll().pipe(
      switchMap((rawLogs: ActivityLogDB[]) => {
        const logs: RawActivityLog[] = rawLogs as any;

        if (!logs.length) {
          return of({
            rawLogs: [] as RawActivityLog[],
            users: [] as (User | null)[],
            courses: [] as (Course | null)[],
            posts: [] as (Post | null)[]
          });
        }

        const userIds: string[] = Array.from(new Set(logs.map(l => l.user_id)));
        const courseIds: string[] = Array.from(new Set(
          logs
            .map(l => l.metadata?.['course_id'])
            .filter(id => !!id) as string[]
        ));
        const postIds: string[] = Array.from(new Set(
          logs
            .map(l => l.metadata?.['post_id'])
            .filter(id => !!id) as string[]
        ));

        const postToCourse = new Map<string, string>();
        logs.forEach(l => {
          const pid = l.metadata?.['post_id'];
          const cid = l.metadata?.['course_id'];
          if (pid && cid) {
            postToCourse.set(pid, cid);
          }
        });

        const users$: Observable<(User | null)[]> = forkJoin(
          userIds.map(id =>
            this.userSvc.getById(id).pipe(
              catchError(() => of(null))
            )
          )
        );

        const courses$: Observable<(Course | null)[]> = forkJoin(
          courseIds.map(id =>
            this.courseSvc.get(id).pipe(
              catchError(() => of(null))
            )
          )
        );

        const posts$: Observable<(Post | null)[]> = forkJoin(
          postIds.map(pid => {
            const cid = postToCourse.get(pid)!;
            return this.postSvc.get(cid, pid).pipe(
              catchError(() => of(null))
            );
          })
        );

        return forkJoin({
          rawLogs: of(logs),
          users: users$,
          courses: courses$,
          posts: posts$
        });
      }),
      map(data => {
        const { rawLogs, users, courses, posts } = data;

        const userMap = new Map<string, User>();
        users.forEach((u: User | null) => {
          if (u) {
            userMap.set(u.id, u);
          }
        });

        const courseMap = new Map<string, Course>();
        courses.forEach((c: Course | null) => {
          if (c) {
            courseMap.set(c.id, c);
          }
        });

        const postMap = new Map<string, Post>();
        posts.forEach((p: Post | null) => {
          if (p) {
            postMap.set(p._id, p);
          }
        });

        return rawLogs.map(
          (l: RawActivityLog) => this.toEnrichedLog(l, userMap, courseMap, postMap)
        );
      })
    )
      .subscribe({
        next: (enriched: EnrichedLog[]) => {
          this.logs = enriched.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Impossible de charger les logs d’activité.';
          this.loading = false;
        }
      });
  }

  private toEnrichedLog(
    raw: RawActivityLog,
    userMap: Map<string, User>,
    courseMap: Map<string, Course>,
    postMap: Map<string, Post>
  ): EnrichedLog {
    // 1) Look up the User object in our userMap
    const userObj = userMap.get(raw.user_id) || null;

    // 2) Build `userName` from profile.firstName + profile.lastName
    const userName = userObj
      ? `${userObj.profile.firstName} ${userObj.profile.lastName}`.trim()
      : '—'; // fallback if we didn’t find a user

    const actionLabel = this.actionLabels[raw.action] || raw.action;
    const timestamp = new Date(raw.timestamp);
    const details: string[] = [];

    if (raw.metadata) {
      const meta = raw.metadata;

      const cid = meta['course_id'];
      if (cid) {
        const c = courseMap.get(cid) || null;
        details.push(c ? `Cours : ${c.title}` : `Cours (ID) : ${cid}`);
      }

      const pid = meta['post_id'];
      if (pid) {
        const p = postMap.get(pid) || null;
        details.push(p ? `Post : ${p.title}` : `Post (ID) : ${pid}`);
      }

      const sid = meta['submission_id'];
      if (sid) {
        details.push(`Soumission (ID) : ${sid}`);
      }

      Object.keys(meta).forEach((key: string) => {
        if (key !== 'course_id' && key !== 'post_id' && key !== 'submission_id') {
          details.push(`${this.humanizeKey(key)} : ${meta[key]}`);
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
    return key.replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}
