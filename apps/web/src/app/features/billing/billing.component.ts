import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService } from '../../core/services/billing.service';
import { ToastService } from '../../core/services/toast.service';
import { BillingSummary, PlanLimits } from '@autocontent-pro/types';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="billing-page">
      <div class="billing-header">
        <h1>Billing & Usage</h1>
        <p>Manage your subscription and monitor usage</p>
      </div>

      <div class="billing-content" *ngIf="billingSummary; else loading">
        <!-- Current Plan Card -->
        <div class="plan-card current-plan">
          <div class="plan-header">
            <div class="plan-info">
              <h2>Current Plan</h2>
              <div class="plan-badge" [ngClass]="getPlanBadgeClass(billingSummary.currentPlan.name)">
                {{ billingSummary.currentPlan.name }}
              </div>
            </div>
            <div class="plan-price">
              {{ formatPrice(billingSummary.currentPlan.price) }}
            </div>
          </div>
          
          <div class="plan-features">
            <h3>Plan Features</h3>
            <ul>
              <li *ngFor="let feature of billingSummary.currentPlan.features">
                <span class="feature-icon">✓</span>
                {{ feature }}
              </li>
            </ul>
          </div>

          <div class="plan-actions">
            <button 
              class="btn-secondary" 
              (click)="openBillingPortal()"
              [disabled]="isLoading">
              Manage Billing
            </button>
          </div>
        </div>

        <!-- Usage Meters -->
        <div class="usage-section">
          <h2>Usage This Month</h2>
          <div class="usage-grid">
            <!-- Post Credits -->
            <div class="usage-card">
              <div class="usage-header">
                <h3>Post Credits</h3>
                <span class="usage-count">
                  {{ billingSummary.usage.postCreditsUsed }} / {{ billingSummary.usage.postCreditsLimit }}
                </span>
              </div>
              <div class="usage-bar">
                <div 
                  class="usage-fill" 
                  [style.width.%]="billingSummary.percentages.postCredits"
                  [style.background-color]="getUsageColor(billingSummary.percentages.postCredits)">
                </div>
              </div>
              <div class="usage-status" [style.color]="getUsageColor(billingSummary.percentages.postCredits)">
                {{ getUsageStatus(billingSummary.percentages.postCredits) }} ({{ billingSummary.percentages.postCredits }}%)
              </div>
            </div>

            <!-- Image Credits -->
            <div class="usage-card">
              <div class="usage-header">
                <h3>Image Credits</h3>
                <span class="usage-count">
                  {{ billingSummary.usage.imageCreditsUsed }} / {{ billingSummary.usage.imageCreditsLimit }}
                </span>
              </div>
              <div class="usage-bar">
                <div 
                  class="usage-fill" 
                  [style.width.%]="billingSummary.percentages.imageCredits"
                  [style.background-color]="getUsageColor(billingSummary.percentages.imageCredits)">
                </div>
              </div>
              <div class="usage-status" [style.color]="getUsageColor(billingSummary.percentages.imageCredits)">
                {{ getUsageStatus(billingSummary.percentages.imageCredits) }} ({{ billingSummary.percentages.imageCredits }}%)
              </div>
            </div>

            <!-- Brands -->
            <div class="usage-card">
              <div class="usage-header">
                <h3>Brands</h3>
                <span class="usage-count">
                  {{ billingSummary.usage.brandsCount }} / {{ billingSummary.usage.brandsLimit }}
                </span>
              </div>
              <div class="usage-bar">
                <div 
                  class="usage-fill" 
                  [style.width.%]="billingSummary.percentages.brands"
                  [style.background-color]="getUsageColor(billingSummary.percentages.brands)">
                </div>
              </div>
              <div class="usage-status" [style.color]="getUsageColor(billingSummary.percentages.brands)">
                {{ getUsageStatus(billingSummary.percentages.brands) }} ({{ billingSummary.percentages.brands }}%)
              </div>
            </div>
          </div>

          <div class="usage-info">
            <p>Usage resets on {{ formatDate(billingSummary.usage.billingPeriodEnd) }}</p>
          </div>
        </div>

        <!-- Upsell Banner -->
        <div 
          class="upsell-banner" 
          *ngIf="billingSummary.upsell.showUpsell"
          [ngClass]="'urgency-' + billingSummary.upsell.urgency">
          <div class="upsell-content">
            <div class="upsell-icon">
              <span *ngIf="billingSummary.upsell.urgency === 'high'">⚠️</span>
              <span *ngIf="billingSummary.upsell.urgency === 'medium'">📈</span>
              <span *ngIf="billingSummary.upsell.urgency === 'low'">💡</span>
            </div>
            <div class="upsell-text">
              <h3>{{ getUpsellTitle(billingSummary.upsell.urgency) }}</h3>
              <p>{{ billingSummary.upsell.reason }}</p>
            </div>
            <button 
              class="btn-primary upsell-btn" 
              (click)="showUpgradePlans()"
              [disabled]="isLoading">
              Upgrade Now
            </button>
          </div>
        </div>

        <!-- Available Plans -->
        <div class="plans-section" *ngIf="showPlans">
          <h2>Available Plans</h2>
          <div class="plans-grid">
            <div 
              class="plan-card" 
              *ngFor="let plan of availablePlans" 
              [ngClass]="{ 'current': plan.name === billingSummary.currentPlan.name, 'recommended': plan.name === 'GROWTH' }">
              
              <div class="plan-header">
                <h3>{{ plan.name }}</h3>
                <div class="plan-price">{{ formatPrice(plan.limits.price) }}</div>
                <div class="plan-badge recommended" *ngIf="plan.name === 'GROWTH'">
                  Most Popular
                </div>
                <div class="plan-badge current" *ngIf="plan.name === billingSummary.currentPlan.name">
                  Current Plan
                </div>
              </div>

              <div class="plan-limits">
                <div class="limit-item">
                  <span class="limit-label">Post Credits</span>
                  <span class="limit-value">{{ plan.limits.postCredits }}</span>
                </div>
                <div class="limit-item">
                  <span class="limit-label">Image Credits</span>
                  <span class="limit-value">{{ plan.limits.imageCredits }}</span>
                </div>
                <div class="limit-item">
                  <span class="limit-label">Max Brands</span>
                  <span class="limit-value">{{ plan.limits.maxBrands }}</span>
                </div>
              </div>

              <div class="plan-features">
                <ul>
                  <li *ngFor="let feature of plan.limits.features">
                    <span class="feature-icon">✓</span>
                    {{ feature }}
                  </li>
                </ul>
              </div>

              <div class="plan-actions">
                <button 
                  *ngIf="plan.name !== billingSummary.currentPlan.name"
                  class="btn-primary" 
                  (click)="upgradeToPlan(plan.name)"
                  [disabled]="isLoading">
                  Upgrade to {{ plan.name }}
                </button>
                <button 
                  *ngIf="plan.name === billingSummary.currentPlan.name"
                  class="btn-secondary" 
                  disabled>
                  Current Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <ng-template #loading>
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading billing information...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .billing-page {
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .billing-header {
      margin-bottom: 32px;
    }

    .billing-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .billing-header p {
      font-size: 16px;
      color: var(--text-secondary);
    }

    .billing-content {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    /* Plan Card */
    .plan-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-light);
    }

    .plan-card.current-plan {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color-light);
    }

    .plan-card.recommended {
      border-color: #10b981;
      position: relative;
    }

    .plan-card.recommended::before {
      content: 'Recommended';
      position: absolute;
      top: -12px;
      left: 24px;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .plan-info h2, .plan-info h3 {
      margin: 0 0 8px 0;
      color: var(--text-primary);
    }

    .plan-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .plan-badge.current {
      background: var(--primary-color-light);
      color: var(--primary-color);
    }

    .plan-badge.recommended {
      background: #d1fae5;
      color: #065f46;
    }

    .plan-price {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .plan-features ul, .plan-limits {
      list-style: none;
      padding: 0;
      margin: 0 0 24px 0;
    }

    .plan-features li, .limit-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .plan-features li:last-child, .limit-item:last-child {
      border-bottom: none;
    }

    .feature-icon {
      color: #10b981;
      font-weight: 600;
    }

    .limit-item {
      justify-content: space-between;
    }

    .limit-label {
      color: var(--text-secondary);
    }

    .limit-value {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Usage Section */
    .usage-section h2 {
      margin-bottom: 24px;
      color: var(--text-primary);
    }

    .usage-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 16px;
    }

    .usage-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-light);
    }

    .usage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .usage-header h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 16px;
    }

    .usage-count {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .usage-bar {
      height: 8px;
      background: var(--gray-200);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .usage-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .usage-status {
      font-size: 14px;
      font-weight: 600;
    }

    .usage-info {
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }

    /* Upsell Banner */
    .upsell-banner {
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid;
    }

    .upsell-banner.urgency-high {
      background: #fef2f2;
      border-color: #ef4444;
    }

    .upsell-banner.urgency-medium {
      background: #fffbeb;
      border-color: #f59e0b;
    }

    .upsell-banner.urgency-low {
      background: #f0f9ff;
      border-color: #3b82f6;
    }

    .upsell-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .upsell-icon {
      font-size: 24px;
    }

    .upsell-text {
      flex: 1;
    }

    .upsell-text h3 {
      margin: 0 0 4px 0;
      color: var(--text-primary);
    }

    .upsell-text p {
      margin: 0;
      color: var(--text-secondary);
    }

    .upsell-btn {
      white-space: nowrap;
    }

    /* Plans Grid */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    /* Buttons */
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-color-hover);
    }

    .btn-secondary {
      background: white;
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--gray-50);
    }

    .btn-primary:disabled, .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      text-align: center;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--gray-200);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .billing-page {
        padding: 16px;
      }

      .usage-grid {
        grid-template-columns: 1fr;
      }

      .plans-grid {
        grid-template-columns: 1fr;
      }

      .upsell-content {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class BillingComponent implements OnInit, OnDestroy {
  private readonly billingService = inject(BillingService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  billingSummary: BillingSummary | null = null;
  availablePlans: { name: string; limits: PlanLimits }[] = [];
  showPlans = false;
  isLoading = false;

  ngOnInit(): void {
    this.loadBillingData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBillingData(): void {
    console.log('💳 BillingComponent: Starting loadBillingData');
    this.isLoading = true;
    
    console.log('💳 BillingComponent: Calling billingService.getBillingSummary()');
    this.billingService.getBillingSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          console.log('✅ BillingComponent: Received billing summary:', summary);
          this.billingSummary = summary;
          this.availablePlans = Object.entries(summary.availablePlans).map(([name, limits]) => ({
            name,
            limits
          }));
          console.log('✅ BillingComponent: Available plans:', this.availablePlans);
          this.isLoading = false;
          console.log('✅ BillingComponent: Loading complete, isLoading =', this.isLoading);
        },
        error: (error) => {
          console.error('❌ BillingComponent: Failed to load billing data:', error);
          console.error('❌ BillingComponent: Error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText
          });
          this.toastService.error('Failed to load billing information');
          this.isLoading = false;
          console.log('❌ BillingComponent: Loading failed, isLoading =', this.isLoading);
        }
      });
  }

  showUpgradePlans(): void {
    this.showPlans = true;
  }

  upgradeToPlan(planName: string): void {
    this.isLoading = true;
    
    this.billingService.getUpgradeUrl(planName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Open upgrade URL in new tab
          window.open(response.upgradeUrl, '_blank');
          this.toastService.info('Redirecting to upgrade page...');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to get upgrade URL:', error);
          this.toastService.error('Failed to initiate upgrade');
          this.isLoading = false;
        }
      });
  }

  openBillingPortal(): void {
    this.isLoading = true;
    
    this.billingService.getBillingPortalUrl()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Open billing portal in new tab
          window.open(response.portalUrl, '_blank');
          this.toastService.info('Opening billing portal...');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to get billing portal URL:', error);
          this.toastService.error('Failed to open billing portal');
          this.isLoading = false;
        }
      });
  }

  getPlanBadgeClass(planName: string): string {
    return this.billingService.getPlanBadgeColor(planName);
  }

  getUsageColor(percentage: number): string {
    return this.billingService.getUsageColor(percentage);
  }

  getUsageStatus(percentage: number): string {
    return this.billingService.getUsageStatus(percentage);
  }

  formatPrice(price: number): string {
    return this.billingService.formatPrice(price);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getUpsellTitle(urgency: string): string {
    switch (urgency) {
      case 'high': return 'Usage Limit Reached';
      case 'medium': return 'Approaching Limits';
      case 'low': return 'Unlock More Features';
      default: return 'Upgrade Your Plan';
    }
  }
}
