import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule, ActivatedRoute, ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';

import { CourseService, Course } from '../services/course.service';
import { PostService, Post } from '../services/post.service';
import { SubmissionService, Submission } from '../services/submission.service';
import { AuthService, Me } from '../auth/auth.service';
import { Enrollment } from '../services/user.service';
import { PostsComponent } from '../posts/posts.component';
import { TranslateModule }       from '@ngx-translate/core';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PostsComponent,
    TranslateModule
  ],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private courseSvc = inject(CourseService);
  private postSvc = inject(PostService);
  private submissionSvc = inject(SubmissionService);
  private auth = inject(AuthService);

  private subs = new Subscription();

  public courseId!: string;
  public course?: Course;
  public loadingCourse = false;
  public courseError: string | null = null;

  public posts: Post[] = [];
  public loadingPosts = false;
  public postsError: string | null = null;

  public studentSubmissions: { [postId: string]: Submission } = {};
  private requestedPostId: string | null = null;

  public showForm = false;
  public editing?: Post;
  public postForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    type: ['', Validators.required],
    file_id: [''],
    due_date: ['']
  });

  public showSubmissionFormForPostId: string | null = null;
  public showSubmissionListForPostId: string | null = null;
  public showOwnSubmissionListForPostId: string | null = null;

  public currentUser: Me | null = null;
  public isAdmin = false;
  public isProfessorInCourse = false;
  public isStudentInCourse = false;

  ngOnInit() {
    this.subs.add(
      this.route.paramMap.subscribe((params: ParamMap) => {
        const id = params.get('id');
        if (!id) {
          this.courseError = 'No course ID provided';
          return;
        }
        this.courseId = id;
        this.requestedPostId = params.get('postId');
        this.courseError = null;
        this.loadCourse();
        this.loadPosts();
        this.computePermissions();
      })
    );

    this.subs.add(
      this.auth.user$.subscribe({
        next: user => {
          this.currentUser = user;
          this.computePermissions();
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

  private computePermissions() {
    const u = this.currentUser;
    this.isAdmin = !!u && u.roles.map(r => r.toLowerCase()).includes('admin');
    if (u && u.enrollments) {
      const found = (u.enrollments as Enrollment[]).find(e => e.courseId === this.courseId);
      this.isProfessorInCourse = !!found &&
        u.roles.map(r => r.toLowerCase()).includes('teacher');
      this.isStudentInCourse = !!found &&
        u.roles.map(r => r.toLowerCase()).includes('student');
    } else {
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
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
    return (
      (u.profile.firstName?.[0] || '') +
      (u.profile.lastName?.[0] || '')
    ).toUpperCase();
  }

  private loadCourse() {
    this.loadingCourse = true;
    this.courseError = null;
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
    this.postsError = null;
    this.postSvc.list(this.courseId).subscribe({
      next: ps => {
        this.posts = ps;
        this.loadingPosts = false;
        if (this.isStudentInCourse) this.loadStudentSubmissions();
        this.scrollToRequestedPost();
      },
      error: e => {
        this.postsError = e.error?.detail || 'Failed to load posts';
        this.loadingPosts = false;
      }
    });
  }

  private loadStudentSubmissions() {
    if (!this.currentUser) return;
    this.posts.filter(p => p.type === 'homework').forEach(p => {
      this.submissionSvc.list(this.courseId, p._id).subscribe({
        next: subs => {
          const mine = subs.find(s => s.student_id === this.currentUser!.id);
          if (mine) this.studentSubmissions[p._id] = mine;
          else delete this.studentSubmissions[p._id];
        },
        error: () => delete this.studentSubmissions[p._id]
      });
    });
  }

  private scrollToRequestedPost() {
    if (!this.requestedPostId) return;
    setTimeout(() => {
      const el = document.getElementById(this.requestedPostId!);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('highlighted-post');
      }
    }, 0);
  }

  get unpinnedCount(): number {
    return this.posts.filter(p => !p.ispinned).length;
  }

  toggleForm(post?: Post) {
    if (!this.canModifyPosts) return;
    this.showForm = !this.showForm;
    this.editing = post;
    if (post) {
      this.postForm.patchValue({
        title: post.title,
        content: post.content,
        type: post.type,
        file_id: post.file_id || '',
        due_date: post.due_date ? this.formatForInput(post.due_date) : ''
      });
    } else {
      this.postForm.reset();
    }
  }

  savePost() {
    if (!this.canModifyPosts || this.postForm.invalid) return;
    const raw = this.postForm.value;
    const payload: any = {
      title: raw.title,
      content: raw.content,
      type: raw.type,
      file_id: raw.file_id || undefined,
      due_date: raw.due_date ? new Date(raw.due_date).toISOString() : undefined
    };
    const obs = this.editing
      ? this.postSvc.update(this.courseId, this.editing._id, payload)
      : this.postSvc.create(this.courseId, payload);
    obs.subscribe({
      next: () => { this.toggleForm(); this.loadPosts(); },
      error: e => { this.postsError = e.error?.detail || 'Save failed'; }
    });
  }

  deletePost(p: Post) {
    if (!this.canModifyPosts) return;
    if (!confirm(`Delete post "${p.title}"?`)) return;
    this.postSvc.delete(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => { this.postsError = e.error?.detail || 'Delete failed'; }
    });
  }

  togglePin(p: Post) {
    if (!this.canModifyPosts) return;
    const action = p.ispinned ? this.postSvc.unpin : this.postSvc.pin;
    action.call(this.postSvc, this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => { this.postsError = e.error?.detail || (p.ispinned ? 'Unpin failed' : 'Pin failed'); }
    });
  }

  moveUp(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => { this.postsError = e.error?.detail || 'Move up failed'; }
    });
  }

  moveDown(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveDown(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: e => { this.postsError = e.error?.detail || 'Move down failed'; }
    });
  }

  toggleSubmissionForm(postId: string | null) {
    if (!this.isStudentInCourse) return;
    this.showSubmissionFormForPostId =
      this.showSubmissionFormForPostId === postId ? null : postId;
  }

  toggleSubmissionList(postId: string | null) {
    if (!this.canModifyPosts) return;
    this.showSubmissionListForPostId =
      this.showSubmissionListForPostId === postId ? null : postId;
  }

  onSubmissionCompleted() {
    this.showSubmissionFormForPostId = null;
    this.loadStudentSubmissions();
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files?.length) return;
    this.postForm.patchValue({ file_id: '' });
  }

  private formatForInput(iso: string): string {
    const dt = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
}
