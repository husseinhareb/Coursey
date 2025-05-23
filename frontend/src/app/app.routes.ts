// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import your login component
import { LoginComponent } from './login/login.component';

// src/app/app.routes.ts
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '',     redirectTo: 'login', pathMatch: 'full' },
  { path: '**',   redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
