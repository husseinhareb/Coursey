// src/app/profile/profile.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { forkJoin } from 'rxjs';

import { UserService, Profile, User, Enrollment } from '../services/user.service';
import { CourseService, Course } from '../services/course.service';
import { FileService } from '../services/file.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,           // NgIf, NgFor, etc.
    ReactiveFormsModule,    // formGroup, formControlName
    TranslateModule         // | translate
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  form!: FormGroup;
  user?: User;
  previewUrl?: string;
  enrolledCourses: Course[] = [];
  loading = true;
  error: string | null = null;
  success = false;
  private userId!: string;

  constructor(
    private fb: FormBuilder,
    private userSvc: UserService,
    private courseSvc: CourseService,
    private fileSvc: FileService
  ) {
    this.form = this.fb.group({
      firstName:   ['', Validators.required],
      lastName:    ['', Validators.required],
      phoneNumber: [''],
      address:     [''],
      profilePic:  ['']    // carry the uploaded URL
    });
  }

  ngOnInit(): void {
    this.userSvc.getMe().subscribe({
      next: u => {
        this.user       = u;
        this.userId     = u.id;
        this.previewUrl = u.profile.profilePic || '';
        this.form.patchValue({ 
          ...u.profile, 
          profilePic: u.profile.profilePic || '' 
        });
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
      error: () => {}
    });
  }

  onFileSelected(event: Event): void {
    const inp = event.target as HTMLInputElement;
    if (!inp.files?.length) return;
    const file = inp.files[0];

    this.fileSvc.upload(file).subscribe({
      next: ({ url }) => {
        this.previewUrl = url;
        this.form.patchValue({ profilePic: url });

        // save it immediately
        this.userSvc.updateProfile(this.userId, this.form.value as Profile)
          .subscribe({
            next: updated => {
              this.user    = updated;
              this.success = true;
              this.error   = null;
              this.form.markAsPristine();
              setTimeout(() => this.success = false, 3000);
            },
            error: e => {
              this.error   = e.error?.detail || 'Avatar update failed';
              this.success = false;
            }
          });
      },
      error: () => {
        this.error = 'Avatar upload failed';
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.userId) return;
    this.userSvc.updateProfile(this.userId, this.form.value as Profile)
      .subscribe({
        next: u => {
          this.user    = u;
          this.success = true;
          this.error   = null;
          this.form.markAsPristine();
        },
        error: e => {
          this.error   = e.error?.detail || 'Update failed';
          this.success = false;
        }
      });
  }

  get initials(): string {
    const fn = this.user?.profile.firstName || '';
    const ln = this.user?.profile.lastName  || '';
    return (fn.charAt(0) + ln.charAt(0)).toUpperCase();
  }
}
