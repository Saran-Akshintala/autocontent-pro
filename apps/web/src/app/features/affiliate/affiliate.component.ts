import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AffiliateService } from '../../core/services/affiliate.service';
import { ToastService } from '../../core/services/toast.service';

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
}

interface ReferralInfo {
  id: string;
  tenantName: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
  signupDate: Date;
  activatedAt?: Date;
  monthlyRevenue: number;
  totalCommissions: number;
}

interface PayoutInfo {
  id: string;
  amount: number;
  currency: string;
  period: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  dueDate: Date;
  paidAt?: Date;
  tenantName: string;
}

interface AffiliateDashboard {
  code: string;
  stats: AffiliateStats;
  referrals: ReferralInfo[];
  payouts: PayoutInfo[];
}

@Component({
  selector: 'app-affiliate',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="affiliate-container">
      <div class="affiliate-header">
        <h1>💰 Affiliate Program</h1>
        <p class="subtitle">Earn 30% commission on every referral</p>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading affiliate data...</p>
      </div>

      <div *ngIf="!isLoading && affiliateData" class="affiliate-content">
        <!-- Affiliate Code Section -->
        <div class="affiliate-code-section">
          <div class="code-card">
            <h2>🔗 Your Affiliate Code</h2>
            <div class="code-display">
              <span class="code">{{ affiliateData.code }}</span>
              <button class="copy-btn" (click)="copyAffiliateCode()" [disabled]="copying">
                {{ copying ? 'Copied!' : '📋 Copy Link' }}
              </button>
            </div>
            <p class="code-description">
              Share this link to earn 30% commission on every new customer
            </p>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <h3>{{ affiliateData.stats.totalReferrals }}</h3>
              <p>Total Referrals</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <h3>{{ affiliateData.stats.activeReferrals }}</h3>
              <p>Active Customers</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <h3>{{ formatCurrency(affiliateData.stats.totalEarnings) }}</h3>
              <p>Total Earnings</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <h3>{{ formatCurrency(affiliateData.stats.pendingPayouts) }}</h3>
              <p>Pending Payouts</p>
            </div>
          </div>
        </div>

        <!-- Referrals Table -->
        <div class="section">
          <h2>👥 Your Referrals</h2>
          <div class="table-container">
            <table class="referrals-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Signup Date</th>
                  <th>Monthly Revenue</th>
                  <th>Total Commission</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let referral of affiliateData.referrals" class="referral-row">
                  <td class="customer-cell">
                    <div class="customer-info">
                      <span class="customer-name">{{ referral.tenantName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="getStatusBadgeClass(referral.status)">
                      {{ referral.status }}
                    </span>
                  </td>
                  <td class="date-cell">
                    {{ referral.signupDate | date:'MMM d, y' }}
                  </td>
                  <td class="revenue-cell">
                    {{ formatCurrency(referral.monthlyRevenue) }}
                  </td>
                  <td class="commission-cell">
                    {{ formatCurrency(referral.totalCommissions) }}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div *ngIf="affiliateData.referrals.length === 0" class="empty-state">
              <div class="empty-icon">🎯</div>
              <h3>No referrals yet</h3>
              <p>Start sharing your affiliate link to earn commissions!</p>
            </div>
          </div>
        </div>

        <!-- Payouts History -->
        <div class="section">
          <h2>💳 Payout History</h2>
          <div class="table-container">
            <table class="payouts-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Paid Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let payout of affiliateData.payouts" class="payout-row">
                  <td class="period-cell">{{ payout.period }}</td>
                  <td class="customer-cell">{{ payout.tenantName }}</td>
                  <td class="amount-cell">{{ formatCurrency(payout.amount) }}</td>
                  <td>
                    <span class="status-badge" [ngClass]="getPayoutStatusBadgeClass(payout.status)">
                      {{ payout.status }}
                    </span>
                  </td>
                  <td class="date-cell">{{ payout.dueDate | date:'MMM d, y' }}</td>
                  <td class="date-cell">
                    {{ payout.paidAt ? (payout.paidAt | date:'MMM d, y') : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div *ngIf="affiliateData.payouts.length === 0" class="empty-state">
              <div class="empty-icon">💸</div>
              <h3>No payouts yet</h3>
              <p>Payouts will appear here once your referrals start paying.</p>
            </div>
          </div>
        </div>

        <!-- How It Works -->
        <div class="section">
          <h2>❓ How It Works</h2>
          <div class="how-it-works">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>Share Your Link</h3>
                <p>Copy your unique affiliate link and share it with potential customers</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>Customer Signs Up</h3>
                <p>When someone signs up using your link, they become your referral</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>Earn Commission</h3>
                <p>You earn 30% of their monthly subscription fee for as long as they remain a customer</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h3>Get Paid</h3>
                <p>Payouts are processed monthly, 15 days after the billing period ends</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .affiliate-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .affiliate-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .affiliate-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 1.2rem;
      color: #666;
      margin: 0;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .affiliate-code-section {
      margin-bottom: 3rem;
    }

    .code-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .code-card h2 {
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
    }

    .code-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .code {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 1.2rem;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .copy-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    .copy-btn:disabled {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.5);
    }

    .code-description {
      margin: 0;
      opacity: 0.9;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
    }

    .stat-icon {
      font-size: 2.5rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .stat-content h3 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .stat-content p {
      margin: 0.25rem 0 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .section {
      margin-bottom: 3rem;
    }

    .section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 1.5rem;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .referrals-table,
    .payouts-table {
      width: 100%;
      border-collapse: collapse;
    }

    .referrals-table th,
    .payouts-table th {
      background: #f8f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #495057;
      border-bottom: 1px solid #dee2e6;
    }

    .referrals-table td,
    .payouts-table td {
      padding: 1rem;
      border-bottom: 1px solid #f1f3f4;
    }

    .referral-row:hover,
    .payout-row:hover {
      background: #f8f9fa;
    }

    .customer-name {
      font-weight: 600;
      color: #1a1a1a;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-success {
      background: #d4edda;
      color: #155724;
    }

    .badge-warning {
      background: #fff3cd;
      color: #856404;
    }

    .badge-info {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-danger {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-secondary {
      background: #e2e3e5;
      color: #383d41;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: #1a1a1a;
    }

    .empty-state p {
      margin: 0;
      color: #666;
    }

    .how-it-works {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .step-number {
      width: 40px;
      height: 40px;
      background: #007bff;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }

    .step-content h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      color: #1a1a1a;
    }

    .step-content p {
      margin: 0;
      color: #666;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .affiliate-container {
        padding: 1rem;
      }

      .code-display {
        flex-direction: column;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .how-it-works {
        grid-template-columns: 1fr;
      }

      .table-container {
        overflow-x: auto;
      }
    }
  `]
})
export class AffiliateComponent implements OnInit, OnDestroy {
  private readonly affiliateService = inject(AffiliateService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  affiliateData: AffiliateDashboard | null = null;
  isLoading = true;
  copying = false;

  ngOnInit(): void {
    this.loadAffiliateData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAffiliateData(): void {
    console.log('🔍 AffiliateComponent: Loading affiliate data');
    this.isLoading = true;
    
    this.affiliateService.getAffiliateDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('✅ AffiliateComponent: Received affiliate data:', data);
          this.affiliateData = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ AffiliateComponent: Failed to load affiliate data:', error);
          this.toastService.error('Failed to load affiliate information');
          this.isLoading = false;
        }
      });
  }

  async copyAffiliateCode(): Promise<void> {
    if (!this.affiliateData?.code || this.copying) return;
    
    this.copying = true;
    
    try {
      const success = await this.affiliateService.copyAffiliateUrl(this.affiliateData.code);
      if (success) {
        this.toastService.success('Affiliate link copied to clipboard!');
      } else {
        this.toastService.error('Failed to copy affiliate link');
      }
    } catch (error) {
      this.toastService.error('Failed to copy affiliate link');
    }
    
    setTimeout(() => {
      this.copying = false;
    }, 2000);
  }

  formatCurrency(amount: number): string {
    return this.affiliateService.formatCurrency(amount);
  }

  getStatusBadgeClass(status: string): string {
    return this.affiliateService.getStatusBadgeClass(status);
  }

  getPayoutStatusBadgeClass(status: string): string {
    return this.affiliateService.getPayoutStatusBadgeClass(status);
  }
}
