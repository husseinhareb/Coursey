// src/app/profile/profile.component.ts

import { Component, OnInit }                from '@angular/core';
import { CommonModule }                     from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule }                     from '@angular/router';
import { forkJoin }                         from 'rxjs';

import { UserService, Profile, User, Enrollment }     from '../services/user.service';
import { CourseService, Course }                     from '../services/course.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  form!: FormGroup;
  user?: User;
  enrolledCourses: Course[] = [];
  loading = true;
  error: string | null = null;
  success = false;
  private userId!: string;

  // compute initials once user is loaded
  get initials(): string {
    const fn = this.user?.profile?.firstName || '';
    const ln = this.user?.profile?.lastName  || '';
    return (fn.charAt(0) + ln.charAt(0)).toUpperCase();
  }

  constructor(
    private fb:         FormBuilder,
    private userSvc:    UserService,
    private courseSvc:  CourseService
  ) {
    this.form = this.fb.group({
      firstName:   ['', Validators.required],
      lastName:    ['', Validators.required],
      phoneNumber: [''],
      address:     ['']
    });
  }

  ngOnInit(): void {
    this.userSvc.getMe().subscribe({
      next: (u: User) => {
        this.user    = u;
        this.userId  = u.id;
        this.form.patchValue(u.profile);
        this.loadEnrolled(u.enrollments);
        this.loading = false;
      },
      error: err => {
        this.error   = err.error?.detail || 'Failed to load profile';
        this.loading = false;
      }
    });
  }

  private loadEnrolled(enrolls: Enrollment[]): void {
    if (!enrolls.length) return;
    const calls = enrolls.map(e => this.courseSvc.get(e.courseId));
    forkJoin(calls).subscribe({
      next: cs => this.enrolledCourses = cs,
      error: () => {/* swallow or set a message */}
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.userId) return;
    const profile: Profile = this.form.value;
    this.userSvc.updateProfile(this.userId, profile).subscribe({
      next: (updated: User) => {
        this.user    = updated;
        this.success = true;
        this.error   = null;
      },
      error: err => {
        this.error   = err.error?.detail || 'Update failed';
        this.success = false;
      }
    });
  }
}
