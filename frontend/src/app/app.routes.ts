// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { ProfileComponent } from './profile/profile.component';

import { UsersComponent } from './users/users.component';
import { ManageEnrollmentsComponent } from './manage-enrollments/manage-enrollments.component';

import { CoursesComponent } from './courses/courses.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { CourseFormComponent } from './course-form/course-form.component';

import { AuthGuard } from './auth/auth.guard';
import { SubmissionFormComponent } from './submissions/submission.component';
import { SubmissionListComponent } from './submissions/submission-list.component';

import { ActivityLogListComponent } from './activity-log-list/activity-log-list.component';

import { ForumListComponent }   from './forum/forum-list.component';
import { ForumThreadComponent } from './forum/forum-thread.component';

export const routes: Routes = [
  // Public landing & auth
  { path: '', component: HomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },

  // Protected area (requires login)
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'users/:id/enrollments',
    component: ManageEnrollmentsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses',
    component: CoursesComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/add',
    component: CourseFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/:id/edit',
    component: CourseFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/:id',
    component: CourseDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/:id/posts/:pid/submit',
    component: SubmissionFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/:id/posts/:pid/submissions',
    component: SubmissionListComponent,
    canActivate: [AuthGuard]
  },

  // ▶︎ Course-specific forum routes (plural "forums")
  {
    path: 'courses/:id/forums',
    component: ForumListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/:id/forums/:threadId',
    component: ForumThreadComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'activity-logs',
    component: ActivityLogListComponent,
    canActivate: [AuthGuard]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
