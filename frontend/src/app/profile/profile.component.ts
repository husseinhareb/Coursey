// src/app/profile/profile.component.ts

import { Component, OnInit }   from '@angular/core';
import { CommonModule }        from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule }        from '@angular/router';
import { UserService, Profile, User } from '../services/user.service';
import { AuthGuard }                     from '../auth/auth.guard';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  error:   string | null = null;
  success: boolean = false;
  private userId!: string;

  constructor(
    private fb:  FormBuilder,
    private svc: UserService
  ) {
    this.form = this.fb.group({
      firstName:   ['', Validators.required],
      lastName:    ['', Validators.required],
      profilePic:  [''],
      phoneNumber: [''],
      address:     ['']
    });
  }

  ngOnInit() {
    this.svc.getMe().subscribe({
      next: (u: User) => {
        this.userId = u.id;
        this.form.patchValue(u.profile);
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.detail || 'Failed to load profile';
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    const profile: Profile = this.form.value;
    this.svc.updateProfile(this.userId, profile).subscribe({
      next: () => {
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
