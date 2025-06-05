// src/app/course-detail/course-detail.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }     from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { RouterModule }     from '@angular/router';
import { ActivatedRoute }   from '@angular/router';

import { CourseService, Course } from '../services/course.service';
import { PostService, Post }     from '../services/post.service';
import { SubmissionFormComponent } from '../submissions/submission-form.component';
import { SubmissionListComponent } from '../submissions/submission-list.component';

import { AuthService, Me } from '../auth/auth.service';
import { Enrollment } from '../services/user.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
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
  private auth      = inject(AuthService);

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
  postForm: FormGroup = this.fb.group({
    title:    ['', Validators.required],
    content:  ['', Validators.required],
    type:     ['', Validators.required],  // "lecture" | "reminder" | "homework"
    file_id:  [''],
    due_date: ['']
  });

  /** Which homework-post (by _id) currently has the “Submit Homework” form open */
  showSubmissionFormForPostId: string | null = null;
  /** Which homework-post (by _id) currently has the “View Submissions” list open */
  showSubmissionListForPostId: string | null = null;

  /** Expose courseId to the template (must be public) */
  public courseId!: string;

  /** Current user info */
  currentUser: Me | null = null;
  isAdmin = false;
  isProfessorInCourse = false;
  isStudentInCourse = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.courseError = 'No course ID provided';
      return;
    }
    this.courseId = id;

    // 1) Charger le profil pour déterminer rôles & enrollments
    this.auth.user$.subscribe({
      next: user => {
        this.currentUser = user;
        this.computePermissions();
      },
      error: () => {
        this.currentUser = null;
        this.computePermissions();
      }
    });

    // 2) Charger les détails du cours
    this.loadCourse();

    // 3) Charger la liste des posts
    this.loadPosts();
  }

  private computePermissions() {
    if (!this.currentUser) {
      this.isAdmin = false;
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
      return;
    }
    const rolesLower = this.currentUser.roles.map(r => r.toLowerCase());
    this.isAdmin = rolesLower.includes('admin');

    // Parcourir enrollments pour déterminer présence dans ce cours
    const found = (this.currentUser.enrollments as Enrollment[]).find(
      (e: Enrollment) => e.courseId === this.courseId
    );
    if (found) {
      // Si on stocke e.role, vérifier e.role === 'teacher' ou 'student'
      // Par défaut, on traite comme professeur :
      this.isProfessorInCourse = rolesLower.includes('teacher');
      this.isStudentInCourse   = rolesLower.includes('student');
    } else {
      this.isProfessorInCourse = false;
      this.isStudentInCourse   = false;
    }
  }

  /** Si admin OU professeur inscrit, on peut créer/éditer/pinner/mover/delete */
  get canModifyPosts(): boolean {
    return this.isAdmin || this.isProfessorInCourse;
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

  /** Load all posts */
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

  /** Count how many un-pinned posts there are (for arrows) */
  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  /**
   * Toggle showing the create/edit form. 
   * Only profs inscrits et admins.
   * If `post` is passed, we are in “edit” mode.
   */
  toggleForm(post?: Post) {
    if (!this.canModifyPosts) return;

    this.showForm = !this.showForm;
    this.editing = post || undefined;

    if (post) {
      // Patch the form with existing values, including due_date
      this.postForm.patchValue({
        title:    post.title,
        content:  post.content,
        type:     post.type,
        file_id:  post.file_id || '',
        due_date: post.due_date 
          ? this.formatForInput(post.due_date) 
          : '' 
      });
    } else {
      this.postForm.reset();
    }
  }

  /** Called when “Save” is clicked in the post-form */
  savePost() {
    if (!this.canModifyPosts) return;
    if (this.postForm.invalid) {
      return;
    }

    // Build the payload from form values
    const raw = this.postForm.value as {
      title: string;
      content: string;
      type: string;
      file_id: string;
      due_date: string;
    };

    // Convert form value to PostCreate / PostUpdate
    const payload: any = {
      title:    raw.title,
      content:  raw.content,
      type:     raw.type,
      file_id:  raw.file_id || undefined,
      due_date: raw.due_date ? new Date(raw.due_date).toISOString() : undefined
    };

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
    if (!this.canModifyPosts) return;
    if (!confirm(`Delete post “${p.title}”?`)) {
      return;
    }
    this.postSvc.delete(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Delete failed')
    });
  }

  /** Pin / Unpin: pinned posts float to top */
  togglePin(p: Post) {
    if (!this.canModifyPosts) return;
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

  /** Move a non-pinned post UP one slot among unpinned posts */
  moveUp(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move up failed')
    });
  }

  /** Move a non-pinned post DOWN one slot among unpinned posts */
  moveDown(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveDown(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move down failed')
    });
  }

  /** Toggle showing the “Submit Homework” form for a given postId */
  toggleSubmissionForm(postId: string) {
    if (!this.isStudentInCourse) return;
    this.showSubmissionFormForPostId =
      this.showSubmissionFormForPostId === postId ? null : postId;
  }

  /** Toggle showing the “View Submissions” list for a given postId */
  toggleSubmissionList(postId: string) {
    if (!this.canModifyPosts) return;
    this.showSubmissionListForPostId =
      this.showSubmissionListForPostId === postId ? null : postId;
  }

  /** Called when a submission has just been completed: hide the form & refresh list */
  onSubmissionCompleted() {
    this.showSubmissionFormForPostId = null;
    // The <app-submission-list> child auto-reloads its data.
  }

  /** Called when the file input changes. Stub for upload logic. */
  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files || inputEl.files.length === 0) {
      return;
    }
    const file = inputEl.files[0];
    // TODO: upload `file` to backend and patch `postForm.patchValue({ file_id: returnedId })`.
    this.postForm.patchValue({ file_id: '' });
  }

  /**
   * Utility: convert an ISO string (or `Post.due_date`) into a
   * `YYYY-MM-DDTHH:mm` string for the <input type="datetime-local">.
   */
  private formatForInput(isoString: string): string {
    const dt = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = dt.getFullYear();
    const mm   = pad(dt.getMonth() + 1);
    const dd   = pad(dt.getDate());
    const hh   = pad(dt.getHours());
    const min  = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
}
