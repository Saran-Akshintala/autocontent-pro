import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, takeUntil, switchMap, startWith } from 'rxjs';
import { ENVIRONMENT, Environment } from '../../core/tokens/environment.token';
import { ToastService } from '../../core/services/toast.service';
import { 
  BrandAnalyticsResponse, 
  AnalyticsTotals, 
  AnalyticsTimeseriesPoint, 
  TopPost 
} from '@autocontent-pro/types';

// Local interfaces for component
interface Brand {
  id: string;
  name: string;
}

interface BrandsResponse {
  brands: Brand[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h2>📈 Analytics</h2>
            <p>Track your content performance and engagement</p>
          </div>
          <div class="header-controls">
            <select class="brand-select" [(ngModel)]="selectedBrandId" (change)="onBrandChange()">
              <option value="">Select Brand</option>
              <option *ngFor="let brand of brands" [value]="brand.id">{{ brand.name }}</option>
            </select>
            <button class="btn btn-secondary" (click)="refreshAnalytics()" [disabled]="loading">
              {{ loading ? '🔄' : '↻' }} Refresh
            </button>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading analytics...</p>
      </div>

      <div class="no-brand-state" *ngIf="!selectedBrandId && !loading">
        <p>Please select a brand to view analytics</p>
      </div>

      <div class="analytics-content" *ngIf="selectedBrandId && !loading && analytics">
        <!-- KPI Cards -->
        <div class="analytics-overview">
          <div class="metric-card">
            <div class="metric-icon">👁️</div>
            <div class="metric-content">
              <div class="metric-value">{{ formatNumber(analytics.totals.totalImpressions) }}</div>
              <div class="metric-label">Total Impressions</div>
              <div class="metric-period">Last 30 days</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">❤️</div>
            <div class="metric-content">
              <div class="metric-value">{{ formatNumber(analytics.totals.totalEngagement) }}</div>
              <div class="metric-label">Total Engagement</div>
              <div class="metric-rate">{{ analytics.totals.avgEngagementRate.toFixed(1) }}% rate</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🖱️</div>
            <div class="metric-content">
              <div class="metric-value">{{ formatNumber(analytics.totals.totalClicks) }}</div>
              <div class="metric-label">Total Clicks</div>
              <div class="metric-rate">{{ analytics.totals.avgClickRate.toFixed(1) }}% rate</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📝</div>
            <div class="metric-content">
              <div class="metric-value">{{ analytics.totals.totalPosts }}</div>
              <div class="metric-label">Published Posts</div>
              <div class="metric-period">This period</div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <div class="chart-container">
            <div class="chart-header">
              <h3>📊 Performance Over Time</h3>
              <p>Daily impressions and engagement for the last 30 days</p>
            </div>
            <div class="chart-placeholder">
              <div class="simple-line-chart">
                <div class="chart-bars">
                  <div 
                    *ngFor="let point of analytics.timeseries; let i = index" 
                    class="chart-bar"
                    [style.height.%]="getBarHeight(point.impressions, getMaxImpressions())"
                    [title]="point.date + ': ' + point.impressions + ' impressions'">
                  </div>
                </div>
                <div class="chart-legend">
                  <span>📈 Impressions trend over 30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Platform Breakdown -->
        <div class="platform-section">
          <div class="section-header">
            <h3>📱 Platform Breakdown</h3>
            <p>Performance across different social media platforms</p>
          </div>
          <div class="platform-grid">
            <div 
              *ngFor="let platform of analytics.platformBreakdown" 
              class="platform-card">
              <div class="platform-header">
                <span class="platform-icon">{{ getPlatformIcon(platform.platform) }}</span>
                <span class="platform-name">{{ platform.platform }}</span>
              </div>
              <div class="platform-stats">
                <div class="stat">
                  <span class="stat-value">{{ formatNumber(platform.impressions) }}</span>
                  <span class="stat-label">Impressions</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ formatNumber(platform.engagement) }}</span>
                  <span class="stat-label">Engagement</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ platform.posts }}</span>
                  <span class="stat-label">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Posts -->
        <div class="top-posts-section">
          <div class="section-header">
            <h3>🏆 Top Performing Posts</h3>
            <p>Your best content based on engagement</p>
          </div>
          <div class="top-posts-list">
            <div 
              *ngFor="let post of analytics.topPosts; let i = index" 
              class="top-post-card">
              <div class="post-rank">#{{ i + 1 }}</div>
              <div class="post-content">
                <h4>{{ post.title }}</h4>
                <div class="post-platforms">
                  <span 
                    *ngFor="let platform of post.platforms" 
                    class="platform-tag">
                    {{ getPlatformIcon(platform) }} {{ platform }}
                  </span>
                </div>
                <div class="post-date">{{ formatDate(post.publishedAt) }}</div>
              </div>
              <div class="post-metrics">
                <div class="metric">
                  <span class="metric-value">{{ formatNumber(post.totalImpressions) }}</span>
                  <span class="metric-label">Impressions</span>
                </div>
                <div class="metric">
                  <span class="metric-value">{{ formatNumber(post.totalEngagement) }}</span>
                  <span class="metric-label">Engagement</span>
                </div>
                <div class="metric">
                  <span class="metric-value">{{ post.engagementRate.toFixed(1) }}%</span>
                  <span class="metric-label">Rate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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

    .header-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .brand-select {
      padding: 8px 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: white;
      font-size: 14px;
      min-width: 200px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .loading-state, .no-brand-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
      font-size: 16px;
    }

    .analytics-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .metric-icon {
      font-size: 32px;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .metric-content {
      flex: 1;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 4px;
    }

    .metric-period, .metric-rate {
      font-size: 12px;
      color: #28a745;
      font-weight: 600;
    }

    .charts-section {
      margin-bottom: 32px;
    }

    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .chart-header h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .chart-header p {
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #6c757d;
    }

    .simple-line-chart {
      height: 200px;
      display: flex;
      flex-direction: column;
    }

    .chart-bars {
      display: flex;
      align-items: end;
      height: 160px;
      gap: 2px;
      padding: 0 10px;
    }

    .chart-bar {
      flex: 1;
      background: linear-gradient(to top, #3498db, #5dade2);
      border-radius: 2px 2px 0 0;
      min-height: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chart-bar:hover {
      background: linear-gradient(to top, #2980b9, #3498db);
    }

    .chart-legend {
      text-align: center;
      padding: 16px 0 0 0;
      font-size: 14px;
      color: #6c757d;
    }

    .platform-section, .top-posts-section {
      margin-bottom: 32px;
    }

    .section-header h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .section-header p {
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #6c757d;
    }

    .platform-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .platform-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .platform-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .platform-icon {
      font-size: 24px;
    }

    .platform-name {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .platform-stats {
      display: flex;
      justify-content: space-between;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: #6c757d;
    }

    .top-posts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .top-post-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .post-rank {
      font-size: 24px;
      font-weight: 700;
      color: #f39c12;
      min-width: 40px;
    }

    .post-content {
      flex: 1;
    }

    .post-content h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .post-platforms {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .platform-tag {
      background: #e9ecef;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #495057;
    }

    .post-date {
      font-size: 12px;
      color: #6c757d;
    }

    .post-metrics {
      display: flex;
      gap: 24px;
    }

    .post-metrics .metric {
      text-align: center;
    }

    .post-metrics .metric-value {
      display: block;
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .post-metrics .metric-label {
      font-size: 12px;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .analytics-overview {
        grid-template-columns: 1fr;
      }

      .platform-grid {
        grid-template-columns: 1fr;
      }

      .top-post-card {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .post-metrics {
        justify-content: center;
      }
    }
  `]
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private env = inject(ENVIRONMENT);
  private destroy$ = new Subject<void>();

  brands: Brand[] = [];
  selectedBrandId: string = '';
  analytics: BrandAnalyticsResponse | null = null;
  loading = false;

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBrands();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBrands(): void {
    this.http.get<BrandsResponse>(`${this.env.apiBaseUrl}/brands`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.brands = response.brands;
          if (this.brands.length > 0) {
            this.selectedBrandId = this.brands[0].id;
            this.loadAnalytics();
          } else {
            this.toastService.error('No brands found', 'Please create a brand first.');
          }
        },
        error: (error) => {
          console.error('Failed to load brands:', error);
          if (error.status === 401) {
            this.toastService.error('Authentication required', 'Please log in to view analytics.');
          } else {
            this.toastService.error('Failed to load brands', 'Please try again.');
          }
        }
      });
  }

  onBrandChange(): void {
    if (this.selectedBrandId) {
      this.loadAnalytics();
    }
  }

  loadAnalytics(): void {
    if (!this.selectedBrandId) return;

    this.loading = true;
    this.http.get<{ success: boolean; data: BrandAnalyticsResponse }>(`${this.env.apiBaseUrl}/analytics/brand/${this.selectedBrandId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.analytics = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load analytics:', error);
          this.loading = false;
          if (error.status === 401) {
            this.toastService.error('Authentication required', 'Please log in to view analytics.');
          } else if (error.status === 404) {
            this.toastService.error('Brand not found', 'Please select a valid brand.');
          } else {
            this.toastService.error('Failed to load analytics', `Error: ${error.message || 'Please try again.'}`);
          }
        }
      });
  }

  refreshAnalytics(): void {
    if (!this.selectedBrandId) return;

    this.loading = true;
    // Trigger analytics generation (without queue)
    this.http.post(`${this.env.apiBaseUrl}/analytics/brand/${this.selectedBrandId}/generate`, {})
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          // Wait a moment then reload analytics
          return new Promise(resolve => setTimeout(resolve, 1000));
        }),
        switchMap(() => this.http.get<{ success: boolean; data: BrandAnalyticsResponse }>(`${this.env.apiBaseUrl}/analytics/brand/${this.selectedBrandId}`))
      )
      .subscribe({
        next: (response) => {
          this.analytics = response.data;
          this.loading = false;
          this.toastService.success('Analytics refreshed', 'Latest data has been loaded.');
        },
        error: (error) => {
          console.error('Failed to refresh analytics:', error);
          this.loading = false;
          this.toastService.error('Failed to refresh analytics', 'Please try again.');
        }
      });
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      'FACEBOOK': '📘',
      'INSTAGRAM': '📷',
      'LINKEDIN': '💼',
      'TWITTER': '🐦',
      'TIKTOK': '🎵',
      'YT_SHORTS': '📺'
    };
    return icons[platform.toUpperCase()] || '📱';
  }

  getMaxImpressions(): number {
    if (!this.analytics?.timeseries) return 1;
    return Math.max(...this.analytics.timeseries.map(p => p.impressions));
  }

  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.max((value / max) * 100, 2); // Minimum 2% height for visibility
  }
}
