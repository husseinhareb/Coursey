// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';

/**
 * Define application routes.
 * - Redirect root to /login
 * - Add other routes (e.g. dashboard) as you build them
 */
const routes: Routes = [
  { path: 'login',    component: LoginComponent },
  { path: '',         redirectTo: 'login', pathMatch: 'full' },
  // { path: 'dashboard', component: DashboardComponent },
  // { path: '**',       redirectTo: 'login' }
];

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    // DashboardComponent,  // uncomment once you generate it
  ],
  imports: [
    BrowserModule,           // includes CommonModule (for *ngIf, etc.)
    ReactiveFormsModule,     // for formGroup, formControlName
    HttpClientModule,        // for your AuthService HTTP calls
    RouterModule.forRoot(routes)
  ],
  providers: [
    // (AuthService is providedIn: 'root', so you don’t need to add it here)
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
