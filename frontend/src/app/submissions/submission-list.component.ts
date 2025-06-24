// src/app/submissions/submission-list.component.ts

import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { AuthService, Me } from '../auth/auth.service';
import {
  SubmissionService,
  Submission,
  SubmissionGrade
} from '../services/submission.service';
import { PostService, Post } from '../services/post.service';
import { environment } from '../environments/environment';
import { Enrollment } from '../services/user.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-submission-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,TranslateModule],
  templateUrl: `./submission-list.component.html`,
  styleUrl: './submission-list.component.css'


})
export class SubmissionListComponent implements OnInit {
  @Input() courseId!: string;
  @Input() postId!: string;

  private auth = inject(AuthService);
  private svc = inject(SubmissionService);
  private postSvc = inject(PostService);
  private fb = inject(FormBuilder);

  currentUser: Me | null = null;
  isAdmin = false;
  isProfessorInCourse = false;
  isStudentInCourse = false;

  /** All fetched submissions */
  private allSubmissions: Submission[] = [];
  /** Filtered: either all submissions or just the current user’s */
  displayedSubmissions: Submission[] = [];

  loading = false;
  error: string | null = null;

  /**
   * Parsed due date of the post, used in the “Due Date” column.
   */
  postDueDate: Date | null = null;

  // Grading form state (professor/admin only)
  gradingSubmissionId: string | null = null;
  gradeForm: FormGroup = this.fb.group({
    grade: [
      null,
      [Validators.required, Validators.min(0), Validators.max(100)]
    ],
    comment: ['', Validators.required]
  });
  gradingLoading = false;
  gradingError: string | null = null;

  /** Computed flags **/
  get canViewAll(): boolean {
    return this.isAdmin || this.isProfessorInCourse;
  }
  get canGrade(): boolean {
    return this.canViewAll;
  }

  ngOnInit() {
    // Subscribe to the user stream to determine roles and load submissions
    this.auth.user$.subscribe({
      next: (user) => {
        this.currentUser = user;
        this.computePermissions();
        this.fetchPostDueDate();
        this.fetchSubmissions();
      },
      error: () => {
        this.currentUser = null;
        this.computePermissions();
        this.fetchPostDueDate();
        this.fetchSubmissions();
      }
    });
  }

  /** Determine if currentUser is admin/professor/student in this course */
  private computePermissions() {
    if (!this.currentUser) {
      this.isAdmin = false;
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
      return;
    }

    const rolesLower = this.currentUser.roles.map(r => r.toLowerCase());
    this.isAdmin = rolesLower.includes('admin');

    const found: Enrollment | undefined =
      (this.currentUser.enrollments as Enrollment[]).find(
        (e: Enrollment) => e.courseId === this.courseId
      );

    if (found) {
      this.isProfessorInCourse = rolesLower.includes('teacher');
      this.isStudentInCourse = rolesLower.includes('student');
    } else {
      this.isProfessorInCourse = false;
      this.isStudentInCourse = false;
    }
  }

  /** Load the parent post to extract its due date (if any) */
  private fetchPostDueDate() {
    this.postSvc.get(this.courseId, this.postId).subscribe({
      next: (post: Post) => {
        this.postDueDate = post.due_date ? new Date(post.due_date) : null;
      },
      error: () => {
        this.postDueDate = null;
      }
    });
  }

  /** Fetch all submissions, then filter for display */
  private fetchSubmissions() {
    this.loading = true;
    this.error = null;
    this.svc.list(this.courseId, this.postId).subscribe({
      next: (subs: Submission[]) => {
        console.log('raw submissions from server:', subs);
        this.allSubmissions = subs;
        this.applyDisplayFilter();
        console.log('after filter, displayedSubmissions =', this.displayedSubmissions);
        this.loading = false;
      },
      error: (err: any) => {
        this.error =
          err.error?.detail || 'Impossible de charger les soumissions';
        this.loading = false;
      }
    });
  }


  /** Decide which submissions to show based on role */
  private applyDisplayFilter() {
    if (this.canViewAll) {
      // Professors/admins see every submission
      this.displayedSubmissions = [...this.allSubmissions];
    } else if (this.isStudentInCourse && this.currentUser) {
      // Students see only submissions where studentId matches their _id:
      this.displayedSubmissions = this.allSubmissions.filter(
        s => (s as any).studentId === this.currentUser!.id
      );
    } else {
      this.displayedSubmissions = [];
    }
  }


  /** Human-friendly French status labels */
  formatStatus(raw: string): string {
    switch (raw) {
      case 'submitted':
        return 'Soumis';
      case 'late':
        return 'En retard';
      case 'graded':
        return 'Corrigé';
      default:
        return raw;
    }
  }

  /** Begin grading flow for a specific submission */
  startGrading(submissionId: string) {
    this.gradingSubmissionId = submissionId;
    this.gradeForm.reset();
    this.gradingError = null;
  }

  /** Cancel grading form */
  cancelGrading() {
    this.gradingSubmissionId = null;
    this.gradingError = null;
  }

  /** Submit a grade + comment to the backend */
  submitGrade() {
    if (!this.gradingSubmissionId || this.gradeForm.invalid) {
      return;
    }
    this.gradingLoading = true;

    const payload: SubmissionGrade = {
      grade: this.gradeForm.value.grade!,
      comment: this.gradeForm.value.comment!
    };

    this.svc
      .grade(
        this.courseId,
        this.postId,
        this.gradingSubmissionId,
        payload
      )
      .subscribe({
        next: () => {
          this.gradingLoading = false;
          this.gradingSubmissionId = null;
          // Reload submissions (so the “grade” and “status” update)
          this.fetchSubmissions();
        },
        error: (err: any) => {
          this.gradingError =
            err.error?.detail || 'Échec de l’enregistrement de la note';
          this.gradingLoading = false;
        }
      });
  }

  /** Build the file download URL from the file ID */
  getFileUrl(fileId: string): string {
    return `${environment.apiUrl}/files/${fileId}`;
  }
}
