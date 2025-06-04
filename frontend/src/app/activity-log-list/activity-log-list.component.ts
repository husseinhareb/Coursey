// src/app/activity-log-list/activity-log-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe, NgIf, NgForOf } from '@angular/common';
import { Observable, of, forkJoin } from 'rxjs';
import { tap, switchMap, catchError, finalize } from 'rxjs/operators';
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
  imports: [CommonModule, NgIf, NgForOf, DatePipe],
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
    view_user: 'Consultation utilisateur',
    view_own_profile: 'Consultation de son profil',
    list_courses: 'Liste des cours',
    view_post: 'Consultation de post'
    // … ajoutez d’autres actions custom si nécessaire
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
      switchMap((rawLogs: ActivityLogDB[]): Observable<CombinedData> => {
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
        const courseIds: string[] = Array.from(
          new Set(
            logs
              .map(l => l.metadata?.['course_id'])
              .filter(id => !!id) as string[]
          )
        );
        const postIds: string[] = Array.from(
          new Set(
            logs
              .map(l => l.metadata?.['post_id'])
              .filter(id => !!id) as string[]
          )
        );

        const postToCourse = new Map<string, string>();
        logs.forEach(l => {
          const pid = l.metadata?.['post_id'];
          const cid = l.metadata?.['course_id'];
          if (pid && cid) {
            postToCourse.set(pid, cid);
          }
        });

        const users$: Observable<(User | null)[]> = userIds.length
          ? forkJoin(
            userIds.map(id =>
              this.userSvc.getById(id).pipe(
                catchError(() => of(null))
              )
            )
          )
          : of([] as (User | null)[]);

        const courses$: Observable<(Course | null)[]> = courseIds.length
          ? forkJoin(
            courseIds.map(id =>
              this.courseSvc.get(id).pipe(
                catchError(() => of(null))
              )
            )
          )
          : of([] as (Course | null)[]);

        const posts$: Observable<(Post | null)[]> = postIds.length
          ? forkJoin(
            postIds.map(pid => {
              const cid = postToCourse.get(pid);
              if (!cid) {
                return of(null as Post | null);
              }
              return this.postSvc.get(cid, pid).pipe(
                catchError(() => of(null))
              );
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

        const enriched: EnrichedLog[] = rawLogs.map((l: RawActivityLog) =>
          this.toEnrichedLog(l, userMap, courseMap, postMap)
        );

        this.logs = enriched.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
      },
      error: () => {
        this.error = 'Impossible de charger les logs d’activité.';
      }
    });
  }



  private toEnrichedLog(
    raw: RawActivityLog,
    userMap: Map<string, User>,
    courseMap: Map<string, Course>,
    postMap: Map<string, Post>
  ): EnrichedLog {
    // 1) Récupérer le User
    const userObj = userMap.get(raw.user_id) || null;
    // 2) Construire userName = "Prénom Nom"
    const userName = userObj
      ? `${userObj.profile.firstName} ${userObj.profile.lastName}`.trim()
      : '—';

    // 3) Libellé de l’action
    const actionLabel = this.actionLabels[raw.action] || raw.action;

    // 4) Transformer timestamp en Date
    const timestamp = new Date(raw.timestamp);

    // 5) Construire les détails selon `metadata`
    const details: string[] = [];
    if (raw.metadata) {
      const meta = raw.metadata;

      // Si metadata contient course_id
      const cid = meta['course_id'];
      if (cid) {
        const c = courseMap.get(cid) || null;
        details.push(c ? `Cours : ${c.title}` : `Cours (ID) : ${cid}`);
      }

      // Si metadata contient post_id
      const pid = meta['post_id'];
      if (pid) {
        const p = postMap.get(pid) || null;
        details.push(p ? `Post : ${p.title}` : `Post (ID) : ${pid}`);
      }

      // Si metadata contient submission_id
      const sid = meta['submission_id'];
      if (sid) {
        details.push(`Soumission (ID) : ${sid}`);
      }

      // Toute autre clé de metadata
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
