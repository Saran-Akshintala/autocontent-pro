import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <h2>📈 Analytics</h2>
        <p>Track your content performance and engagement</p>
      </div>

      <div class="analytics-overview">
        <div class="metric-card">
          <div class="metric-icon">👁️</div>
          <div class="metric-content">
            <div class="metric-value">125.4K</div>
            <div class="metric-label">Total Impressions</div>
            <div class="metric-change positive">+12.5%</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">❤️</div>
          <div class="metric-content">
            <div class="metric-value">8.2K</div>
            <div class="metric-label">Engagement</div>
            <div class="metric-change positive">+8.3%</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🔄</div>
          <div class="metric-content">
            <div class="metric-value">2.1K</div>
            <div class="metric-label">Shares</div>
            <div class="metric-change negative">-2.1%</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">👥</div>
          <div class="metric-content">
            <div class="metric-value">1.8K</div>
            <div class="metric-label">New Followers</div>
            <div class="metric-change positive">+15.7%</div>
          </div>
        </div>
      </div>

      <div class="analytics-content">
        <div class="chart-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3>Engagement Over Time</h3>
              <div class="chart-controls">
                <select class="time-selector">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>
            </div>
            <div class="chart-placeholder">
              <div class="chart-mock">
                <div class="chart-bars">
                  <div class="bar" style="height: 60%"></div>
                  <div class="bar" style="height: 80%"></div>
                  <div class="bar" style="height: 45%"></div>
                  <div class="bar" style="height: 90%"></div>
                  <div class="bar" style="height: 70%"></div>
                  <div class="bar" style="height: 85%"></div>
                  <div class="bar" style="height: 95%"></div>
                </div>
                <div class="chart-labels">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="platform-breakdown">
          <div class="breakdown-card">
            <h3>Platform Performance</h3>
            <div class="platform-list">
              <div class="platform-item">
                <div class="platform-info">
                  <span class="platform-icon">📷</span>
                  <span class="platform-name">Instagram</span>
                </div>
                <div class="platform-metrics">
                  <span class="metric">45.2K impressions</span>
                  <span class="engagement-rate positive">6.8% engagement</span>
                </div>
              </div>

              <div class="platform-item">
                <div class="platform-info">
                  <span class="platform-icon">💼</span>
                  <span class="platform-name">LinkedIn</span>
                </div>
                <div class="platform-metrics">
                  <span class="metric">32.1K impressions</span>
                  <span class="engagement-rate positive">4.2% engagement</span>
                </div>
              </div>

              <div class="platform-item">
                <div class="platform-info">
                  <span class="platform-icon">🐦</span>
                  <span class="platform-name">Twitter</span>
                </div>
                <div class="platform-metrics">
                  <span class="metric">28.7K impressions</span>
                  <span class="engagement-rate neutral">3.1% engagement</span>
                </div>
              </div>

              <div class="platform-item">
                <div class="platform-info">
                  <span class="platform-icon">📘</span>
                  <span class="platform-name">Facebook</span>
                </div>
                <div class="platform-metrics">
                  <span class="metric">19.4K impressions</span>
                  <span class="engagement-rate negative">2.8% engagement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="top-posts">
        <h3>Top Performing Posts</h3>
        <div class="posts-list">
          <div class="post-performance">
            <div class="post-info">
              <h4>Summer Product Launch</h4>
              <span class="post-platform">📷 Instagram • 3 days ago</span>
            </div>
            <div class="post-metrics">
              <span class="metric">12.5K views</span>
              <span class="metric">890 likes</span>
              <span class="metric">67 comments</span>
            </div>
          </div>

          <div class="post-performance">
            <div class="post-info">
              <h4>Industry Insights Article</h4>
              <span class="post-platform">💼 LinkedIn • 5 days ago</span>
            </div>
            <div class="post-metrics">
              <span class="metric">8.2K views</span>
              <span class="metric">245 likes</span>
              <span class="metric">89 comments</span>
            </div>
          </div>

          <div class="post-performance">
            <div class="post-info">
              <h4>Weekly Tips Thread</h4>
              <span class="post-platform">🐦 Twitter • 1 week ago</span>
            </div>
            <div class="post-metrics">
              <span class="metric">6.7K views</span>
              <span class="metric">156 likes</span>
              <span class="metric">34 retweets</span>
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

    .analytics-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
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
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 4px;
    }

    .metric-change {
      font-size: 12px;
      font-weight: 600;
    }

    .metric-change.positive {
      color: #27ae60;
    }

    .metric-change.negative {
      color: #e74c3c;
    }

    .analytics-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }

    .chart-card, .breakdown-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #f8f9fa;
    }

    .chart-header h3, .breakdown-card h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .breakdown-card h3 {
      padding: 20px 24px;
      margin: 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .time-selector {
      padding: 6px 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 14px;
    }

    .chart-placeholder {
      padding: 40px 24px;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-mock {
      width: 100%;
      max-width: 400px;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 200px;
      margin-bottom: 16px;
      gap: 8px;
    }

    .bar {
      flex: 1;
      background: linear-gradient(to top, #3498db, #5dade2);
      border-radius: 4px 4px 0 0;
      min-height: 20px;
    }

    .chart-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6c757d;
    }

    .platform-list {
      padding: 24px;
    }

    .platform-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .platform-item:last-child {
      border-bottom: none;
    }

    .platform-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .platform-icon {
      font-size: 20px;
    }

    .platform-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .platform-metrics {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .metric {
      font-size: 14px;
      color: #6c757d;
    }

    .engagement-rate {
      font-size: 12px;
      font-weight: 600;
    }

    .engagement-rate.positive {
      color: #27ae60;
    }

    .engagement-rate.neutral {
      color: #f39c12;
    }

    .engagement-rate.negative {
      color: #e74c3c;
    }

    .top-posts {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .top-posts h3 {
      margin: 0;
      padding: 20px 24px;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #f8f9fa;
    }

    .posts-list {
      padding: 24px;
    }

    .post-performance {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .post-performance:last-child {
      border-bottom: none;
    }

    .post-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .post-platform {
      font-size: 14px;
      color: #6c757d;
    }

    .post-metrics {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .analytics-overview {
        grid-template-columns: 1fr;
      }

      .analytics-content {
        grid-template-columns: 1fr;
      }

      .post-performance {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .post-metrics {
        justify-content: space-between;
      }
    }
  `]
})
export class AnalyticsComponent {}
