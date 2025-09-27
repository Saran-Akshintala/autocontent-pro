import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';
import { ENVIRONMENT, Environment } from '../tokens/environment.token';
import { 
  BillingSummary, 
  UsageSummary, 
  UsagePercentages, 
  UpsellInfo, 
  PlanLimits,
  ApiResponse 
} from '@autocontent-pro/types';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  private billingSummarySubject = new BehaviorSubject<BillingSummary | null>(null);
  public billingSummary$ = this.billingSummarySubject.asObservable();

  private usagePercentagesSubject = new BehaviorSubject<UsagePercentages | null>(null);
  public usagePercentages$ = this.usagePercentagesSubject.asObservable();

  /**
   * Get comprehensive billing summary
   */
  getBillingSummary(): Observable<BillingSummary> {
    console.log('🔍 BillingService: Starting getBillingSummary request');
    console.log('🔍 API URL:', `${this.env.apiBaseUrl}/billing/summary`);
    
    return this.http.get<ApiResponse<BillingSummary>>(`${this.env.apiBaseUrl}/billing/summary`)
      .pipe(
        tap(response => {
          console.log('📡 Raw API Response:', response);
          if (response.success && response.data) {
            this.billingSummarySubject.next(response.data);
            console.log('✅ Billing summary updated in subject');
          }
        }),
        map((response: ApiResponse<BillingSummary>) => {
          console.log('🔄 Mapping response:', response);
          if (response.success && response.data) {
            console.log('✅ Returning billing data:', response.data);
            return response.data;
          }
          console.error('❌ API response invalid:', response);
          throw new Error(response.message || 'Failed to fetch billing summary');
        }),
        catchError(error => {
          console.error('❌ Failed to fetch billing summary:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Get usage summary and percentages
   */
  getUsage(): Observable<{ usage: UsageSummary; percentages: UsagePercentages }> {
    return this.http.get<ApiResponse<{ usage: UsageSummary; percentages: UsagePercentages }>>(`${this.env.apiBaseUrl}/billing/usage`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.usagePercentagesSubject.next(response.data.percentages);
          }
        }),
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch usage');
        }),
        catchError(error => {
          console.error('Failed to fetch usage:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all available plans
   */
  getPlans(): Observable<Record<string, PlanLimits>> {
    return this.http.get<ApiResponse<Record<string, PlanLimits>>>(`${this.env.apiBaseUrl}/billing/plans`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch plans');
        }),
        catchError(error => {
          console.error('Failed to fetch plans:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if should show upsell notifications
   */
  getUpsellStatus(): Observable<UpsellInfo> {
    return this.http.get<ApiResponse<UpsellInfo>>(`${this.env.apiBaseUrl}/billing/upsell`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch upsell status');
        }),
        catchError(error => {
          console.error('Failed to fetch upsell status:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if a feature can be used
   */
  checkUsage(featureType: 'POST_GENERATION' | 'IMAGE_GENERATION' | 'BRAND_CREATION', amount: number = 1): Observable<{
    allowed: boolean;
    reason?: string;
    usage?: UsageSummary;
  }> {
    return this.http.post<ApiResponse<{
      allowed: boolean;
      reason?: string;
      usage?: UsageSummary;
    }>>(`${this.env.apiBaseUrl}/billing/check-usage`, { featureType, amount })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to check usage');
        }),
        catchError(error => {
          console.error('Failed to check usage:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get upgrade URL for a specific plan
   */
  getUpgradeUrl(plan: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): Observable<{
    upgradeUrl: string;
    plan: string;
    billingCycle: string;
  }> {
    return this.http.post<ApiResponse<{
      upgradeUrl: string;
      plan: string;
      billingCycle: string;
    }>>(`${this.env.apiBaseUrl}/billing/upgrade-url`, { plan, billingCycle })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get upgrade URL');
        }),
        catchError(error => {
          console.error('Failed to get upgrade URL:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get billing portal URL
   */
  getBillingPortalUrl(): Observable<{ portalUrl: string }> {
    return this.http.get<ApiResponse<{ portalUrl: string }>>(`${this.env.apiBaseUrl}/billing/portal-url`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get billing portal URL');
        }),
        catchError(error => {
          console.error('Failed to get billing portal URL:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Refresh billing data
   */
  refreshBillingData(): void {
    this.getBillingSummary().subscribe();
    this.getUsage().subscribe();
  }

  /**
   * Get current usage percentages (from cache)
   */
  getCurrentUsagePercentages(): UsagePercentages | null {
    return this.usagePercentagesSubject.value;
  }

  /**
   * Get current billing summary (from cache)
   */
  getCurrentBillingSummary(): BillingSummary | null {
    return this.billingSummarySubject.value;
  }

  /**
   * Helper method to get usage color based on percentage
   */
  getUsageColor(percentage: number): string {
    if (percentage >= 90) return '#ef4444'; // red-500
    if (percentage >= 75) return '#f59e0b'; // amber-500
    if (percentage >= 50) return '#3b82f6'; // blue-500
    return '#10b981'; // emerald-500
  }

  /**
   * Helper method to get usage status text
   */
  getUsageStatus(percentage: number): string {
    if (percentage >= 90) return 'Critical';
    if (percentage >= 75) return 'High';
    if (percentage >= 50) return 'Moderate';
    return 'Good';
  }

  /**
   * Helper method to format plan price
   */
  formatPrice(price: number): string {
    return `$${price}/month`;
  }

  /**
   * Helper method to get plan badge color
   */
  getPlanBadgeColor(plan: string): string {
    switch (plan) {
      case 'STARTER': return 'bg-blue-100 text-blue-800';
      case 'GROWTH': return 'bg-purple-100 text-purple-800';
      case 'AGENCY': return 'bg-gold-100 text-gold-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
