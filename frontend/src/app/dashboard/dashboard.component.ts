import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { TranslateModule }   from '@ngx-translate/core';
import { NgChartsModule }    from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

import {
  DashboardOverview,
  AdminOverview,
  TeacherOverview,
  StudentOverview
} from '../services/dashboard.service';
import { DashboardService }  from '../services/dashboard.service';
import { AuthService, Me }   from '../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgChartsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  overview?: DashboardOverview;
  loading = true;
  error: string | null = null;
  role!: 'admin' | 'teacher' | 'student';

  submissionsData: ChartData<'doughnut', number[], string> = { labels: [], datasets: [{ data: [] }] };
  submissionsOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };

  activityChartData: ChartData<'bar', number[], string> = { labels: [], datasets: [{ data: [], label: 'Actions' }] };
  activityOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Action' } },
      y: { title: { display: true, text: 'Count' }, beginAtZero: true }
    }
  };

  constructor(
    private svc: DashboardService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const u: Me | null = this.auth.user;
    if (!u) {
      this.error = 'Accès interdit';
      this.loading = false;
      return;
    }

    this.svc.getOverview().subscribe({
      next: (data) => {
        this.overview = data;
        this.role     = data.role;
        this.loading  = false;

        if (this.role === 'admin') {
          const a = data as AdminOverview;
          this.submissionsData.labels = Object.keys(a.submissions);
          this.submissionsData.datasets[0].data = Object.values(a.submissions);

          this.activityChartData.labels = Object.keys(a.activityLast7Days);
          this.activityChartData.datasets[0].data = Object.values(a.activityLast7Days);
        }
      },
      error: (err) => {
        this.error   = err.message || 'Erreur chargement';
        this.loading = false;
      }
    });
  }
}
