// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { RouterModule, provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HttpClient,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AuthInterceptor } from './app/auth/auth.interceptor';

// Factory for ngx-translate HTTP loader
export function httpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Global providers array
const globalProviders = [
  // Enable routing
  importProvidersFrom(RouterModule),
  provideRouter(routes),

  // Enable HttpClient with interceptors
  provideHttpClient(withInterceptorsFromDi()),

  // Configure ngx-translate
  provideTranslateService({
    loader: {
      provide: TranslateLoader,
      useFactory: httpLoaderFactory,
      deps: [HttpClient]
    },
    defaultLanguage: 'en'
  }),

  // Register AuthInterceptor for all HTTP requests
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  }
];

// Bootstrap the Angular application
bootstrapApplication(AppComponent, {
  providers: [
    ...globalProviders
  ]
}).catch(err => console.error(err));
