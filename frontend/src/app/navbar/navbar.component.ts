// src/app/navbar/navbar.component.ts

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  @ViewChild('searchContainer', { static: false })
  private searchContainer!: ElementRef<HTMLDivElement>;

  currentLang = 'en';
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
    // Language initialization
    this.translate.addLangs(['en', 'fr', 'es', 'ar', 'zh']);
    this.translate.setDefaultLang('en');
    const browser = this.translate.getBrowserLang();
    this.currentLang = browser && this.translate.getLangs().includes(browser)
      ? browser
      : 'en';
    this.translate.use(this.currentLang);

    // Theme initialization
    this.theme.initialize();
  }

  ngOnInit(): void {}

  onLanguageChange(ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    this.translate.use(select.value);
    this.currentLang = select.value;
  }

  logout(): void {
    this.auth.logout();
  }

  get initials(): string {
    const u: Me | null = this.auth.user;
    if (!u) return '';
    return (
      (u.profile.firstName?.[0] || '') +
      (u.profile.lastName?.[0]  || '')
    ).toUpperCase();
  }

  get isAdmin(): boolean {
    const u = this.auth.user;
    return !!u && u.roles.map(r => r.toLowerCase()).includes('admin');
  }

  get userRole(): string {
    const roles = this.auth.user?.roles;
    return roles && roles.length > 0 ? roles[0] : 'User';
  }

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = null;
      return;
    }

    forkJoin({
      allCourses: this.courseSvc.list(),
      allUsers:   this.userSvc.getUsers()
    })
      .pipe(
        switchMap(({ allCourses, allUsers }) => {
          const courses = allCourses.filter(c =>
            c.title.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q)
          );
          const users = allUsers.filter(u => {
            const name = `${u.profile.firstName} ${u.profile.lastName}`.toLowerCase();
            return u.username.toLowerCase().includes(q) || name.includes(q);
          });

          if (!allCourses.length) {
            return of({ courses, users, posts: [] as Post[] });
          }

          return forkJoin(allCourses.map(c => this.postSvc.list(c.id))).pipe(
            map(arrays => arrays.flat()),
            map(posts => posts.filter(p =>
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
    this.searchResults = null;
    this.searchQuery   = '';
  }

  closeSearch(): void {
    this.searchResults = null;
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget): void {
    if (
      this.searchContainer &&
      !this.searchContainer.nativeElement.contains(target as Node)
    ) {
      this.closeSearch();
    }
  }
}
