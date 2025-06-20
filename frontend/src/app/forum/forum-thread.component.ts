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

import { ForumService, ForumTopic } from '../services/forum.service';
import { AuthService, Me }          from '../auth/auth.service';

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

  private loadTopic(): void {
    this.loadingTopic = true;
    this.forumSvc.getTopic(this.courseId, this.threadId).subscribe({
      next: t => {
        this.topic = t;
        // you’d fill authorNames here as before…
        this.loadingTopic = false;
      },
      error: err => {
        this.errorTopic = err.error?.detail || 'Failed to load topic';
        this.loadingTopic = false;
      }
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
    // create a quick preview URL
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(
      URL.createObjectURL(f)
    );
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

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

    this.forumSvc
      .addMessage(this.courseId, this.threadId, formData)
      .subscribe({
        next: () => {
          this.messageForm.reset();
          this.removeImage();
          this.loadTopic();
          this.posting = false;
        },
        error: err => {
          this.errorMessage = err.error?.detail || 'Failed to send';
          this.posting = false;
        }
      });
  }

  toSafeUrl(base64: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(`data:image/png;base64,${base64}`);
  }

  isOutgoing(authorId: string): boolean {
    return !!this.currentUser && this.currentUser.id === authorId;
  }
}
