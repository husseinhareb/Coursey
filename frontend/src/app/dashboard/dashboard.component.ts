// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { DashboardService, DashboardOverview } from '../services/dashboard.service';
import { AuthService, Me } from '../auth/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    CommonModule,      
    TranslateModule 
  ],
})
export class DashboardComponent implements OnInit {
  overview?: DashboardOverview;
  error: string | null = null;
  isAdmin = false;

  constructor(
    private svc: DashboardService,
    private auth: AuthService
  ) { }

  ngOnInit() {
    const u: Me | null = this.auth.user;
    this.isAdmin = !!u && u.roles.map(r => r.toLowerCase()).includes('admin');
    if (!this.isAdmin) {
      this.error = 'Accès interdit';
      return;
    }
    this.svc.getOverview().subscribe({
      next: data => this.overview = data,
      error: err => this.error = err.message || 'Erreur chargement'
    });
  }
}
