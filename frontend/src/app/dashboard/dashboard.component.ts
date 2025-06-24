// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { TranslateModule }   from '@ngx-translate/core';
import { NgChartsModule }    from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

import {
  DashboardService,
  AdminOverview,
  TeacherOverview,
  StudentOverview
} from '../services/dashboard.service';
import { AuthService, Me }   from '../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgChartsModule    // <-- needed for <canvas baseChart>
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  overview?: AdminOverview | TeacherOverview | StudentOverview;
  error:     string | null = null;
  role!:     'admin' | 'teacher' | 'student';

  // --- Chart.js bindings for admin view ---
  submissionsData: ChartData<'doughnut', number[], string> = {
    labels: [], 
    datasets: [{ data: [] }]
  };
  submissionsOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };

  activityChartData: ChartData<'bar', number[], string> = {
    labels: [], 
    datasets: [{ data: [], label: 'Actions' }]
  };
  activityOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Action' } },
      y: { title: { display: true, text: 'Count' }, beginAtZero: true }
    }
  };

  constructor(
    private svc:  DashboardService,
    public  auth: AuthService
  ) {}

  ngOnInit() {
    const u: Me | null = this.auth.user;
    if (!u) {
      this.error = 'Accès interdit';
      return;
    }

    this.svc.getOverview().subscribe({
      next: (data) => {
        this.overview = data;
        this.role     = data.role;

        if (this.role === 'admin') {
          const admin = data as AdminOverview;
          this.submissionsData.labels = Object.keys(admin.submissions);
          this.submissionsData.datasets[0].data = Object.values(admin.submissions);

          this.activityChartData.labels = Object.keys(admin.activityLast7Days);
          this.activityChartData.datasets[0].data = Object.values(admin.activityLast7Days);
        }
      },
      error: (err) => this.error = err.message || 'Erreur chargement'
    });
  }
}
