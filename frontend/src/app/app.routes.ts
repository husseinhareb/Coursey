import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';

export const routes: Routes = [
  // landing page at "/"
  { path: '', component: HomeComponent },

  // sign-up page
  { path: 'register', component: RegisterComponent },

  // catch-all: redirect unknown URLs back to home
  { path: '**', redirectTo: '' }
];
