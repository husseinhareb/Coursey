import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { ForumService, ForumTopic } from '../services/forum.service';
import { AuthService, Me } from '../auth/auth.service';
import { UserService, User } from '../services/user.service';

@Component({
  selector: 'app-forum-thread',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './forum-thread.component.html',
  styleUrls: ['./forum-thread.component.css'],
})
export class ForumThreadComponent implements OnInit {
  courseId!: string;
  threadId!: string;
  topic?: ForumTopic;
  loadingTopic = false;
  errorTopic: string | null = null;

  authorNames: Record<string, string> = {};
  messageForm: FormGroup;
  posting = false;
  errorMessage: string | null = null;

  selectedFile: File | null = null;
  previewUrl: SafeUrl | null = null;

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

    this.loadingTopic = true;
    this.auth.user$
      .pipe(
        filter((u): u is Me => u !== null),
        take(1),
        switchMap(user => {
          this.currentUser = user;
          return this.forumSvc.getTopic(this.courseId, this.threadId);
        })
      )
      .subscribe({
        next: topic => {
          this.topic = topic;
          this.buildAuthorNames();
        },
        error: err => {
          this.errorTopic = err.error?.detail || 'Failed to load topic';
          this.loadingTopic = false;
        },
      });
  }

  /** Expose the correct user ID (_id or id) for template use */
  get currentUserId(): string | undefined {
    return (this.currentUser as any)?._id ?? this.currentUser?.id;
  }

  private buildAuthorNames(): void {
    if (!this.topic) return;

    const ids = Array.from(
      new Set([this.topic.author_id, ...this.topic.messages.map(m => m.author_id)])
    );

    forkJoin(
      ids.map(id =>
        this.userSvc.getById(id).pipe(
          catchError(() => of({ profile: { firstName: '', lastName: '' } } as User))
        )
      )
    ).subscribe(users => {
      users.forEach((u, i) => {
        const id = ids[i];
        const name = [u.profile.firstName, u.profile.lastName]
          .filter(Boolean)
          .join(' ');
        this.authorNames[id] = name || id;
      });
      this.loadingTopic = false;
    });
  }

  onFileSelected(event: Event): void {
    this.errorMessage = null;
    const inp = event.target as HTMLInputElement;
    if (!inp.files?.length) {
      this.removeImage();
      return;
    }
    const f = inp.files[0];
    if (!f.type.startsWith('image/')) {
      this.errorMessage = 'Please select an image file';
      this.removeImage();
      return;
    }
    this.selectedFile = f;
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(
      URL.createObjectURL(f)
    );
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  postMessage(): void {
    const txt = this.messageForm.value.content?.trim();
    if (!txt && !this.selectedFile) {
      this.errorMessage = 'Enter text or attach an image';
      return;
    }
    this.posting = true;
    this.errorMessage = null;

    const formData = new FormData();
    if (txt) formData.append('content', txt);
    if (this.selectedFile) formData.append('image', this.selectedFile);

    this.forumSvc.addMessage(this.courseId, this.threadId, formData).subscribe({
      next: () => {
        this.messageForm.reset();
        this.removeImage();
        this.loadingTopic = true;
        this.forumSvc.getTopic(this.courseId, this.threadId).subscribe(t => {
          this.topic = t;
          this.buildAuthorNames();
          this.posting = false;
        });
      },
      error: err => {
        this.errorMessage = err.error?.detail || 'Failed to send';
        this.posting = false;
      },
    });
  }

  toSafeUrl(base64: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(
      `data:image/png;base64,${base64}`
    );
  }

  /** Compare message author_id against the normalized currentUserId */
  isOutgoing(authorId: string): boolean {
    return this.currentUserId === authorId;
  }
}
