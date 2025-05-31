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

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit {
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

  showForm = false;        // whether to show the create/edit form
  editing?: Post;          // if defined, indicates we are editing that post
  postForm = this.fb.group({
    title:   ['', Validators.required],
    content: ['', Validators.required],
    type:    ['', Validators.required],
    fileId:  ['']
  });

  private courseId!: string;

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

  /**
   * Count how many unpinned posts there are.
   * We only show ▲/▼ for unpinned posts within [1 .. unpinnedCount].
   */
  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  /** Toggle showing the “create/edit” form. If a `post` is passed, we patch-form to edit it. */
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

  /** Called when “Save” is clicked. Creates or updates. */
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
        // Once saved, hide the form and reload posts.
        this.toggleForm();
        this.loadPosts();
      },
      error: e => {
        this.postsError = e.error?.detail || 'Save failed';
      }
    });
  }

  /** Delete a post after user confirmation. */
  deletePost(p: Post) {
    if (!confirm(`Delete post “${p.title}”?`)) {
      return;
    }
    this.postSvc.delete(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => this.postsError = e.error?.detail || 'Delete failed'
    });
  }

  /** Pin / Unpin. Pinned posts always float to the top. */
  togglePin(p: Post) {
    if (p.ispinned) {
      // Unpin:
      this.postSvc.unpin(this.courseId, p._id).subscribe({
        next: () => this.loadPosts(),
        error: e => this.postsError = e.error?.detail || 'Unpin failed'
      });
    } else {
      // Pin:
      this.postSvc.pin(this.courseId, p._id).subscribe({
        next: () => this.loadPosts(),
        error: e => this.postsError = e.error?.detail || 'Pin failed'
      });
    }
  }

  /**
   * Move a non-pinned post UP one slot among unpinned posts.
   * Backend route: PATCH /courses/:cid/posts/:pid/moveUp 
   * (swap `position` with the item directly above).
   */
  moveUp(p: Post) {
    if (p.ispinned) {
      return; // only unpinned posts can move
    }
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => this.postsError = e.error?.detail || 'Move up failed'
    });
  }

  /**
   * Move a non-pinned post DOWN one slot among unpinned posts.
   * Backend route: PATCH /courses/:cid/posts/:pid/moveDown 
   * (swap `position` with the item directly below).
   */
  moveDown(p: Post) {
    if (p.ispinned) {
      return;
    }
    this.postSvc.moveDown(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => this.postsError = e.error?.detail || 'Move down failed'
    });
  }
}
