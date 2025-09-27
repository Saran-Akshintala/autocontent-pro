import { Route } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    canActivate: [GuestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent)
      },
      {
        path: 'posts',
        loadComponent: () => import('./features/posts/posts.component').then(m => m.PostsComponent)
      },
      {
        path: 'approvals',
        loadComponent: () => import('./features/approvals/approvals.component').then(m => m.ApprovalsComponent)
      },
      {
        path: 'ai-orchestrator',
        loadComponent: () => import('./features/ai-orchestrator/ai-orchestrator.component').then(m => m.AiOrchestratorComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      // Redirect old routes to Settings tabs
      {
        path: 'analytics',
        redirectTo: '/settings?tab=analytics'
      },
      {
        path: 'billing',
        redirectTo: '/settings?tab=billing'
      },
      {
        path: 'affiliate',
        redirectTo: '/settings?tab=affiliate'
      },
      {
        path: 'admin',
        redirectTo: '/settings?tab=admin'
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
