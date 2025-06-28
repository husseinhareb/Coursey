// src/app/posts/posts.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterModule }    from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SubmissionFormComponent } from '../submissions/submission-form.component';
import { SubmissionListComponent } from '../submissions/submission-list.component';

import { PostService, Post }    from '../services/post.service';
import { Submission }           from '../services/submission.service';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    SubmissionFormComponent,
    SubmissionListComponent
  ],
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostsComponent {
  private postService = inject(PostService);

  /** Core inputs */
  @Input() posts!: Post[];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() courseId!: string;

  /** Permissions & helpers */
  @Input() isStudentInCourse = false;
  @Input() studentSubmissions: { [postId: string]: Submission } = {};
  @Input() canModifyPosts = false;

  /** Panel state */
  @Input() showSubmissionFormForPostId:   string | null = null;
  @Input() showOwnSubmissionListForPostId:string | null = null;
  @Input() showSubmissionListForPostId:   string | null = null;

  /** Completion map: postId → done? */
  @Input() completions: { [postId: string]: boolean } = {};

  /** Admin actions */
  @Output() togglePin        = new EventEmitter<Post>();
  @Output() moveUp           = new EventEmitter<Post>();
  @Output() moveDown         = new EventEmitter<Post>();
  @Output() editPost         = new EventEmitter<Post>();
  @Output() deletePost       = new EventEmitter<Post>();

  /** Submission events */
  @Output() toggleSubmissionForm = new EventEmitter<string|null>();
  @Output() viewOwnSubmission    = new EventEmitter<string|null>();
  @Output() toggleSubmissionList = new EventEmitter<string|null>();

  /** Completion event */
  @Output() toggleComplete = new EventEmitter<string>();

  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  onToggleDone(postId: string): void {
    this.toggleComplete.emit(postId);
  }

  /**
   * Download the file from GridFS, preserving the original filename.
   * Uses HttpClient so that your auth header is included.
   */
    downloadAttachment(post: Post): void {
    if (!post.file_id) return;

    this.postService.downloadFile(this.courseId, post._id, post.file_id)
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = post.file_name ?? 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        error: err => {
          console.error('Failed to download file', err);
        }
      });
  }


  onSubmitted(): void {
    // bubble up if you need to
  }
}
