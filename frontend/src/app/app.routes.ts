// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  // Public landing:
  { path: '', component: HomeComponent },

  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },

  // Protected “home” for users after login:
  {
    path: 'dashboard',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },

  { path: '**', redirectTo: '' }
];
