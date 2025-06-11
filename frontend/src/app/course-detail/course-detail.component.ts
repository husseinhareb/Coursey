// src/app/course-detail/course-detail.component.ts

import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule }     from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule }     from '@angular/router';
import { ActivatedRoute, ParamMap }   from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap }        from 'rxjs/operators';

import { CourseService, Course }       from '../services/course.service';
import { PostService, Post }           from '../services/post.service';
import { SubmissionService, Submission } from '../services/submission.service';
import { SubmissionFormComponent }     from '../submissions/submission-form.component';
import { SubmissionListComponent }     from '../submissions/submission-list.component';
import { AuthService, Me }             from '../auth/auth.service';
import { Enrollment }                  from '../services/user.service';

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
export class CourseDetailComponent implements OnInit, OnDestroy {
  private fb          = inject(FormBuilder);
  private route       = inject(ActivatedRoute);
  private courseSvc   = inject(CourseService);
  private postSvc     = inject(PostService);
  private submissionSvc = inject(SubmissionService);
  private auth        = inject(AuthService);

  private subs = new Subscription();

  /** The current course ID & data */
  public  courseId!: string;
  public  course?: Course;
  public  loadingCourse = false;
  public  courseError: string | null = null;

  /** All posts for the current course */
  public posts: Post[] = [];
  public loadingPosts = false;
  public postsError: string | null = null;

  /** Student’s own submissions keyed by postId */
  public studentSubmissions: { [postId: string]: Submission } = {};

  /** Form toggles & form group for creating/editing posts */
  public showForm = false;
  public editing?: Post;
  public postForm: FormGroup = this.fb.group({
    title:    ['', Validators.required],
    content:  ['', Validators.required],
    type:     ['', Validators.required],
    file_id:  [''],
    due_date: ['']
  });

  /** Which homework post has its “Submit” or “View all” open */
  public showSubmissionFormForPostId: string | null = null;
  public showSubmissionListForPostId: string | null = null;
  public showOwnSubmissionListForPostId: string | null = null;

  /** Current user and permissions */
  public currentUser: Me | null = null;
  public isAdmin = false;
  public isProfessorInCourse = false;
  public isStudentInCourse = false;

  ngOnInit() {
    // 1) watch for route param changes
    this.subs.add(
      this.route.paramMap.subscribe((params: ParamMap) => {
        const id = params.get('id');
        if (!id) {
          this.courseError = 'No course ID provided';
          return;
        }
        this.courseId = id;
        this.courseError = null;

        // whenever the route changes, reload everything:
        this.loadCourse();
        this.loadPosts();
        this.computePermissions();
      })
    );

    // 2) watch auth.user$ once to get user & recompute permissions
    this.subs.add(
      this.auth.user$.subscribe({
        next: user => {
          this.currentUser = user;
          this.computePermissions();
          // if we're already loaded posts & student, reload submissions
          if (this.isStudentInCourse && this.posts.length > 0) {
            this.loadStudentSubmissions();
          }
        },
        error: () => {
          this.currentUser = null;
          this.computePermissions();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  /** Permissions */
  private computePermissions() {
    const u = this.currentUser;
    this.isAdmin = !!u && u.roles.map(r => r.toLowerCase()).includes('admin');

    if (u && u.enrollments) {
      const found = (u.enrollments as Enrollment[]).find(e => e.courseId === this.courseId);
      this.isProfessorInCourse = !!found && u.roles.map(r => r.toLowerCase()).includes('teacher');
      this.isStudentInCourse   = !!found && u.roles.map(r => r.toLowerCase()).includes('student');
    } else {
      this.isProfessorInCourse = false;
      this.isStudentInCourse   = false;
    }
  }

  get canModifyPosts(): boolean {
    return this.isAdmin || this.isProfessorInCourse;
  }

  logout() {
    this.auth.logout();
  }

  get initials(): string {
    const u = this.currentUser;
    if (!u) return '';
    return ((u.profile.firstName?.[0]||'') + (u.profile.lastName?.[0]||'')).toUpperCase();
  }

  /** Load course metadata */
  private loadCourse() {
    this.loadingCourse = true;
    this.courseError = null;
    this.courseSvc.get(this.courseId).subscribe({
      next: c => {
        this.course = c;
        this.loadingCourse = false;
      },
      error: e => {
        this.courseError   = e.error?.detail || 'Failed to load course';
        this.loadingCourse = false;
      }
    });
  }

  /** Load all posts and then student submissions if needed */
  private loadPosts() {
    this.loadingPosts = true;
    this.postsError   = null;
    this.postSvc.list(this.courseId).subscribe({
      next: ps => {
        this.posts         = ps;
        this.loadingPosts  = false;
        if (this.isStudentInCourse) {
          this.loadStudentSubmissions();
        }
      },
      error: e => {
        this.postsError    = e.error?.detail || 'Failed to load posts';
        this.loadingPosts  = false;
      }
    });
  }

  /** Load current student’s submission for each homework post */
  private loadStudentSubmissions() {
    if (!this.currentUser) return;
    this.posts
      .filter(p => p.type === 'homework')
      .forEach(p => {
        this.submissionSvc.list(this.courseId, p._id).subscribe({
          next: subs => {
            const mine = subs.find(s => s.student_id === this.currentUser!.id);
            if (mine) {
              this.studentSubmissions[p._id] = mine;
            } else {
              delete this.studentSubmissions[p._id];
            }
          },
          error: () => { delete this.studentSubmissions[p._id]; }
        });
      });
  }
  /** Count how many unpinned posts there are (for arrows) */
  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  /**
   * Toggle showing the create/edit form. 
   * Only professors/admins. If `post` is passed, we are in “edit” mode.
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

  /** Called when “Save” is clicked in the post‐form */
  savePost() {
    if (!this.canModifyPosts) return;
    if (this.postForm.invalid) {
      return;
    }

    const raw = this.postForm.value as {
      title: string;
      content: string;
      type: string;
      file_id: string;
      due_date: string;
    };

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
        this.loadPosts(); // reload posts (and then reload student submissions)
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

  /** Move a non‐pinned post UP one slot among unpinned posts */
  moveUp(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => (this.postsError = e.error?.detail || 'Move up failed')
    });
  }

  /** Move a non‐pinned post DOWN one slot among unpinned posts */
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

  /** Toggle showing the “View All Submissions” list for a given postId */
  toggleSubmissionList(postId: string) {
    if (!this.canModifyPosts) return;
    this.showSubmissionListForPostId =
      this.showSubmissionListForPostId === postId ? null : postId;
  }

  /** Called when a submission has just been completed: hide the form & refresh */
  onSubmissionCompleted() {
    this.showSubmissionFormForPostId = null;
    // Reload the student’s single submission for that post
    this.loadStudentSubmissions();
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
