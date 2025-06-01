// src/app/course-detail/course-detail.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }               from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute }             from '@angular/router';

import { CourseService, Course }         from '../services/course.service';
import { PostService, Post, PostCreate } from '../services/post.service';

// Import the two new child components:
import { SubmissionFormComponent } from '../submissions/submission-form.component';
import { SubmissionListComponent } from '../submissions/submission-list.component';

@Component({
  selector: 'app-course-detail',
  standalone: true,

  // We must list both child components (plus CommonModule, ReactiveFormsModule)
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
  // -----------------------------
  // “Add/Edit Post” state  (unchanged)
  // -----------------------------

  courseId!: string;
  private fb        = inject(FormBuilder);
  private route     = inject(ActivatedRoute);
  private courseSvc = inject(CourseService);
  private postSvc   = inject(PostService);

  course?: Course;
  loadingCourse = false;
  courseError: string | null = null;

  posts: Post[] = [];
  loadingPosts = false;
  postsError: string | null = null;

  showForm = false;
  editing?: Post;

  postForm = this.fb.group({
    title:   ['', Validators.required],
    content: ['', Validators.required],
    type:    ['', Validators.required],
    fileId:  ['']
  });

  // -----------------------------
  // “Submission” state (NEW)
  // -----------------------------

  /**  ID of the post whose “submit‐homework” form is currently open. */
  showSubmissionFormForPostId: string | null = null;

  /**  ID of the post whose “view submissions” list is currently open. */
  showSubmissionListForPostId: string | null = null;

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

  // ---- “Course” loading (unchanged) ----
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

  // ---- “Post” loading (public so template can call it) ----
  loadPosts() {
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

  /** Number of unpinned posts (for ▲/▼ disabling) */
  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  // ---- “Add / Edit Post” methods (unchanged except making them public) ----

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

  savePost() {
    if (this.postForm.invalid) return;
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

  deletePost(p: Post) {
    if (!confirm(`Delete post “${p.title}”?`)) return;
    this.postSvc.delete(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Delete failed')
    });
  }

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

  moveUp(p: Post) {
    if (p.ispinned) return;
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move up failed')
    });
  }

  moveDown(p: Post) {
    if (p.ispinned) return;
    this.postSvc.moveDown(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move down failed')
    });
  }

  // -----------------------------
  // NEW: “Submission” toggle methods
  // -----------------------------

  /**
   * Toggle the “Submit Homework” form under a given post.
   * If that form is already open for p._id, close it; otherwise show it.
   */
  toggleSubmissionForm(p: Post) {
    if (this.showSubmissionFormForPostId === p._id) {
      this.showSubmissionFormForPostId = null;
    } else {
      this.showSubmissionFormForPostId = p._id;
      // If we open the form, close the “view submissions” list:
      if (this.showSubmissionListForPostId === p._id) {
        this.showSubmissionListForPostId = null;
      }
    }
  }

  /**
   * Toggle the “View Submissions” list under a given post.
   * If already open for p._id, close it; otherwise show it.
   */
  toggleSubmissionList(p: Post) {
    if (this.showSubmissionListForPostId === p._id) {
      this.showSubmissionListForPostId = null;
    } else {
      this.showSubmissionListForPostId = p._id;
      // If we open the list, close the “submit” form:
      if (this.showSubmissionFormForPostId === p._id) {
        this.showSubmissionFormForPostId = null;
      }
    }
  }
}
