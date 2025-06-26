import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  UserService,
  Profile,
  User,
  Enrollment
} from '../services/user.service';
import { CourseService, Course } from '../services/course.service';
import { FileService } from '../services/file.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;

  user?: User;
  previewUrl?: string;
  enrolledCourses: Course[] = [];

  loading = true;
  error: string | null = null;
  success = false;

  constructor(
    private fb: FormBuilder,
    private userSvc: UserService,
    private courseSvc: CourseService,
    private fileSvc: FileService
  ) {
    // Build a single FormGroup containing both info & password fields
    this.profileForm = this.fb.group(
      {
        // Personal info
        firstName:   ['', Validators.required],
        lastName:    ['', Validators.required],
        phoneNumber: [''],
        address:     [''],
        profilePic:  [''],

        // Password change
        oldPassword:     [''],
        newPassword:     ['', Validators.minLength(8)],
        confirmPassword: ['']
      },
      {
        validators: this.passwordsValidator.bind(this)
      }
    );
  }

  ngOnInit(): void {
    this.userSvc.getMe().subscribe({
      next: u => {
        this.user       = u;
        this.previewUrl = u.profile.profilePic || '';
        this.profileForm.patchValue({
          firstName:   u.profile.firstName,
          lastName:    u.profile.lastName,
          phoneNumber: u.profile.phoneNumber,
          address:     u.profile.address,
          profilePic:  u.profile.profilePic
        });
        this.loadEnrolled(u.enrollments);
        this.loading = false;
      },
      error: e => {
        this.error   = e.error?.detail || 'Failed to load profile';
        this.loading = false;
      }
    });
  }

  private loadEnrolled(enrolls: Enrollment[]): void {
    if (!enrolls.length) return;
    forkJoin(
      enrolls.map(e =>
        this.courseSvc.get(e.courseId).pipe(
          catchError(() => of({ code: 'N/A', title: 'Unknown' } as Course))
        )
      )
    ).subscribe(courses => (this.enrolledCourses = courses));
  }

  private passwordsValidator(form: FormGroup) {
    const oldP = form.get('oldPassword')?.value;
    const newP = form.get('newPassword')?.value;
    const cp   = form.get('confirmPassword')?.value;

    // If no password fields touched, valid
    if (!oldP && !newP && !cp) return null;

    // All three are required
    if (!oldP || !newP || !cp) return { pwdIncomplete: true };

    // Enforce min length
    if (newP.length < 8) return { pwdTooShort: true };

    // Must match
    if (newP !== cp) return { pwdMismatch: true };

    return null;
  }

  get passwordMismatch(): boolean {
    return this.profileForm.hasError('pwdMismatch');
  }

  onFileSelected(event: Event): void {
    const inp = event.target as HTMLInputElement;
    if (!inp.files?.length) return;
    const file = inp.files[0];

    this.fileSvc.upload(file).subscribe({
      next: ({ url }) => {
        this.previewUrl = url;
        this.profileForm.patchValue({ profilePic: url });
        this.userSvc
          .updateProfile(this.user!.id, this.profileForm.value as Profile)
          .subscribe();
      },
      error: () => {
        this.error = 'Avatar upload failed';
      }
    });
  }

  onSubmit(): void {
    if (!this.user) return;

    if (this.profileForm.invalid) {
      this.error = 'Please fix errors before saving';
      return;
    }
    this.error   = null;
    this.success = false;

    const v = this.profileForm.value;
    const profileData: Profile = {
      firstName:   v.firstName,
      lastName:    v.lastName,
      phoneNumber: v.phoneNumber,
      address:     v.address,
      profilePic:  v.profilePic
    };

    const profile$ = this.profileForm.dirty
      ? this.userSvc.updateProfile(this.user.id, profileData)
      : of(this.user);

    const pwd$ = v.oldPassword
      ? this.userSvc.changePassword(this.user.id, v.oldPassword, v.newPassword)
      : of(null);

    forkJoin([profile$, pwd$]).subscribe({
      next: ([updated]) => {
        if (updated) {
          this.user = updated as User;
          this.profileForm.markAsPristine();
        }
        this.success = true;
        setTimeout(() => (this.success = false), 3000);
      },
      error: e => {
        this.error = e.error?.detail || 'Update failed';
      }
    });
  }

  get initials(): string {
    const fn = this.user?.profile.firstName || '';
    const ln = this.user?.profile.lastName  || '';
    return (fn.charAt(0) + ln.charAt(0)).toUpperCase();
  }
}
