// src/app/course-detail/course-detail.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule, ActivatedRoute, ParamMap } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import { CourseService, Course } from '../services/course.service';
import { SubmissionService, Submission } from '../services/submission.service';
import { CompletionService, Completion } from '../services/completion.service';
import { AuthService, Me } from '../auth/auth.service';
import { Enrollment } from '../services/user.service';
import { PostsComponent } from '../posts/posts.component';
import { TranslateModule } from '@ngx-translate/core';
import { PostService, Post, PostCreate, PostUpdate } from '../services/post.service';

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
  private completionSvc = inject(CompletionService);
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

  public completions: { [postId: string]: boolean } = {};

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

  selectedFile: File | null = null;


  ngOnInit() {
    // Watch route params
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

    // Watch auth user
    this.subs.add(
      this.auth.user$.subscribe({
        next: (user: Me | null) => {
          this.currentUser = user;
          this.computePermissions();
          if (this.isStudentInCourse) {
            this.loadStudentSubmissions();
            this.loadCompletions();
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
      const roles = u.roles.map(r => r.toLowerCase());
      // allow either "teacher" or "professor"
      this.isProfessorInCourse = !!found && (roles.includes('teacher') || roles.includes('professor'));
      this.isStudentInCourse = !!found && roles.includes('student');
    } else {
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length
      ? input.files[0]
      : null;
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
      next: (c: Course) => {
        this.course = c;
        this.loadingCourse = false;
      },
      error: (e: any) => {
        this.courseError = e.error?.detail || 'Failed to load course';
        this.loadingCourse = false;
      }
    });
  }

  private loadPosts() {
    this.loadingPosts = true;
    this.postsError = null;
    this.postSvc.list(this.courseId).pipe(
      switchMap((ps: Post[]) => {
        this.posts = ps;
        this.loadingPosts = false;
        if (this.isStudentInCourse) {
          this.loadStudentSubmissions();
          this.loadCompletions();
        }
        this.scrollToRequestedPost();
        return of(null);
      }),
      catchError((err: any) => {
        this.postsError = err.error?.detail || 'Failed to load posts';
        this.loadingPosts = false;
        return of(null);
      })
    ).subscribe();
  }

  private loadStudentSubmissions() {
    if (!this.currentUser) return;
    this.posts
      .filter((p: Post) => p.type === 'homework')
      .forEach((p: Post) => {
        this.submissionSvc.list(this.courseId, p._id).subscribe({
          next: (subs: Submission[]) => {
            const mine = subs.find(s => s.student_id === this.currentUser!.id);
            if (mine) this.studentSubmissions[p._id] = mine;
            else delete this.studentSubmissions[p._id];
          },
          error: () => {
            delete this.studentSubmissions[p._id];
          }
        });
      });
  }

  private loadCompletions() {
    if (!this.currentUser) return;
    this.completionSvc.getCompletions(this.courseId).subscribe({
      next: (list: Completion[]) => {
        this.completions = {};
        list.forEach((c: Completion) => {
          this.completions[c.post_id] = true;
        });
      },
      error: () => {
        this.completions = {};
      }
    });
  }

  /** Called when student clicks “mark done” or “undo” */
  onToggleComplete(postId: string) {
    if (!this.isStudentInCourse) return;
    const done = !!this.completions[postId];

    if (done) {
      this.completionSvc
        .unmarkComplete(this.courseId, postId)
        .pipe(
          switchMap(() => this.completionSvc.getCompletions(this.courseId)),
          catchError(() => of([] as Completion[]))
        )
        .subscribe(completionList => this.updateCompletions(completionList));
    } else {
      this.completionSvc
        .markComplete(this.courseId, postId)
        .pipe(
          switchMap(() => this.completionSvc.getCompletions(this.courseId)),
          catchError(() => of([] as Completion[]))
        )
        .subscribe(completionList => this.updateCompletions(completionList));
    }
  }



  private updateCompletions(list: Completion[]) {
    this.completions = {};
    list.forEach(c => (this.completions[c.post_id] = true));
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

  // --- Post create/edit/delete/pin/move methods ---

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
    const payload: PostCreate | PostUpdate = {
      title: raw.title,
      content: raw.content,
      type: raw.type,
      due_date: raw.due_date
        ? new Date(raw.due_date).toISOString()
        : undefined
    };

    const callCreateOrUpdate = (fileId?: string) => {
      if (fileId) {
        (payload as any).file_id = fileId;
      }
      return this.editing
        ? this.postSvc.update(
          this.courseId,
          this.editing!._id,
          payload as PostUpdate
        )
        : this.postSvc.create(
          this.courseId,
          payload as PostCreate
        );
    };

    if (this.selectedFile) {
      // upload, then create/update
      this.postSvc.uploadFile(this.courseId, this.selectedFile).pipe(
        switchMap(res => callCreateOrUpdate(res.file_id))
      ).subscribe({
        next: () => this.afterSave(),
        error: e => this.postsError = e.error?.detail || 'Save failed'
      });
    } else {
      // no file: immediate create/update
      callCreateOrUpdate().subscribe({
        next: () => this.afterSave(),
        error: e => this.postsError = e.error?.detail || 'Save failed'
      });
    }
  }

  private afterSave() {
    this.toggleForm();
    this.selectedFile = null;
    this.loadPosts();
  }

  private onSaveSuccess() {
    this.toggleForm();
    this.selectedFile = null;    // reset for next time
    this.loadPosts();
  }

  deletePost(p: Post) {
    if (!this.canModifyPosts) return;
    if (!confirm(`Delete post "${p.title}"?`)) return;
    this.postSvc.delete(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: (e: any) => {
        this.postsError = e.error?.detail || 'Delete failed';
      }
    });
  }

  togglePin(p: Post) {
    if (!this.canModifyPosts) return;

    if (p.ispinned) {
      this.postSvc
        .unpin(this.courseId, p._id)
        .subscribe({
          next: () => this.loadPosts(),
          error: e => this.postsError = e.error?.detail ?? 'Unpin failed'
        });
    } else {
      this.postSvc
        .pin(this.courseId, p._id)
        .subscribe({
          next: () => this.loadPosts(),
          error: e => this.postsError = e.error?.detail ?? 'Pin failed'
        });
    }
  }


  moveUp(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveUp(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: (e: any) => {
        this.postsError = e.error?.detail || 'Move up failed';
      }
    });
  }

  moveDown(p: Post) {
    if (!this.canModifyPosts || p.ispinned) return;
    this.postSvc.moveDown(this.courseId, p._id).subscribe({
      next: () => this.loadPosts(),
      error: (e: any) => {
        this.postsError = e.error?.detail || 'Move down failed';
      }
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


  private formatForInput(iso: string): string {
    const dt = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
}
