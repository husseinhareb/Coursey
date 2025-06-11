// src/app/users/user-detail.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { UserService, User } from '../services/user.service';
import { CourseService, Course } from '../services/course.service';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.css']
})
export class UserDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private userSvc = inject(UserService);
    private courseSvc = inject(CourseService);

    user: User | null = null;
    loading = false;
    error: string | null = null;

    // ← new:
    enrolledCourses: Course[] = [];

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.error = 'No user ID provided';
            return;
        }

        this.loading = true;
        this.userSvc.getById(id).subscribe({
            next: u => {
                this.user = u;
                this.loading = false;

                // once we have the user, load each enrolled course:
                if (u.enrollments?.length) {
                    const calls = (u.enrollments as any[])
                        .map(e => this.courseSvc.get(e.courseId));
                    forkJoin(calls).subscribe(courses => {
                        this.enrolledCourses = courses;
                    });
                }
            },
            error: e => {
                this.error = e.error?.detail || 'Failed to load user';
                this.loading = false;
            }
        });
    }
}
