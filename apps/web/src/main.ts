import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HTTP_INTERCEPTORS, withInterceptorsFromDi } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import { ENVIRONMENT } from './app/core/tokens/environment.token';
import { environment } from './environments/environment.local';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    importProvidersFrom(ReactiveFormsModule),
    {
      provide: ENVIRONMENT,
      useValue: environment
    }
  ]
}).catch((err) => console.error(err));
