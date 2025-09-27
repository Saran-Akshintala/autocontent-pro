import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, interval } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ENVIRONMENT, Environment } from '../../core/tokens/environment.token';
import { AnalyticsComponent } from '../analytics/analytics.component';
import { AdminComponent } from '../admin/admin.component';
import { BillingComponent } from '../billing/billing.component';
import { AffiliateComponent } from '../affiliate/affiliate.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, AnalyticsComponent, AdminComponent, BillingComponent, AffiliateComponent],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h2>⚙️ Settings</h2>
        <p>Manage your account and application preferences</p>
      </div>

      <div class="settings-content">
        <div class="settings-sidebar">
          <nav class="settings-nav">
            <button class="nav-item" [class.active]="activeTab === 'profile'" (click)="setActiveTab('profile')">👤 Profile</button>
            <button class="nav-item" [class.active]="activeTab === 'integrations'" (click)="setActiveTab('integrations')">🔗 Integrations</button>
            <button class="nav-item" [class.active]="activeTab === 'analytics'" (click)="setActiveTab('analytics')">📊 Analytics</button>
            <button class="nav-item" [class.active]="activeTab === 'billing'" (click)="setActiveTab('billing')">💳 Billing</button>
            <button class="nav-item" [class.active]="activeTab === 'affiliate'" (click)="setActiveTab('affiliate')">💰 Affiliate</button>
            <button class="nav-item" [class.active]="activeTab === 'admin'" (click)="setActiveTab('admin')">🛡️ Admin</button>
          </nav>
        </div>

        <div class="settings-main">
          <!-- Profile Tab -->
          <div *ngIf="activeTab === 'profile'">
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
          </div>

          <!-- Integrations Tab -->
          <div *ngIf="activeTab === 'integrations'">
            <div class="settings-section">
              <div class="section-header">
                <h3>Connected Platforms</h3>
                <p>Manage your social media platform connections</p>
              </div>

              <div class="platforms-grid">
                <div class="platform-card">
                  <div class="platform-info">
                    <span class="platform-icon">💬</span>
                    <div>
                      <h4>WhatsApp</h4>
                      <p class="platform-status" [class.connected]="whatsappStatus?.isConnected" [class.disconnected]="!whatsappStatus?.isConnected">
                        {{ whatsappStatus?.isConnected ? 'Connected as ' + whatsappStatus.connectedName : 'Not Connected' }}
                      </p>
                    </div>
                  </div>
                  <button 
                    class="btn" 
                    [class.btn-danger]="whatsappStatus?.isConnected" 
                    [class.btn-primary]="!whatsappStatus?.isConnected"
                    [disabled]="whatsappConnecting"
                    (click)="whatsappStatus?.isConnected ? disconnectWhatsApp() : connectWhatsApp()">
                    {{ whatsappConnecting ? 'Connecting...' : (whatsappStatus?.isConnected ? 'Disconnect' : 'Connect') }}
                  </button>
                </div>

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

          <!-- Analytics Tab -->
          <div *ngIf="activeTab === 'analytics'" class="tab-content">
            <app-analytics></app-analytics>
          </div>

          <!-- Billing Tab -->
          <div *ngIf="activeTab === 'billing'" class="tab-content">
            <app-billing></app-billing>
          </div>

          <!-- Affiliate Tab -->
          <div *ngIf="activeTab === 'affiliate'" class="tab-content">
            <app-affiliate></app-affiliate>
          </div>

          <!-- Admin Tab -->
          <div *ngIf="activeTab === 'admin'" class="tab-content">
            <app-admin></app-admin>
          </div>
        </div>
      </div>

      <!-- WhatsApp QR Code Modal -->
      <div class="modal-overlay" *ngIf="showQRModal" (click)="closeQRModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📱 Connect WhatsApp</h3>
            <button class="modal-close" (click)="closeQRModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="qr-container" *ngIf="qrCodeData">
              <div class="qr-instructions">
                <h4>Scan QR Code with WhatsApp</h4>
                <ol>
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Scan the QR code shown on the right</li>
                </ol>
                <div class="terminal-note" *ngIf="!isQRCodeImage(qrCodeData)">
                  <p><strong>📟 Check Terminal:</strong> The QR code is also displayed in your terminal/console window.</p>
                </div>
              </div>
              <div class="qr-code">
                <div *ngIf="isQRCodeImage(qrCodeData); else qrPlaceholder">
                  <img [src]="qrCodeData" alt="WhatsApp QR Code" class="qr-image" />
                </div>
                <ng-template #qrPlaceholder>
                  <div class="qr-placeholder">
                    <div class="qr-icon">📱</div>
                    <p>QR Code Generated!</p>
                    <p class="qr-note">Please check your terminal/console to scan the QR code</p>
                  </div>
                </ng-template>
              </div>
            </div>
            <div class="loading-state" *ngIf="!qrCodeData && whatsappConnecting">
              <div class="spinner"></div>
              <p>Generating QR Code...</p>
            </div>
            <div class="success-state" *ngIf="whatsappStatus?.isConnected">
              <div class="success-icon">✅</div>
              <h4>WhatsApp Connected Successfully!</h4>
              <p>Connected as: {{ whatsappStatus.connectedName }}</p>
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
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
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

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .tab-content {
      width: 100%;
    }

    .tab-content > * {
      max-width: none;
      margin: 0;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #f8f9fa;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6c757d;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s ease;
    }

    .modal-close:hover {
      background: #f8f9fa;
    }

    .modal-body {
      padding: 24px;
    }

    .qr-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      align-items: start;
    }

    .qr-instructions h4 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .qr-instructions ol {
      margin: 0;
      padding-left: 20px;
      color: #6c757d;
      line-height: 1.6;
    }

    .qr-instructions li {
      margin-bottom: 8px;
    }

    .qr-code {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .qr-code img, .qr-image {
      max-width: 200px;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .terminal-note {
      margin-top: 16px;
      padding: 12px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
    }

    .terminal-note p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }

    .qr-placeholder {
      text-align: center;
      padding: 40px 20px;
    }

    .qr-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .qr-placeholder p {
      margin: 8px 0;
      color: #6c757d;
    }

    .qr-note {
      font-size: 12px !important;
      color: #856404 !important;
    }

    .loading-state, .success-state {
      text-align: center;
      padding: 40px 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .success-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .success-state h4 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #27ae60;
    }

    .success-state p {
      margin: 0;
      color: #6c757d;
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

      .qr-container {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .modal-content {
        width: 95%;
        margin: 20px;
      }
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  public readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly env = inject<Environment>(ENVIRONMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private destroy$ = new Subject<void>();

  // Tab management
  activeTab: string = 'profile';

  // WhatsApp connection state
  whatsappStatus: any = null;
  whatsappConnecting = false;
  showQRModal = false;
  qrCodeData: string | null = null;
  currentSessionId: string | null = null;

  ngOnInit(): void {
    // Check for tab parameter in URL
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tab = params['tab'];
      if (tab && ['profile', 'integrations', 'analytics', 'billing', 'affiliate', 'admin'].includes(tab)) {
        this.activeTab = tab;
      }
    });

    this.loadWhatsAppStatus();
    
    // Poll for status updates every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.whatsappConnecting || this.showQRModal) {
          this.loadWhatsAppStatus();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentUser() {
    return this.authService.currentUser;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Update URL with tab parameter
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  async loadWhatsAppStatus(): Promise<void> {
    try {
      const response = await this.http.get<any>(`${this.env.apiBaseUrl}/wa/status`)
        .pipe(takeUntil(this.destroy$))
        .toPromise();

      if (response && response.sessions && response.sessions.length > 0) {
        const activeSession = response.sessions.find((s: any) => s.isReady);
        this.whatsappStatus = {
          isConnected: !!activeSession,
          connectedName: activeSession?.connectedName || 'Unknown',
          connectedNumber: activeSession?.connectedNumber,
          sessionId: activeSession?.id
        };
        this.currentSessionId = activeSession?.id || null;

        // If we were connecting and now connected, close modal
        if (this.whatsappConnecting && this.whatsappStatus.isConnected) {
          this.whatsappConnecting = false;
          setTimeout(() => this.closeQRModal(), 2000); // Show success for 2 seconds
        }
      } else {
        this.whatsappStatus = { isConnected: false };
        this.currentSessionId = null;
      }
    } catch (error) {
      console.error('Error loading WhatsApp status:', error);
      this.whatsappStatus = { isConnected: false };
    }
  }

  async connectWhatsApp(): Promise<void> {
    try {
      this.whatsappConnecting = true;
      this.showQRModal = true;
      this.qrCodeData = null;

      const response = await this.http.post<any>(`${this.env.apiBaseUrl}/wa/connect`, {})
        .pipe(takeUntil(this.destroy$))
        .toPromise();

      if (response?.sessionId) {
        this.currentSessionId = response.sessionId;
        this.pollForQRCode();
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      this.whatsappConnecting = false;
      this.showQRModal = false;
      alert('Failed to connect WhatsApp. Please try again.');
    }
  }

  async pollForQRCode(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const response = await this.http.get<any>(`${this.env.apiBaseUrl}/wa/session/${this.currentSessionId}`)
        .pipe(takeUntil(this.destroy$))
        .toPromise();

      if (response?.qrCode) {
        // QR code can be either a data URL (image) or string
        this.qrCodeData = response.qrCode;
      } else if (response?.isReady) {
        // Connection successful
        this.whatsappConnecting = false;
        this.loadWhatsAppStatus();
      } else if (this.whatsappConnecting) {
        // Keep polling
        setTimeout(() => this.pollForQRCode(), 2000);
      }
    } catch (error) {
      console.error('Error polling for QR code:', error);
      if (this.whatsappConnecting) {
        setTimeout(() => this.pollForQRCode(), 2000);
      }
    }
  }

  async disconnectWhatsApp(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await this.http.post(`${this.env.apiBaseUrl}/wa/disconnect/${this.currentSessionId}`, {})
        .pipe(takeUntil(this.destroy$))
        .toPromise();

      this.whatsappStatus = { isConnected: false };
      this.currentSessionId = null;
      alert('WhatsApp disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      alert('Failed to disconnect WhatsApp. Please try again.');
    }
  }

  closeQRModal(): void {
    this.showQRModal = false;
    this.qrCodeData = null;
    if (this.whatsappConnecting && !this.whatsappStatus?.isConnected) {
      this.whatsappConnecting = false;
    }
  }

  isQRCodeImage(qrCode: string | null): boolean {
    return qrCode ? qrCode.startsWith('data:image/') : false;
  }
}
