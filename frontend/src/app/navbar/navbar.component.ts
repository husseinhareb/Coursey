import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { AuthService, Me } from '../auth/auth.service';
import { ThemeService } from '../theme.service';
import { CourseService, Course } from '../services/course.service';
import { UserService, User } from '../services/user.service';
import { PostService, Post } from '../services/post.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  currentLang = 'en';

  // live-search
  searchQuery = '';
  searchResults: {
    courses: Course[];
    users: User[];
    posts: Post[];
  } | null = null;

  constructor(
    private router: Router,
    public auth: AuthService,
    public translate: TranslateService,
    public theme: ThemeService,
    private courseSvc: CourseService,
    private userSvc: UserService,
    private postSvc: PostService
  ) {
    // — language init —
    this.translate.addLangs(['en', 'fr', 'es','ar','zh']);
    this.translate.setDefaultLang('en');
    const browser = this.translate.getBrowserLang();
    this.currentLang = browser && this.translate.getLangs().includes(browser)
      ? browser
      : 'en';
    this.translate.use(this.currentLang);

    // — theme init —
    this.theme.initialize();
  }

  ngOnInit(): void {}

  onLanguageChange(ev: Event): void {
    const s = ev.target as HTMLSelectElement | null;
    if (!s) return;
    this.translate.use(s.value);
    this.currentLang = s.value;
  }

  logout(): void {
    this.auth.logout();
  }

  get initials(): string {
    const u: Me | null = this.auth.user;
    if (!u) return '';
    return (
      (u.profile.firstName?.[0] || '') +
      (u.profile.lastName?.[0] || '')
    ).toUpperCase();
  }

  get isAdmin(): boolean {
    const u = this.auth.user;
    return !!u && u.roles.map(r => r.toLowerCase()).includes('admin');
  }

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = null;
      return;
    }

    forkJoin({
      allCourses: this.courseSvc.list(),
      allUsers: this.userSvc.getUsers()
    })
      .pipe(
        switchMap(({ allCourses, allUsers }) => {
          const courses = allCourses.filter(c =>
            c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
          );
          const users = allUsers.filter(u => {
            const name = `${u.profile.firstName} ${u.profile.lastName}`.toLowerCase();
            return u.username.toLowerCase().includes(q) || name.includes(q);
          });

          if (!allCourses.length) {
            return of({ courses, users, posts: [] as Post[] });
          }
          return forkJoin(allCourses.map(c => this.postSvc.list(c.id))).pipe(
            map(arrays => arrays.flat().filter(p =>
              p.title.toLowerCase().includes(q) ||
              p.content?.toLowerCase().includes(q)
            )),
            map(posts => ({ courses, users, posts }))
          );
        })
      )
      .subscribe(results => {
        this.searchResults = results;
      });
  }

  onPostClick(): void {
    // Clear search UI when navigating to a post
    this.searchResults = null;
    this.searchQuery = '';
  }
  
}
