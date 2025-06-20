// src/app/posts/posts.component.ts


import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubmissionFormComponent } from '../submissions/submission-form.component';
import { SubmissionListComponent } from '../submissions/submission-list.component';
import { Post } from '../services/post.service';
import { Submission } from '../services/submission.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SubmissionFormComponent,
    SubmissionListComponent,
    TranslateModule
  ],
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.css']
})
export class PostsComponent {
  //TODO: use a class called posts for redundancy see page 21 course angular components
  @Input() posts!: Post[];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() courseId!: string;
  @Input() isStudentInCourse = false;
  @Input() studentSubmissions: { [postId: string]: Submission } = {};
  @Input() canModifyPosts = false;
  @Input() showSubmissionFormForPostId: string | null = null;
  @Input() showOwnSubmissionListForPostId: string | null = null;
  @Input() showSubmissionListForPostId: string | null = null;

  @Output() toggleSubmissionForm = new EventEmitter<string | null>();
  @Output() viewOwnSubmission = new EventEmitter<string | null>();
  @Output() toggleSubmissionList = new EventEmitter<string | null>();
  @Output() togglePin = new EventEmitter<Post>();
  @Output() moveUp = new EventEmitter<Post>();
  @Output() moveDown = new EventEmitter<Post>();
  @Output() editPost = new EventEmitter<Post>();
  @Output() deletePost = new EventEmitter<Post>();

  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  onSubmitted(): void {
    // bubble up if additional handling is needed
  }
}