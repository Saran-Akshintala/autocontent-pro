import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authState$.pipe(
      map(authState => {
        if (authState.isAuthenticated) {
          return true;
        } else {
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}
