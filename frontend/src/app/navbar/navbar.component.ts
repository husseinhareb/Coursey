// src/app/navbar/navbar.component.ts

import { Component, OnInit }             from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { RouterLink, RouterLinkActive }  from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, Me }               from '../auth/auth.service';
import { ThemeService }                  from '../theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  currentLang: string;

  constructor(
    public auth: AuthService,
    public translate: TranslateService,
    public theme: ThemeService          // ← injected for template
  ) {
    // Register supported languages and fallback
    this.translate.addLangs(['en', 'fr', 'es']);
    this.translate.setDefaultLang('en');

    // Attempt to use browser language if supported
    const browserLang = this.translate.getBrowserLang();
    this.currentLang = (browserLang && this.translate.getLangs().includes(browserLang))
      ? browserLang
      : 'en';

    // Load translations for the selected language
    this.translate.use(this.currentLang);

    // Initialize theme (apply saved or default)
    this.theme.initialize();
  }

  ngOnInit(): void {
    // Nothing else needed here
  }

  /** Called by the <select> (change) event in the template */
  onLanguageChange(ev: Event): void {
    const select = ev.target as HTMLSelectElement | null;
    if (!select) return;
    this.switchLanguage(select.value);
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
    return !!user && user.roles.map(r => r.toLowerCase()).includes('admin');
  }

  logout() {
    this.auth.logout();
  }
}
