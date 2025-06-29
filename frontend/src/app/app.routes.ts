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

import { SubmissionFormComponent } from './submissions/submission.component';
import { SubmissionListComponent } from './submissions/submission-list.component';

import { PostsComponent } from './posts/posts.component';

import { ActivityLogListComponent } from './activity-log-list/activity-log-list.component';
import { ForumListComponent } from './forum/forum-list.component';
import { ForumThreadComponent } from './forum/forum-thread.component';

import { AuthGuard } from './auth/auth.guard';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  // Public landing & auth
  {
    path: '',
    component: HomeComponent
  },

  {
    path: 'login',
    component: LoginComponent
  },

  // Protected area
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
    path: 'register',
    component: RegisterComponent,
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


  //individual post view
  {
    path: 'courses/:id/posts/:postId',
    component: CourseDetailComponent,
    canActivate: [AuthGuard],
  },

  // Courses
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


  // submission routes
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

  // forums
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
  {
    path: 'users/:id',
    component: UserDetailComponent,
    canActivate: [AuthGuard]
  },
  //Dashboard
  {
    path: 'dashboard', component: DashboardComponent
  },
  // Fallback
  { path: '**', redirectTo: '' }
];
