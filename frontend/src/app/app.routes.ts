// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { HomeComponent }              from './home/home.component';
import { RegisterComponent }          from './register/register.component';
import { LoginComponent }             from './login/login.component';
import { ProfileComponent }           from './profile/profile.component';

import { UsersComponent }             from './users/users.component';
import { ManageEnrollmentsComponent } from './users/manage-enrollments.component';

import { CoursesComponent }           from './courses/courses.component';
import { CourseDetailComponent }      from './courses/course-detail.component';
import { CourseFormComponent }        from './courses/course-form.component';

import { AuthGuard }                  from './auth/auth.guard';

export const routes: Routes = [
  // Public landing & auth
  { path: '',         component: HomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login',    component: LoginComponent },

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
    pathMatch: 'full',   // only match exactly `/courses`
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

  // Fallback
  { path: '**', redirectTo: '' }
];
