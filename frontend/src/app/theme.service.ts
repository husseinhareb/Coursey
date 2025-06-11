// src/app/theme.service.ts
import { Injectable, Renderer2, RendererFactory2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  private current: Theme;
  private readonly storageKey = 'user-theme';

  constructor(
    rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.current = this.getStoredTheme() || this.getPreferredTheme();
    this.applyTheme(this.current);
  }

  /** Initialize: apply theme on app startup (called from NavbarComponent) */
  initialize(): void {
    this.applyTheme(this.current);
  }

  /** Toggle between light and dark modes */
  toggle(): void {
    this.current = this.current === 'light' ? 'dark' : 'light';
    this.applyTheme(this.current);
    this.storeTheme(this.current);
  }

  /** Returns true if current theme is dark */
  isDark(): boolean {
    return this.current === 'dark';
  }

  /** Apply the theme by setting data-theme on the root element */
  private applyTheme(theme: Theme): void {
    this.renderer.setAttribute(this.document.documentElement, 'data-theme', theme);
  }

  /** Retrieve stored theme from localStorage */
  private getStoredTheme(): Theme | null {
    const stored = localStorage.getItem(this.storageKey);
    return stored === 'light' || stored === 'dark' ? stored : null;
  }

  /** Store theme selection in localStorage */
  private storeTheme(theme: Theme): void {
    localStorage.setItem(this.storageKey, theme);
  }

  /** If no stored theme, use OS/browser preference */
  private getPreferredTheme(): Theme {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
}
