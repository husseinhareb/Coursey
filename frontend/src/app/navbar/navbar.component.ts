// src/app/navbar/navbar.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Me } from '../auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(public auth: AuthService) {}

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
