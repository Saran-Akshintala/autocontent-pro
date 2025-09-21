import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="approvals-page">
      <div class="page-header">
        <h2>✅ Approvals</h2>
        <p>Review and approve content before publishing</p>
      </div>

      <div class="approval-stats">
        <div class="stat-card">
          <div class="stat-number">3</div>
          <div class="stat-label">Pending Approval</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">12</div>
          <div class="stat-label">Approved Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">1</div>
          <div class="stat-label">Needs Revision</div>
        </div>
      </div>

      <div class="approval-queue">
        <div class="approval-item">
          <div class="approval-content">
            <div class="approval-header">
              <h4>Holiday Campaign Post</h4>
              <div class="approval-meta">
                <span class="platform">📘 Facebook</span>
                <span class="submitted-by">Submitted by Sarah Johnson</span>
                <span class="submitted-time">2 hours ago</span>
              </div>
            </div>
            <div class="approval-preview">
              <p>🎄 Celebrate the holidays with our special offers! Limited time deals on all products. Don't miss out on these amazing discounts...</p>
            </div>
            <div class="approval-actions">
              <button class="btn btn-success">✅ Approve</button>
              <button class="btn btn-warning">📝 Request Changes</button>
              <button class="btn btn-danger">❌ Reject</button>
              <button class="btn btn-outline">👁️ Preview</button>
            </div>
          </div>
        </div>

        <div class="approval-item">
          <div class="approval-content">
            <div class="approval-header">
              <h4>Product Feature Highlight</h4>
              <div class="approval-meta">
                <span class="platform">📷 Instagram</span>
                <span class="submitted-by">Submitted by Mike Chen</span>
                <span class="submitted-time">4 hours ago</span>
              </div>
            </div>
            <div class="approval-preview">
              <p>✨ Introducing our latest innovation! This game-changing feature will revolutionize how you work. Swipe to see more details...</p>
            </div>
            <div class="approval-actions">
              <button class="btn btn-success">✅ Approve</button>
              <button class="btn btn-warning">📝 Request Changes</button>
              <button class="btn btn-danger">❌ Reject</button>
              <button class="btn btn-outline">👁️ Preview</button>
            </div>
          </div>
        </div>

        <div class="approval-item">
          <div class="approval-content">
            <div class="approval-header">
              <h4>Industry Insights Article</h4>
              <div class="approval-meta">
                <span class="platform">💼 LinkedIn</span>
                <span class="submitted-by">Submitted by Alex Rivera</span>
                <span class="submitted-time">1 day ago</span>
              </div>
            </div>
            <div class="approval-preview">
              <p>📊 The future of digital marketing: 5 trends that will shape 2024. Based on our latest research and industry analysis...</p>
            </div>
            <div class="approval-actions">
              <button class="btn btn-success">✅ Approve</button>
              <button class="btn btn-warning">📝 Request Changes</button>
              <button class="btn btn-danger">❌ Reject</button>
              <button class="btn btn-outline">👁️ Preview</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approvals-page {
      max-width: 1000px;
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

    .approval-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #3498db;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: #6c757d;
      font-weight: 500;
    }

    .approval-queue {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .approval-item {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .approval-content {
      padding: 24px;
    }

    .approval-header {
      margin-bottom: 16px;
    }

    .approval-header h4 {
      margin: 0 0 12px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .approval-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #6c757d;
    }

    .platform {
      font-weight: 500;
    }

    .approval-preview {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .approval-preview p {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: #495057;
    }

    .approval-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-success {
      background: #27ae60;
      color: white;
    }

    .btn-success:hover {
      background: #229954;
    }

    .btn-warning {
      background: #f39c12;
      color: white;
    }

    .btn-warning:hover {
      background: #e67e22;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
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
      .approval-stats {
        grid-template-columns: 1fr;
      }

      .approval-meta {
        flex-direction: column;
        gap: 8px;
      }

      .approval-actions {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }
    }
  `]
})
export class ApprovalsComponent {}
