import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { forkJoin, of, combineLatest } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';

import { ForumService, ForumTopic, NewTopic } from '../services/forum.service';
import { AuthService, Me } from '../auth/auth.service';
import { UserService, User } from '../services/user.service';
import { Enrollment } from '../services/user.service';

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

  authorNames: Record<string, string> = {};
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
    // 1) extract courseId
    const cid = this.route.snapshot.paramMap.get('id');
    if (!cid) {
      this.error = 'Missing course ID';
      return;
    }
    this.courseId = cid;

    // 2) react to auth changes AND queryParamMap together
    combineLatest([
      this.auth.user$.pipe(filter(u => u !== undefined)),
      this.route.queryParamMap
    ]).subscribe(([user, qp]) => {
      this.currentUser = user as Me | null;
      // compute permission
      this.computeCanCreateTopic();
      // only allow opening form if permitted
      if (this.canCreateTopic && qp.get('newTopic') === 'true') {
        this.showNewTopicForm = true;
      }
    });

    // 3) initial load
    this.loadTopics();
  }

  private computeCanCreateTopic(): void {
    if (!this.currentUser) {
      this.canCreateTopic = false;
    } else {
      const roles = this.currentUser.roles.map(r => r.toLowerCase());
      const isInstructor = roles.includes('teacher') || roles.includes('professor');
      const enrolled = Array.isArray(this.currentUser.enrollments)
        && (this.currentUser.enrollments as Enrollment[])
            .some(e => e.courseId === this.courseId);

      this.canCreateTopic = isInstructor && enrolled;
    }

    console.log('ForumList – canCreateTopic:', this.canCreateTopic,
                'roles:', this.currentUser?.roles,
                'enrolled:', this.currentUser?.enrollments);
  }

  loadTopics(): void {
    this.loading = true;
    this.error = null;

    this.forumSvc.listTopics(this.courseId).subscribe({
      next: topics => {
        this.topics = topics;
        this.populateAuthorNames();
        this.populateMessageCounts();
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.detail || 'Failed to load topics';
        this.loading = false;
      }
    });
  }

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
        const parts = [u.profile.firstName, u.profile.lastName].filter(Boolean);
        this.authorNames[id] = parts.join(' ') || id;
      });
    });
  }

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
    if (!this.canCreateTopic) { return; }
    this.showNewTopicForm = !this.showNewTopicForm;
  }

  createTopic(): void {
    if (this.newTopicForm.invalid) {
      return;
    }
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
