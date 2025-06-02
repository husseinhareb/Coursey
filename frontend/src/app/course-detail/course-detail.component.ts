import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }               from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute }             from '@angular/router';

import {
  CourseService,
  Course
} from '../services/course.service';

import {
  PostService,
  Post,
  PostCreate
} from '../services/post.service';

// Import the two submission sub‐components:
import { SubmissionFormComponent } from '../submissions/submission-form.component';
import { SubmissionListComponent } from '../submissions/submission-list.component';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SubmissionFormComponent,
    SubmissionListComponent
  ],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit {
  private fb        = inject(FormBuilder);
  private route     = inject(ActivatedRoute);
  private courseSvc = inject(CourseService);
  private postSvc   = inject(PostService);

  /** The current course object */
  course?: Course;
  loadingCourse = false;
  courseError: string | null = null;

  /** All posts (lecture/reminder/homework) */
  posts: Post[] = [];
  loadingPosts = false;
  postsError: string | null = null;

  /** Create/Edit post form toggles */
  showForm = false;        // whether to show the create/edit post form
  editing?: Post;          // if defined, we are editing that Post
  postForm = this.fb.group({
    title:   ['', Validators.required],
    content: ['', Validators.required],
    type:    ['', Validators.required],  // "lecture" | "reminder" | "homework"
    fileId:  ['']
  });

  /** Which homework‐post (by _id) currently has the “Submit Homework” form open */
  showSubmissionFormForPostId: string | null = null;
  /** Which homework‐post (by _id) currently has the “View Submissions” list open */
  showSubmissionListForPostId: string | null = null;

  /** Expose courseId to the template (must be public) */
  public courseId!: string;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.courseError = 'No course ID provided';
      return;
    }
    this.courseId = id;
    this.loadCourse();
    this.loadPosts();
  }

  /** Load course metadata */
  private loadCourse() {
    this.loadingCourse = true;
    this.courseSvc.get(this.courseId).subscribe({
      next: c => {
        this.course = c;
        this.loadingCourse = false;
      },
      error: e => {
        this.courseError = e.error?.detail || 'Failed to load course';
        this.loadingCourse = false;
      }
    });
  }

  /** Load all posts, then sort in the service */
  private loadPosts() {
    this.loadingPosts = true;
    this.postSvc.list(this.courseId).subscribe({
      next: (ps: Post[]) => {
        this.posts = ps;
        this.loadingPosts = false;
      },
      error: e => {
        this.postsError = e.error?.detail || 'Failed to load posts';
        this.loadingPosts = false;
      }
    });
  }

  /** Count how many un‐pinned posts there are (for enabling/disabling arrows) */
  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  /** Toggle showing the create/edit form. If `post` is passed, we are in “edit” mode */
  toggleForm(post?: Post) {
    this.showForm = !this.showForm;
    this.editing = post;
    if (post) {
      this.postForm.patchValue({
        title:   post.title,
        content: post.content,
        type:    post.type,
        fileId:  post.file_id || ''
      });
    } else {
      this.postForm.reset();
    }
  }

  /** Called when “Save” is clicked in the post‐form */
  savePost() {
    if (this.postForm.invalid) {
      return;
    }
    const payload = this.postForm.value as PostCreate;
    const obs = this.editing
      ? this.postSvc.update(this.courseId, this.editing._id, payload)
      : this.postSvc.create(this.courseId, payload);

    obs.subscribe({
      next: () => {
        this.toggleForm();
        this.loadPosts();
      },
      error: e => {
        this.postsError = e.error?.detail || 'Save failed';
      }
    });
  }

  /** Delete a post after confirmation */
  deletePost(p: Post) {
    if (!confirm(`Delete post “${p.title}”?`)) {
      return;
    }
    this.postSvc.delete(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => this.postsError = e.error?.detail || 'Delete failed'
    });
  }

  /** Pin / Unpin: pinned posts float to top */
  togglePin(p: Post) {
    if (p.ispinned) {
      this.postSvc.unpin(this.courseId, p._id).subscribe({
        next: () => this.loadPosts(),
        error: e => (this.postsError = e.error?.detail || 'Unpin failed')
      });
    } else {
      this.postSvc.pin(this.courseId, p._id).subscribe({
        next: () => this.loadPosts(),
        error: e => (this.postsError = e.error?.detail || 'Pin failed')
      });
    }
  }

  /** Move a non‐pinned post UP one slot among unpinned posts */
  moveUp(p: Post) {
    if (p.ispinned) return;
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move up failed')
    });
  }

  /** Move a non‐pinned post DOWN one slot among unpinned posts */
  moveDown(p: Post) {
    if (p.ispinned) return;
    this.postSvc.moveDown(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move down failed')
    });
  }

  /** Toggle showing the “Submit Homework” form for a given postId */
  toggleSubmissionForm(postId: string) {
    this.showSubmissionFormForPostId =
      this.showSubmissionFormForPostId === postId ? null : postId;
  }

  /** Toggle showing the “View Submissions” list for a given postId */
  toggleSubmissionList(postId: string) {
    this.showSubmissionListForPostId =
      this.showSubmissionListForPostId === postId ? null : postId;
  }

  /** Called when a submission has just been completed: hide the form & refresh list */
  onSubmissionCompleted() {
    this.showSubmissionFormForPostId = null;
    // (The child <app-submission-list> will auto‐refresh itself on its own ngOnInit,
    // but you could also force a reload by calling fetch or toggling showSubmissionListForPostId.)
  }
}
