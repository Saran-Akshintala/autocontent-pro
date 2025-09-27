import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';

interface TenantSettings {
  id: string;
  name: string;
  plan: string;
  whatsappMode: string;
  whiteLabel?: {
    logoUrl?: string;
    primaryColor?: string;
    supportEmail?: string;
  };
  defaultWaSender?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantStats {
  brandsCount: number;
  postsCount: number;
  usersCount: number;
  whatsappSessions: number;
  lastActivity?: Date;
}

interface WhatsAppSession {
  id: string;
  phoneNumber?: string;
  status?: string;
  lastSeen?: Date;
  createdAt: Date;
  isDefault: boolean;
}

interface BrandManagement {
  id: string;
  name: string;
  timezone: string;
  postsCount: number;
  lastActivity?: Date;
  createdAt: Date;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="admin-container">
      <div class="admin-header">
        <h1>🏢 Agency Admin</h1>
        <p>Manage your organization, brands, staff, and white-label settings</p>
      </div>

      <!-- Stats Overview -->
      <div class="stats-grid" *ngIf="stats">
        <div class="stat-card">
          <div class="stat-icon">🏷️</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.brandsCount }}</div>
            <div class="stat-label">Brands</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.postsCount }}</div>
            <div class="stat-label">Posts</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.usersCount }}</div>
            <div class="stat-label">Team Members</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📱</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.whatsappSessions }}</div>
            <div class="stat-label">WhatsApp Sessions</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'settings'"
          (click)="activeTab = 'settings'">
          ⚙️ Organization Settings
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'branding'"
          (click)="activeTab = 'branding'">
          🎨 White-Label Branding
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'whatsapp'"
          (click)="activeTab = 'whatsapp'">
          📱 WhatsApp Setup
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'brands'"
          (click)="activeTab = 'brands'">
          🏷️ Brand Management
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'staff'"
          (click)="activeTab = 'staff'">
          👥 Staff Management
        </button>
      </div>

      <!-- Organization Settings Tab -->
      <div class="tab-content" *ngIf="activeTab === 'settings'">
        <div class="settings-section">
          <h2>Organization Settings</h2>
          <form [formGroup]="settingsForm" (ngSubmit)="updateSettings()" *ngIf="settingsForm">
            <div class="form-group">
              <label for="orgName">Organization Name</label>
              <input 
                type="text" 
                id="orgName" 
                formControlName="name"
                class="form-control"
                placeholder="Enter organization name">
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="settingsForm.invalid || loading">
                {{ loading ? '⏳ Saving...' : '💾 Save Settings' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- White-Label Branding Tab -->
      <div class="tab-content" *ngIf="activeTab === 'branding'">
        <div class="branding-section">
          <h2>White-Label Branding</h2>
          <p>Customize the appearance of your AutoContent Pro instance</p>
          
          <form [formGroup]="brandingForm" (ngSubmit)="updateBranding()" *ngIf="brandingForm">
            <div class="form-group">
              <label for="logoUrl">Logo URL</label>
              <input 
                type="url" 
                id="logoUrl" 
                formControlName="logoUrl"
                class="form-control"
                placeholder="https://example.com/logo.png">
              <small class="form-help">URL to your organization's logo (recommended: 200x80px)</small>
            </div>

            <div class="form-group">
              <label for="primaryColor">Primary Color</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  id="primaryColor" 
                  formControlName="primaryColor"
                  class="color-picker">
                <input 
                  type="text" 
                  formControlName="primaryColor"
                  class="form-control"
                  placeholder="#3B82F6">
              </div>
              <small class="form-help">Primary brand color for buttons, links, and accents</small>
            </div>

            <div class="form-group">
              <label for="supportEmail">Support Email</label>
              <input 
                type="email" 
                id="supportEmail" 
                formControlName="supportEmail"
                class="form-control"
                placeholder="support@yourcompany.com">
              <small class="form-help">Contact email shown to users for support</small>
            </div>

            <!-- Preview -->
            <div class="branding-preview" *ngIf="brandingForm.get('primaryColor')?.value">
              <h3>Preview</h3>
              <div class="preview-card" [style.border-color]="brandingForm.get('primaryColor')?.value">
                <div class="preview-header" [style.background-color]="brandingForm.get('primaryColor')?.value">
                  <img 
                    *ngIf="brandingForm.get('logoUrl')?.value" 
                    [src]="brandingForm.get('logoUrl')?.value" 
                    alt="Logo Preview"
                    class="preview-logo">
                  <span *ngIf="!brandingForm.get('logoUrl')?.value" class="preview-logo-placeholder">
                    Your Logo
                  </span>
                </div>
                <div class="preview-content">
                  <button class="preview-button" [style.background-color]="brandingForm.get('primaryColor')?.value">
                    Sample Button
                  </button>
                  <p>This is how your branding will appear to users.</p>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="brandingForm.invalid || loading">
                {{ loading ? '⏳ Saving...' : '🎨 Save Branding' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- WhatsApp Setup Tab -->
      <div class="tab-content" *ngIf="activeTab === 'whatsapp'">
        <div class="whatsapp-section">
          <h2>WhatsApp Setup</h2>
          <p>Manage WhatsApp sessions and set default sender</p>
          
          <div class="whatsapp-sessions" *ngIf="whatsappSessions.length > 0; else noSessions">
            <div class="session-card" *ngFor="let session of whatsappSessions">
              <div class="session-info">
                <div class="session-phone">
                  📱 {{ session.phoneNumber || 'Unknown Number' }}
                  <span class="default-badge" *ngIf="session.isDefault">DEFAULT</span>
                </div>
                <div class="session-status" [class]="'status-' + (session.status || 'unknown')">
                  {{ session.status || 'Unknown' }}
                </div>
                <div class="session-meta">
                  Last seen: {{ session.lastSeen | date:'medium' || 'Never' }}
                </div>
              </div>
              <div class="session-actions">
                <button 
                  class="btn btn-secondary"
                  *ngIf="!session.isDefault"
                  (click)="setDefaultSender(session.id)">
                  Set as Default
                </button>
              </div>
            </div>
          </div>

          <ng-template #noSessions>
            <div class="empty-state">
              <div class="empty-icon">📱</div>
              <h3>No WhatsApp Sessions</h3>
              <p>Connect a WhatsApp session to enable approval notifications and automation.</p>
              <button class="btn btn-primary" (click)="connectWhatsApp()">
                📱 Connect WhatsApp
              </button>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Brand Management Tab -->
      <div class="tab-content" *ngIf="activeTab === 'brands'">
        <div class="brands-section">
          <div class="section-header">
            <h2>Brand Management</h2>
            <button class="btn btn-primary" (click)="createBrand()">
              ➕ Create Brand
            </button>
          </div>
          
          <div class="brands-grid" *ngIf="brands.length > 0; else noBrands">
            <div class="brand-card" *ngFor="let brand of brands">
              <div class="brand-info">
                <h3>{{ brand.name }}</h3>
                <div class="brand-meta">
                  <span>🌍 {{ brand.timezone }}</span>
                  <span>📝 {{ brand.postsCount }} posts</span>
                </div>
                <div class="brand-activity">
                  Last activity: {{ brand.lastActivity | date:'medium' || 'No activity' }}
                </div>
              </div>
              <div class="brand-actions">
                <button class="btn btn-secondary" (click)="editBrand(brand)">
                  ✏️ Edit
                </button>
                <button class="btn btn-danger" (click)="deleteBrand(brand)">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>

          <ng-template #noBrands>
            <div class="empty-state">
              <div class="empty-icon">🏷️</div>
              <h3>No Brands Created</h3>
              <p>Create your first brand to start managing content.</p>
              <button class="btn btn-primary" (click)="createBrand()">
                ➕ Create First Brand
              </button>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Staff Management Tab -->
      <div class="tab-content" *ngIf="activeTab === 'staff'">
        <div class="staff-section">
          <div class="section-header">
            <h2>Staff Management</h2>
            <button class="btn btn-primary" (click)="inviteStaff()">
              ➕ Invite Staff
            </button>
          </div>
          
          <div class="staff-placeholder">
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <h3>Staff Management</h3>
              <p>Staff invitation and management features coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .admin-header {
      margin-bottom: 32px;
    }

    .admin-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .admin-header p {
      color: #6b7280;
      font-size: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 8px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      color: #6b7280;
      font-size: 14px;
    }

    .tabs {
      display: flex;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 32px;
      overflow-x: auto;
    }

    .tab-button {
      background: none;
      border: none;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: #3b82f6;
    }

    .tab-button.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }

    .tab-content {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-help {
      display: block;
      color: #6b7280;
      font-size: 12px;
      margin-top: 4px;
    }

    .color-input-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .color-picker {
      width: 48px;
      height: 48px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      cursor: pointer;
    }

    .branding-preview {
      margin-top: 24px;
      padding: 24px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .preview-card {
      background: white;
      border-radius: 8px;
      border: 2px solid;
      overflow: hidden;
      max-width: 300px;
    }

    .preview-header {
      padding: 16px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-logo {
      max-height: 32px;
      max-width: 120px;
    }

    .preview-logo-placeholder {
      font-weight: 600;
    }

    .preview-content {
      padding: 16px;
    }

    .preview-button {
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .whatsapp-sessions {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .session-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .session-phone {
      font-weight: 600;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .default-badge {
      background: #10b981;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    .session-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      margin: 4px 0;
    }

    .status-connected {
      background: #d1fae5;
      color: #065f46;
    }

    .status-disconnected {
      background: #fee2e2;
      color: #991b1b;
    }

    .session-meta {
      font-size: 12px;
      color: #6b7280;
    }

    .brands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .brand-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
    }

    .brand-info h3 {
      margin: 0 0 8px 0;
      color: #1f2937;
    }

    .brand-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      font-size: 14px;
      color: #6b7280;
    }

    .brand-activity {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 16px;
    }

    .brand-actions {
      display: flex;
      gap: 8px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      color: #1f2937;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 24px;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-actions {
      margin-top: 32px;
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activeTab: string = 'settings';
  loading = false;
  
  settings: TenantSettings | null = null;
  stats: TenantStats | null = null;
  whatsappSessions: WhatsAppSession[] = [];
  brands: BrandManagement[] = [];
  
  settingsForm: FormGroup;
  brandingForm: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toastService: ToastService,
    @Inject('API_BASE_URL') private env: { apiBaseUrl: string }
  ) {
    this.settingsForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.brandingForm = this.fb.group({
      logoUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      primaryColor: ['#3B82F6', [Validators.pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)]],
      supportEmail: ['', [Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadTenantData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTenantData(): void {
    // Load all tenant data
    Promise.all([
      this.loadTenantSettings(),
      this.loadTenantStats(),
      this.loadWhatsAppSessions(),
      this.loadBrands()
    ]).catch(error => {
      console.error('Failed to load tenant data:', error);
    });
  }

  loadTenantSettings(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{ success: boolean; data: TenantSettings }>(`${this.env.apiBaseUrl}/tenant/settings`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.settings = response.data;
            this.settingsForm.patchValue({
              name: this.settings.name
            });
            this.brandingForm.patchValue({
              logoUrl: this.settings.whiteLabel?.logoUrl || '',
              primaryColor: this.settings.whiteLabel?.primaryColor || '#3B82F6',
              supportEmail: this.settings.whiteLabel?.supportEmail || ''
            });
            resolve();
          },
          error: (error) => {
            console.error('Failed to load tenant settings:', error);
            reject(error);
          }
        });
    });
  }

  loadTenantStats(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{ success: boolean; data: TenantStats }>(`${this.env.apiBaseUrl}/tenant/stats`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.stats = response.data;
            resolve();
          },
          error: (error) => {
            console.error('Failed to load tenant stats:', error);
            reject(error);
          }
        });
    });
  }

  loadWhatsAppSessions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{ success: boolean; data: { sessions: WhatsAppSession[] } }>(`${this.env.apiBaseUrl}/tenant/whatsapp-sessions`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.whatsappSessions = response.data.sessions;
            resolve();
          },
          error: (error) => {
            console.error('Failed to load WhatsApp sessions:', error);
            this.whatsappSessions = [];
            resolve(); // Don't fail the whole load
          }
        });
    });
  }

  loadBrands(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{ brands: BrandManagement[] }>(`${this.env.apiBaseUrl}/brands`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.brands = response.brands.map(brand => ({
              ...brand,
              postsCount: 0, // TODO: Add posts count to brands API
              lastActivity: undefined // TODO: Add last activity to brands API
            }));
            resolve();
          },
          error: (error) => {
            console.error('Failed to load brands:', error);
            this.brands = [];
            resolve(); // Don't fail the whole load
          }
        });
    });
  }

  updateSettings(): void {
    if (this.settingsForm.invalid) return;

    this.loading = true;
    const formData = this.settingsForm.value;

    this.http.put<{ success: boolean; data: TenantSettings }>(`${this.env.apiBaseUrl}/tenant/settings`, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.settings = response.data;
          this.loading = false;
          this.toastService.success('Settings Updated', 'Organization settings have been saved successfully.');
        },
        error: (error) => {
          console.error('Failed to update settings:', error);
          this.loading = false;
          this.toastService.error('Update Failed', 'Failed to update organization settings.');
        }
      });
  }

  updateBranding(): void {
    if (this.brandingForm.invalid) return;

    this.loading = true;
    const formData = {
      whiteLabel: this.brandingForm.value
    };

    this.http.put<{ success: boolean; data: TenantSettings }>(`${this.env.apiBaseUrl}/tenant/settings`, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.settings = response.data;
          this.loading = false;
          this.toastService.success('Branding Updated', 'White-label branding has been saved successfully.');
          
          // Apply the new theme
          this.applyTheme(this.brandingForm.value.primaryColor);
        },
        error: (error) => {
          console.error('Failed to update branding:', error);
          this.loading = false;
          this.toastService.error('Update Failed', 'Failed to update branding settings.');
        }
      });
  }

  setDefaultSender(sessionId: string): void {
    this.http.put(`${this.env.apiBaseUrl}/tenant/whatsapp-sessions/default`, { sessionId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Default Sender Updated', 'WhatsApp default sender has been set.');
          this.loadWhatsAppSessions();
        },
        error: (error) => {
          console.error('Failed to set default sender:', error);
          this.toastService.error('Update Failed', 'Failed to set default WhatsApp sender.');
        }
      });
  }

  connectWhatsApp(): void {
    this.toastService.info('WhatsApp Connection', 'WhatsApp connection feature will be available soon.');
  }

  createBrand(): void {
    this.toastService.info('Create Brand', 'Brand creation feature will be available soon.');
  }

  editBrand(brand: BrandManagement): void {
    this.toastService.info('Edit Brand', `Editing ${brand.name} will be available soon.`);
  }

  deleteBrand(brand: BrandManagement): void {
    this.toastService.info('Delete Brand', `Deleting ${brand.name} will be available soon.`);
  }

  inviteStaff(): void {
    this.toastService.info('Invite Staff', 'Staff invitation feature will be available soon.');
  }

  private applyTheme(primaryColor: string): void {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
    }
  }
}
