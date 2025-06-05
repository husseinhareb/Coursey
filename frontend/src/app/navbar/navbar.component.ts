// src/app/navbar/navbar.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, Me } from '../auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,  // ← now safe, because ActivatedRoute is provided globally
    TranslateModule    // ← so that | translate works
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  currentLang: string;

  constructor(
    public auth: AuthService,
    public translate: TranslateService
  ) {
    // 1) Register your supported languages and a fallback
    this.translate.addLangs(['en', 'fr', 'es']);
    this.translate.setDefaultLang('en');

    // 2) Try to use the browser’s language (if we support it), otherwise use ‘en’
    const browserLang = this.translate.getBrowserLang();
    this.currentLang = (browserLang && this.translate.getLangs().includes(browserLang))
      ? browserLang
      : 'en';

    // 3) Actually load the JSON file for that language
    this.translate.use(this.currentLang);
  }

  ngOnInit(): void {
    // No further action required here unless you want to override language later
  }

  switchLanguage(lang: string) {
    this.translate.use(lang);
    this.currentLang = lang;
  }

  get initials(): string {
    const user: Me | null = this.auth.user;
    if (!user) return '';
    const fn = user.profile.firstName || '';
    const ln = user.profile.lastName  || '';
    return (fn.charAt(0) + ln.charAt(0)).toUpperCase();
  }

  get isAdmin(): boolean {
    const user: Me | null = this.auth.user;
    if (!user) return false;
    return user.roles.map(r => r.toLowerCase()).includes('admin');
  }

  logout() {
    this.auth.logout();
  }
}
