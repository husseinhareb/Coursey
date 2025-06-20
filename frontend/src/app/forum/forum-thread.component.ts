// src/app/forum/forum-thread.component.ts
import {
  Component,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  DomSanitizer,
  SafeUrl,
} from '@angular/platform-browser';
import {
  CommonModule,
} from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

import { ForumService, ForumTopic } from '../services/forum.service';
import { AuthService, Me }          from '../auth/auth.service';
import { UserService, User }        from '../services/user.service';

@Component({
  selector: 'app-forum-thread',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './forum-thread.component.html',
  styleUrls: ['./forum-thread.component.css'],
})
export class ForumThreadComponent implements OnInit {
  /** route-derived identifiers */
  courseId!: string;
  threadId!: string;

  /** current topic */
  topic?: ForumTopic;
  loadingTopic = false;
  errorTopic: string | null = null;

  /** map of user-id → full name */
  authorNames: Record<string, string> = {};

  /** form for new messages */
  messageForm: FormGroup;
  posting = false;
  errorMessage: string | null = null;

  /** file attachment */
  selectedFile: File | null = null;
  fileError: string | null = null;

  /** who’s logged in */
  currentUser: Me | null = null;

  constructor(
    private forumSvc: ForumService,
    private userSvc: UserService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private auth: AuthService
  ) {
    this.messageForm = this.fb.group({ content: [''] });
  }

  ngOnInit(): void {
    const cid = this.route.snapshot.paramMap.get('id');
    const tid = this.route.snapshot.paramMap.get('threadId');
    if (!cid || !tid) {
      this.errorTopic = 'Missing course or thread ID';
      return;
    }
    this.courseId = cid;
    this.threadId = tid;

    this.auth.user$.subscribe(u => this.currentUser = u || null);
    this.loadTopic();
  }

  /** load topic + messages and resolve author names */
  private loadTopic(): void {
    this.loadingTopic = true;
    this.forumSvc.getTopic(this.courseId, this.threadId).pipe(
      tap(t => this.topic = t),
      switchMap(t => {
        // collect unique author IDs
        const ids = new Set<string>();
        ids.add(t.author_id);
        t.messages.forEach(m => ids.add(m.author_id));

        // fetch each user
        const calls = Array.from(ids).map(id =>
          this.userSvc.getById(id).pipe(
            catchError(() => of({ id, profile: { firstName: id, lastName: '' } } as Partial<User> as User))
          )
        );
        return forkJoin(calls);
      })
    ).subscribe({
      next: users => {
        this.authorNames = {};
        users.forEach(u => {
          const name = u.profile?.firstName && u.profile?.lastName
            ? `${u.profile.firstName} ${u.profile.lastName}`
            : u.username || u.id;
          this.authorNames[u.id] = name;
        });
        this.loadingTopic = false;
      },
      error: err => {
        this.errorTopic = err.error?.detail || 'Failed to load topic';
        this.loadingTopic = false;
      }
    });
  }

  /** handle file picker */
  onFileSelected(event: Event): void {
    this.fileError = null;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.selectedFile = null;
      return;
    }
    const f = input.files[0];
    if (!f.type.startsWith('image/')) {
      this.fileError = 'Please select an image file';
      this.selectedFile = null;
      return;
    }
    this.selectedFile = f;
  }

  /** post new message (text and/or image) */
  postMessage(): void {
    if (!this.messageForm.value.content && !this.selectedFile) {
      this.errorMessage = 'Enter text or attach an image';
      return;
    }
    this.posting = true;
    this.errorMessage = null;

    const formData = new FormData();
    const txt = this.messageForm.value.content?.trim();
    if (txt) formData.append('content', txt);
    if (this.selectedFile) formData.append('image', this.selectedFile);

    this.forumSvc.addMessage(this.courseId, this.threadId, formData).subscribe({
      next: () => {
        this.messageForm.reset();
        this.selectedFile = null;
        this.loadTopic();
        this.posting = false;
      },
      error: err => {
        this.errorMessage = err.error?.detail || 'Failed to send';
        this.posting = false;
      }
    });
  }

  /** convert base64 to SafeUrl */
  toSafeUrl(base64: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(`data:image/png;base64,${base64}`);
  }

  /** true if this message was sent by the logged-in user */
  isOutgoing(authorId: string): boolean {
    return !!this.currentUser && this.currentUser.id === authorId;
  }
}
