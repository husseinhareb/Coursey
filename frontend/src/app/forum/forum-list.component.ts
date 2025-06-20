// src/app/forum-list/forum-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule }   from '@ngx-translate/core';

import { forkJoin, of }      from 'rxjs';
import { catchError }        from 'rxjs/operators';

import { ForumService, ForumTopic, NewTopic } from '../services/forum.service';
import { AuthService, Me }                   from '../auth/auth.service';
import { UserService, User }                 from '../services/user.service';
import { Enrollment }                        from '../services/user.service';

@Component({
  selector: 'app-forum-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './forum-list.component.html',
  styleUrls: ['./forum-list.component.css']
})
export class ForumListComponent implements OnInit {
  courseId!: string;
  topics: ForumTopic[] = [];
  loading = false;
  error: string | null = null;

  showNewTopicForm = false;
  newTopicForm: FormGroup;

  currentUser: Me | null = null;
  canCreateTopic = false;

  /** Map topic.author_id → "First Last" */
  authorNames: Record<string, string> = {};

  /** Map topic._id → message count */
  messageCounts: Record<string, number> = {};

  constructor(
    private forumSvc: ForumService,
    private userSvc: UserService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {
    this.newTopicForm = this.fb.group({
      title: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // 1. Get courseId from URL
    const cid = this.route.snapshot.paramMap.get('id');
    if (!cid) {
      this.error = 'Missing course ID';
      return;
    }
    this.courseId = cid;

    // 2. Subscribe to current user for permission logic
    this.auth.user$.subscribe({
      next: user => {
        this.currentUser = user;
        this.computeCanCreateTopic();
      },
      error: () => {
        this.currentUser = null;
        this.computeCanCreateTopic();
      }
    });

    // 3. Load forum topics
    this.loadTopics();
  }

  private computeCanCreateTopic(): void {
    if (!this.currentUser) {
      this.canCreateTopic = false;
      return;
    }
    const roles = this.currentUser.roles.map(r => r.toLowerCase());
    if (!roles.includes('teacher')) {
      this.canCreateTopic = false;
      return;
    }
    // Ensure user is enrolled in this course
    const enrolled = (this.currentUser.enrollments as Enrollment[])
      .some(e => e.courseId === this.courseId);
    this.canCreateTopic = enrolled;
  }

  loadTopics(): void {
    this.loading = true;
    this.error   = null;

    this.forumSvc.listTopics(this.courseId).subscribe({
      next: topics => {
        this.topics = topics;
        this.populateAuthorNames();
        this.populateMessageCounts();
        this.loading = false;
      },
      error: err => {
        this.error   = err.error?.detail || 'Failed to load topics';
        this.loading = false;
      }
    });
  }

  /** Fetch and cache each topic creator’s display name */
  private populateAuthorNames(): void {
    const ids = Array.from(new Set(this.topics.map(t => t.author_id)));
    if (!ids.length) return;

    forkJoin(
      ids.map(id =>
        this.userSvc.getById(id).pipe(
          catchError(() => of({ profile: { firstName: '', lastName: '' } } as User))
        )
      )
    ).subscribe(users => {
      users.forEach((u, idx) => {
        const id = ids[idx];
        const nameParts = [u.profile.firstName, u.profile.lastName].filter(Boolean);
        this.authorNames[id] = nameParts.join(' ') || id;
      });
    });
  }

  /** Fetch each topic’s full message count */
  private populateMessageCounts(): void {
    if (!this.topics.length) return;

    const calls = this.topics.map(t =>
      this.forumSvc.getTopic(this.courseId, t._id).pipe(
        catchError(() => of({ messages: [] } as Partial<ForumTopic>))
      )
    );

    forkJoin(calls).subscribe(fullTopics => {
      fullTopics.forEach((full, idx) => {
        const id = this.topics[idx]._id;
        this.messageCounts[id] = full.messages?.length ?? 0;
      });
    });
  }

  toggleNewTopicForm(): void {
    this.showNewTopicForm = !this.showNewTopicForm;
  }

  createTopic(): void {
    if (this.newTopicForm.invalid) return;

    const payload: NewTopic = { title: this.newTopicForm.value.title };
    this.forumSvc.createTopic(this.courseId, payload).subscribe({
      next: () => {
        this.newTopicForm.reset();
        this.showNewTopicForm = false;
        this.loadTopics();
      },
      error: err => {
        this.error = err.error?.detail || 'Unable to create topic';
      }
    });
  }

  goToTopic(topicId: string): void {
    this.router.navigate(
      ['/courses', this.courseId, 'forums', topicId],
      { relativeTo: this.route }
    );
  }
}
