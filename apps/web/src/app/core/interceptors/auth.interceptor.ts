import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.currentToken;
    const currentTenant = this.authService.currentTenant;

    // Clone the request and add authentication headers if token exists
    if (token) {
      const authHeaders: { [key: string]: string } = {
        'Authorization': `Bearer ${token}`
      };

      // Add tenant header if current tenant is selected
      if (currentTenant) {
        authHeaders['x-tenant-id'] = currentTenant.tenantId;
      }

      const authReq = req.clone({
        setHeaders: authHeaders
      });

      return next.handle(authReq);
    }

    return next.handle(req);
  }
}
