import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';
import { ENVIRONMENT, Environment } from '../tokens/environment.token';
// Local type definitions to avoid import issues
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AffiliateService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  private affiliateDataSubject = new BehaviorSubject<AffiliateDashboard | null>(null);
  public affiliateData$ = this.affiliateDataSubject.asObservable();

  /**
   * Get or create affiliate code for current user
   */
  getAffiliateCode(): Observable<string> {
    console.log('🔍 AffiliateService: Getting affiliate code');
    
    return this.http.get<ApiResponse<{ code: string }>>(`${this.env.apiBaseUrl}/affiliate/code`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            console.log('✅ Affiliate code received:', response.data.code);
            return response.data.code;
          }
          throw new Error(response.message || 'Failed to get affiliate code');
        }),
        catchError(error => {
          console.error('❌ Failed to get affiliate code:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get affiliate dashboard statistics
   */
  getAffiliateStats(): Observable<AffiliateStats> {
    console.log('🔍 AffiliateService: Getting affiliate stats');
    
    return this.http.get<ApiResponse<AffiliateStats>>(`${this.env.apiBaseUrl}/affiliate/stats`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            console.log('✅ Affiliate stats received:', response.data);
            return response.data;
          }
          throw new Error(response.message || 'Failed to get affiliate stats');
        }),
        catchError(error => {
          console.error('❌ Failed to get affiliate stats:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get detailed referral information
   */
  getReferrals(): Observable<ReferralInfo[]> {
    console.log('🔍 AffiliateService: Getting referrals');
    
    return this.http.get<ApiResponse<ReferralInfo[]>>(`${this.env.apiBaseUrl}/affiliate/referrals`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            console.log('✅ Referrals received:', response.data);
            return response.data;
          }
          throw new Error(response.message || 'Failed to get referrals');
        }),
        catchError(error => {
          console.error('❌ Failed to get referrals:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get payout history
   */
  getPayouts(): Observable<PayoutInfo[]> {
    console.log('🔍 AffiliateService: Getting payouts');
    
    return this.http.get<ApiResponse<PayoutInfo[]>>(`${this.env.apiBaseUrl}/affiliate/payouts`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            console.log('✅ Payouts received:', response.data);
            return response.data;
          }
          throw new Error(response.message || 'Failed to get payouts');
        }),
        catchError(error => {
          console.error('❌ Failed to get payouts:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get complete affiliate dashboard data
   */
  getAffiliateDashboard(): Observable<AffiliateDashboard> {
    console.log('🔍 AffiliateService: Loading complete affiliate dashboard');
    
    // For now, return mock data to get the UI working
    const mockDashboard: AffiliateDashboard = {
      code: 'DEMO2024',
      stats: {
        totalReferrals: 5,
        activeReferrals: 3,
        pendingReferrals: 2,
        totalEarnings: 247.50,
        pendingPayouts: 87.00,
        thisMonthEarnings: 87.00
      },
      referrals: [
        {
          id: '1',
          tenantName: 'TechCorp Solutions',
          status: 'ACTIVE',
          signupDate: new Date('2024-08-15'),
          activatedAt: new Date('2024-08-20'),
          monthlyRevenue: 79,
          totalCommissions: 142.20
        },
        {
          id: '2',
          tenantName: 'Marketing Pro Agency',
          status: 'ACTIVE',
          signupDate: new Date('2024-09-01'),
          activatedAt: new Date('2024-09-05'),
          monthlyRevenue: 29,
          totalCommissions: 17.40
        },
        {
          id: '3',
          tenantName: 'Creative Studio LLC',
          status: 'PENDING',
          signupDate: new Date('2024-09-20'),
          monthlyRevenue: 0,
          totalCommissions: 0
        }
      ],
      payouts: [
        {
          id: '1',
          amount: 87.00,
          currency: 'USD',
          period: '2024-09',
          status: 'PENDING',
          dueDate: new Date('2024-10-15'),
          tenantName: 'TechCorp Solutions'
        },
        {
          id: '2',
          amount: 160.50,
          currency: 'USD',
          period: '2024-08',
          status: 'PAID',
          dueDate: new Date('2024-09-15'),
          paidAt: new Date('2024-09-15'),
          tenantName: 'TechCorp Solutions'
        }
      ]
    };
    
    this.affiliateDataSubject.next(mockDashboard);
    return new Observable(subscriber => {
      subscriber.next(mockDashboard);
      subscriber.complete();
    });
  }

  /**
   * Record a referral (used during signup)
   */
  recordReferral(affiliateCode: string, tenantId: string): Observable<void> {
    console.log('📈 Recording referral:', { affiliateCode, tenantId });
    
    return this.http.post<ApiResponse<void>>(`${this.env.apiBaseUrl}/affiliate/referral`, {
      affiliateCode,
      tenantId
    }).pipe(
      map(response => {
        if (response.success) {
          console.log('✅ Referral recorded successfully');
          return;
        }
        throw new Error(response.message || 'Failed to record referral');
      }),
      catchError(error => {
        console.error('❌ Failed to record referral:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate affiliate URL for sharing
   */
  generateAffiliateUrl(code: string, baseUrl: string = window.location.origin): string {
    const url = new URL('/signup', baseUrl);
    url.searchParams.set('ref', code);
    return url.toString();
  }

  /**
   * Copy affiliate URL to clipboard
   */
  async copyAffiliateUrl(code: string): Promise<boolean> {
    try {
      const url = this.generateAffiliateUrl(code);
      await navigator.clipboard.writeText(url);
      console.log('✅ Affiliate URL copied to clipboard:', url);
      return true;
    } catch (error) {
      console.error('❌ Failed to copy affiliate URL:', error);
      return false;
    }
  }

  /**
   * Get referral code from URL parameters
   */
  getReferralCodeFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      console.log('🔗 Referral code found in URL:', refCode);
      // Store in localStorage for signup process
      localStorage.setItem('referralCode', refCode);
    }
    
    return refCode;
  }

  /**
   * Get stored referral code from localStorage
   */
  getStoredReferralCode(): string | null {
    return localStorage.getItem('referralCode');
  }

  /**
   * Clear stored referral code
   */
  clearStoredReferralCode(): void {
    localStorage.removeItem('referralCode');
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Get status badge class for referral status
   */
  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'inactive':
        return 'badge-secondary';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Get status badge class for payout status
   */
  getPayoutStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'processing':
        return 'badge-info';
      case 'failed':
        return 'badge-danger';
      case 'cancelled':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  }
}
