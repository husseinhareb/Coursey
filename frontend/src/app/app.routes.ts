// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth/auth.guard';
import { UsersComponent } from './users/users.component';
import { CoursesComponent } from './courses/courses.component';
import { CourseFormComponent } from './courses/course-form.component';
import { ProfileComponent } from './profile/profile.component';
export const routes: Routes = [
  // Public landing:
  { path: '', component: HomeComponent },

  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },

  // Protected “home” for users after login:
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'courses',
    component: CoursesComponent,
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
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];
