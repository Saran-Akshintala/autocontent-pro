import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="welcome-section">
        <h2>Welcome back, {{ getUserName() }}! 👋</h2>
        <p class="welcome-subtitle">Here's what's happening with your content today.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <h3>24</h3>
            <p>Posts This Month</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-content">
            <h3>8</h3>
            <p>Scheduled Posts</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>3</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <h3>12.5K</h3>
            <p>Total Engagement</p>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <div class="card">
          <div class="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div class="card-content">
            <div class="activity-item">
              <div class="activity-icon">📝</div>
              <div class="activity-content">
                <p><strong>New post created:</strong> "Summer Campaign Launch"</p>
                <span class="activity-time">2 hours ago</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon">✅</div>
              <div class="activity-content">
                <p><strong>Post approved:</strong> "Product Showcase Video"</p>
                <span class="activity-time">4 hours ago</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon">📊</div>
              <div class="activity-content">
                <p><strong>Analytics updated:</strong> Weekly performance report</p>
                <span class="activity-time">1 day ago</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Upcoming Schedule</h3>
          </div>
          <div class="card-content">
            <div class="schedule-item">
              <div class="schedule-time">
                <span class="time">2:00 PM</span>
                <span class="date">Today</span>
              </div>
              <div class="schedule-content">
                <p><strong>Instagram Post:</strong> Product Feature Highlight</p>
                <span class="platform">📷 Instagram</span>
              </div>
            </div>
            <div class="schedule-item">
              <div class="schedule-time">
                <span class="time">9:00 AM</span>
                <span class="date">Tomorrow</span>
              </div>
              <div class="schedule-content">
                <p><strong>LinkedIn Article:</strong> Industry Insights</p>
                <span class="platform">💼 LinkedIn</span>
              </div>
            </div>
            <div class="schedule-item">
              <div class="schedule-time">
                <span class="time">3:30 PM</span>
                <span class="date">Dec 22</span>
              </div>
              <div class="schedule-content">
                <p><strong>Twitter Thread:</strong> Year-end Recap</p>
                <span class="platform">🐦 Twitter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      margin-bottom: 32px;
    }

    .welcome-section h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }

    .welcome-subtitle {
      margin: 0;
      font-size: 16px;
      color: #6c757d;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: transform 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-icon {
      font-size: 32px;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .stat-content h3 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-content p {
      margin: 0;
      font-size: 14px;
      color: #6c757d;
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e9ecef;
    }

    .card-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .card-content {
      padding: 24px;
    }

    .activity-item, .schedule-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .activity-item:last-child, .schedule-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .activity-item:first-child, .schedule-item:first-child {
      padding-top: 0;
    }

    .activity-icon {
      font-size: 20px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .activity-content {
      flex: 1;
    }

    .activity-content p {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .activity-time {
      font-size: 12px;
      color: #6c757d;
    }

    .schedule-time {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
      text-align: center;
    }

    .schedule-time .time {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .schedule-time .date {
      font-size: 12px;
      color: #6c757d;
    }

    .schedule-content {
      flex: 1;
    }

    .schedule-content p {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .platform {
      font-size: 12px;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Load user profile to ensure we have latest data
    this.authService.getCurrentUser().subscribe();
  }

  getUserName(): string {
    const user = this.authService.currentUser;
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email.split('@')[0] || 'User';
  }
}
