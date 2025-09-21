import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h2>⚙️ Settings</h2>
        <p>Manage your account and application preferences</p>
      </div>

      <div class="settings-content">
        <div class="settings-sidebar">
          <nav class="settings-nav">
            <a href="#" class="nav-item active">👤 Profile</a>
            <a href="#" class="nav-item">🏢 Organization</a>
            <a href="#" class="nav-item">🔗 Integrations</a>
            <a href="#" class="nav-item">📊 Analytics</a>
            <a href="#" class="nav-item">🔔 Notifications</a>
            <a href="#" class="nav-item">🔒 Security</a>
            <a href="#" class="nav-item">💳 Billing</a>
          </nav>
        </div>

        <div class="settings-main">
          <div class="settings-section">
            <div class="section-header">
              <h3>Profile Information</h3>
              <p>Update your personal information and preferences</p>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" class="form-control" [value]="getCurrentUser()?.firstName || ''" readonly>
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" class="form-control" [value]="getCurrentUser()?.lastName || ''" readonly>
              </div>
              <div class="form-group full-width">
                <label>Email Address</label>
                <input type="email" class="form-control" [value]="getCurrentUser()?.email || ''" readonly>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <h3>Current Organization</h3>
              <p>Your role and permissions in the current organization</p>
            </div>

            <div class="org-info" *ngIf="authService.authState$ | async as authState">
              <div class="org-card">
                <div class="org-details">
                  <h4>{{ authState.currentTenant?.tenantName || 'No Organization Selected' }}</h4>
                  <p class="org-role">{{ authState.currentTenant?.role || 'No Role' }}</p>
                </div>
                <div class="org-actions">
                  <button class="btn btn-outline" *ngIf="authState.user && authState.user.tenants.length > 1">
                    Switch Organization
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <h3>Connected Platforms</h3>
              <p>Manage your social media platform connections</p>
            </div>

            <div class="platforms-grid">
              <div class="platform-card">
                <div class="platform-info">
                  <span class="platform-icon">📷</span>
                  <div>
                    <h4>Instagram</h4>
                    <p class="platform-status disconnected">Not Connected</p>
                  </div>
                </div>
                <button class="btn btn-primary">Connect</button>
              </div>

              <div class="platform-card">
                <div class="platform-info">
                  <span class="platform-icon">💼</span>
                  <div>
                    <h4>LinkedIn</h4>
                    <p class="platform-status disconnected">Not Connected</p>
                  </div>
                </div>
                <button class="btn btn-primary">Connect</button>
              </div>

              <div class="platform-card">
                <div class="platform-info">
                  <span class="platform-icon">🐦</span>
                  <div>
                    <h4>Twitter</h4>
                    <p class="platform-status disconnected">Not Connected</p>
                  </div>
                </div>
                <button class="btn btn-primary">Connect</button>
              </div>

              <div class="platform-card">
                <div class="platform-info">
                  <span class="platform-icon">📘</span>
                  <div>
                    <h4>Facebook</h4>
                    <p class="platform-status disconnected">Not Connected</p>
                  </div>
                </div>
                <button class="btn btn-primary">Connect</button>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <h3>Preferences</h3>
              <p>Customize your application experience</p>
            </div>

            <div class="preferences-list">
              <div class="preference-item">
                <div class="preference-info">
                  <h4>Email Notifications</h4>
                  <p>Receive email updates about your content and team activity</p>
                </div>
                <label class="toggle">
                  <input type="checkbox" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="preference-item">
                <div class="preference-info">
                  <h4>Push Notifications</h4>
                  <p>Get browser notifications for important updates</p>
                </div>
                <label class="toggle">
                  <input type="checkbox">
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="preference-item">
                <div class="preference-info">
                  <h4>Auto-save Drafts</h4>
                  <p>Automatically save your work as you type</p>
                </div>
                <label class="toggle">
                  <input type="checkbox" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }

    .page-header p {
      margin: 0;
      font-size: 16px;
      color: #6c757d;
    }

    .settings-content {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 32px;
    }

    .settings-sidebar {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 24px 0;
      height: fit-content;
    }

    .settings-nav {
      display: flex;
      flex-direction: column;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      color: #6c757d;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .nav-item.active {
      background: #e3f2fd;
      color: #1976d2;
      border-right: 3px solid #1976d2;
    }

    .settings-main {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .settings-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .section-header {
      padding: 24px;
      border-bottom: 1px solid #f8f9fa;
    }

    .section-header h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .section-header p {
      margin: 0;
      font-size: 14px;
      color: #6c757d;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 24px;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 14px;
      background: #f8f9fa;
      color: #6c757d;
      box-sizing: border-box;
    }

    .org-info {
      padding: 24px;
    }

    .org-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .org-details h4 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .org-role {
      margin: 0;
      font-size: 14px;
      color: #6c757d;
      text-transform: uppercase;
      font-weight: 500;
    }

    .platforms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 24px;
    }

    .platform-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      transition: border-color 0.2s ease;
    }

    .platform-card:hover {
      border-color: #3498db;
    }

    .platform-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .platform-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .platform-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .platform-status {
      margin: 0;
      font-size: 12px;
      font-weight: 500;
    }

    .platform-status.connected {
      color: #27ae60;
    }

    .platform-status.disconnected {
      color: #e74c3c;
    }

    .preferences-list {
      padding: 24px;
    }

    .preference-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .preference-item:last-child {
      border-bottom: none;
    }

    .preference-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .preference-info p {
      margin: 0;
      font-size: 14px;
      color: #6c757d;
    }

    .toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.3s;
      border-radius: 24px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    .toggle input:checked + .toggle-slider {
      background-color: #3498db;
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(26px);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #dee2e6;
      color: #6c757d;
    }

    .btn-outline:hover {
      background: #f8f9fa;
      color: #495057;
    }

    @media (max-width: 768px) {
      .settings-content {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .settings-sidebar {
        order: 2;
      }

      .settings-nav {
        flex-direction: row;
        overflow-x: auto;
        padding: 0 12px;
      }

      .nav-item {
        white-space: nowrap;
        border-right: none;
        border-bottom: 3px solid transparent;
      }

      .nav-item.active {
        border-right: none;
        border-bottom-color: #1976d2;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .platforms-grid {
        grid-template-columns: 1fr;
      }

      .platform-card, .preference-item {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .org-card {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
        text-align: center;
      }
    }
  `]
})
export class SettingsComponent {
  public readonly authService = inject(AuthService);

  getCurrentUser() {
    return this.authService.currentUser;
  }
}
