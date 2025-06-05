// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { RouterModule, provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './app/auth/auth.interceptor';

// 1) ngx-translate loader: where to find JSON files
export function httpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// 2) Put all of your “global” providers into one array:
const globalProviders = [
  // (a) Bring in the RouterModule providers → ActivatedRoute is now available
  importProvidersFrom(RouterModule),

  // (b) Configure your actual application routes
  provideRouter(routes),

  // (c) Register HttpClient (so JSON can be fetched)
  provideHttpClient(),

  // (d) Register ngx-translate at bootstrap
  provideTranslateService({
    loader: {
      provide: TranslateLoader,
      useFactory: httpLoaderFactory,
      deps: [HttpClient],
    },
    defaultLanguage: 'en',
  }),

  // (e) Your AuthInterceptor (optional)
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
  },
];

bootstrapApplication(AppComponent, {
  providers: [
    ...globalProviders
  ]
})
.catch((err) => console.error(err));
