import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';
import { ENVIRONMENT, Environment } from '../tokens/environment.token';
import { LoginRequest, LoginResponse, User, AuthState, UserTenant } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  private readonly TOKEN_KEY = 'autocontent_token';
  private readonly USER_KEY = 'autocontent_user';
  private readonly TENANT_KEY = 'autocontent_current_tenant';

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    currentTenant: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    const currentTenant = this.getStoredCurrentTenant();

    if (token && user) {
      this.authStateSubject.next({
        isAuthenticated: true,
        user,
        token,
        currentTenant
      });
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.env.apiBaseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.handleLoginSuccess(response);
        }),
        catchError(error => {
          console.error('Login failed:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    this.clearStorage();
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      token: null,
      currentTenant: null
    });
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<{ user: User }>(`${this.env.apiBaseUrl}/auth/me`)
      .pipe(
        map(response => response.user),
        tap(user => {
          const currentState = this.authStateSubject.value;
          this.authStateSubject.next({
            ...currentState,
            user: user
          });
          this.storeUser(user);
        }),
        catchError(error => {
          if (error.status === 401) {
            this.logout();
          }
          return throwError(() => error);
        })
      );
  }

  switchTenant(tenant: UserTenant): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      currentTenant: tenant
    });
    this.storeCurrentTenant(tenant);
  }

  private handleLoginSuccess(response: LoginResponse): void {
    this.storeToken(response.access_token);
    this.storeUser(response.user);
    
    // Set first tenant as current if available
    const firstTenant = response.user.tenants?.[0] || null;
    if (firstTenant) {
      this.storeCurrentTenant(firstTenant);
    }

    this.authStateSubject.next({
      isAuthenticated: true,
      user: response.user,
      token: response.access_token,
      currentTenant: firstTenant
    });
  }

  // Storage methods
  private storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private storeCurrentTenant(tenant: UserTenant): void {
    localStorage.setItem(this.TENANT_KEY, JSON.stringify(tenant));
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  private getStoredCurrentTenant(): UserTenant | null {
    const tenantJson = localStorage.getItem(this.TENANT_KEY);
    return tenantJson ? JSON.parse(tenantJson) : null;
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TENANT_KEY);
  }

  // Getters for current state
  get isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  get currentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  get currentToken(): string | null {
    return this.authStateSubject.value.token;
  }

  get currentTenant(): UserTenant | null {
    return this.authStateSubject.value.currentTenant;
  }
}
