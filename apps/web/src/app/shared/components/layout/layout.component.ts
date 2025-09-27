import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { User, UserTenant, AuthState } from '../../../core/models/auth.models';
// import { PostDrawerComponent } from '../../../features/posts/components/post-drawer/post-drawer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>🚀 AutoContent Pro</h2>
          <div class="user-info" *ngIf="authService.authState$ | async as authState">
            <div class="user-avatar">
              {{ getUserInitials(authState.user) }}
            </div>
            <div class="user-details">
              <div class="user-name">{{ getUserDisplayName(authState.user) }}</div>
              <div class="user-role" *ngIf="authState.currentTenant">
                {{ authState.currentTenant.role }} • {{ authState.currentTenant.tenantName }}
              </div>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <ul class="nav-list">
            <li class="nav-item">
              <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
                <span class="nav-icon">📊</span>
                <span class="nav-text">Dashboard</span>
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/calendar" routerLinkActive="active" class="nav-link">
                <span class="nav-icon">📅</span>
                <span class="nav-text">Calendar</span>
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/posts" routerLinkActive="active" class="nav-link">
                <span class="nav-icon">📝</span>
                <span class="nav-text">Posts</span>
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/approvals" routerLinkActive="active" class="nav-link">
                <span class="nav-icon">✅</span>
                <span class="nav-text">Approvals</span>
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/ai-orchestrator" routerLinkActive="active" class="nav-link">
                <span class="nav-icon">🤖</span>
                <span class="nav-text">AI Orchestrator</span>
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/settings" routerLinkActive="active" class="nav-link">
                <span class="nav-icon">⚙️</span>
                <span class="nav-text">Settings</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="sidebar-footer">
          <button class="logout-btn" (click)="logout()">
            <span class="nav-icon">🚪</span>
            <span class="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <header class="main-header">
          <div class="header-content">
            <h1 class="page-title">{{ getPageTitle() }}</h1>
            <div class="header-actions">
              <!-- Tenant Switcher -->
              <div class="tenant-switcher" *ngIf="authService.authState$ | async as authState">
                <select 
                  class="tenant-select" 
                  [value]="authState.currentTenant?.tenantId || ''"
                  (change)="onTenantChange($event)"
                  *ngIf="authState.user && authState.user.tenants.length > 1"
                >
                  <option value="" disabled>Select Tenant</option>
                  <option 
                    *ngFor="let tenant of authState.user.tenants" 
                    [value]="tenant.tenantId"
                  >
                    {{ tenant.tenantName }} ({{ tenant.role }})
                  </option>
                </select>
              </div>

            </div>
          </div>
        </header>

        <div class="content-area">
          <router-outlet></router-outlet>
          <!-- Global Post Drawer Overlay -->
          <!-- <app-post-drawer></app-post-drawer> -->
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      background: #f8f9fa;
    }

    /* Sidebar Styles */
    .sidebar {
      width: 280px;
      background: #2c3e50;
      color: white;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      overflow-y: auto;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid #34495e;
    }

    .sidebar-header h2 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 700;
      color: #ecf0f1;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3498db;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 14px;
      color: #ecf0f1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 12px;
      color: #bdc3c7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Navigation Styles */
    .sidebar-nav {
      flex: 1;
      padding: 20px 0;
    }

    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-item {
      margin-bottom: 4px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      color: #bdc3c7;
      text-decoration: none;
      transition: all 0.2s ease;
      border-right: 3px solid transparent;
    }

    .nav-link:hover {
      background: #34495e;
      color: #ecf0f1;
    }

    .nav-link.active {
      background: #34495e;
      color: #3498db;
      border-right-color: #3498db;
    }

    .nav-icon {
      font-size: 18px;
      width: 20px;
      text-align: center;
    }

    .nav-text {
      font-weight: 500;
      font-size: 14px;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid #34495e;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 20px;
      background: transparent;
      border: 1px solid #e74c3c;
      color: #e74c3c;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
    }

    .logout-btn:hover {
      background: #e74c3c;
      color: white;
    }

    /* Main Content Styles */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin-left: 280px;
    }

    .main-header {
      background: white;
      border-bottom: 1px solid #e9ecef;
      padding: 0 32px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tenant-select {
      padding: 8px 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: white;
      font-size: 14px;
      color: #495057;
      min-width: 200px;
    }

    .tenant-select:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    /* Content Area */
    .content-area {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      background: #f8f9fa;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .sidebar {
        width: 240px;
      }
      
      .content-area {
        padding: 20px;
      }
      
      .page-title {
        font-size: 20px;
      }
    }
  `]
})
export class LayoutComponent implements OnInit {
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    console.log('LayoutComponent initialized');
    // Initialize theme service
    this.themeService.loadTenantBranding();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getUserInitials(user: User | null): string {
    if (!user) return '?';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    
    return user.email.charAt(0).toUpperCase();
  }

  getUserDisplayName(user: User | null): string {
    if (!user) return 'Unknown User';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    return user.email;
  }

  getPageTitle(): string {
    const url = this.router.url;
    const routes: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/calendar': 'Calendar',
      '/posts': 'Posts',
      '/approvals': 'Approvals',
      '/analytics': 'Analytics',
      '/ai-orchestrator': 'AI Orchestrator',
      '/settings': 'Settings'
    };
    
    return routes[url] || 'AutoContent Pro';
  }

  onTenantChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const tenantId = target.value;
    
    this.authService.authState$.subscribe((authState: AuthState) => {
      if (authState.user) {
        const selectedTenant = authState.user.tenants.find((t: UserTenant) => t.tenantId === tenantId);
        if (selectedTenant) {
          this.authService.switchTenant(selectedTenant);
        }
      }
    }).unsubscribe();
  }

}
